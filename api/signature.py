import uuid
from collections import defaultdict

from flask import json, request, abort

from api import MUTVIZ_CONF, app, logger, parse_input_regions, DEBUG_MODE, repositories_dict, \
    trinucleotides_dict, tumor_type_dict, executor, RESULTS_CACHE, tumor_type_reverse_dict
from api.clinical import get_donors
from api.db import *
from api.jobs import register_job, update_job, unregister_job
from api.model.models import *
from api.signatures.signatures_refitting import get_refitting

import pandas as pd

from api.spark.intersection import spark_intersect

def get_uc6(logger):
    repoId = request.form.get('file_name')
    logger.debug(f"repoId: {repoId}")

    threshold_active = request.form.get('threshold_active')=="true"
    threshold_min = int(request.form.get('threshold_min'))

    CACHE_ID = "SIGNATURES#"+repoId+"#"+str(threshold_active)

    logger.debug("Threshold active: "+str(threshold_active))
    logger.debug("Threshold min: "+str(threshold_min))

    tumorType = request.form.get('tumorType')
    logger.debug(f"tumorType: {tumorType}")

    filter =  request.form.get('filter')
    logger.debug(f"filter: {filter}")

    if tumorType and filter:
        tumor_type_id = str(tumor_type_reverse_dict[tumorType])
        donors = get_donors(tumorType, filter)
    else:
        tumor_type_id = None
        donors = None

    if not repoId:
        abort(400)

    jobID = register_job()

    def async_function():
        try:

            if not filter and CACHE_ID in RESULTS_CACHE:
                update_job(jobID, RESULTS_CACHE[CACHE_ID])
                return

            session = db.session

            file_id = db.session.query(UserFile).filter_by(name=repoId).one().id
            exists = db.session.query(db.session.query(SignaturesCache).filter_by(file_id=file_id).exists()).scalar()

            if  exists:
                logger.debug("Using cached result.")
                mutations = db.session.query( SignaturesCache.tumor_type_id, SignaturesCache.donor_id, SignaturesCache.trinucleotide_id_r, SignaturesCache.count).filter_by(file_id=file_id)
            else:

                if DEBUG_MODE:
                    print("t_mutation_trinucleotide_test.name ==> ",t_mutation_trinucleotide_test.name)
                    mutations = spark_intersect(t_mutation_trinucleotide_test.name, "full_"+repoId , DB_CONF, lambda r: [r["tumor_type_id"], r["donor_id"], r["trinucleotide_id_r"], r["count"]], groupby=["tumor_type_id",  "donor_id", "trinucleotide_id_r"])
                else:
                    mutations = spark_intersect(t_mutation_trinucleotide.name, "full_"+repoId , DB_CONF, lambda r: [r["tumor_type_id"], r["donor_id"], r["trinucleotide_id_r"], r["count"]], groupby=["tumor_type_id",  "donor_id", "trinucleotide_id_r"])

                    values = list(map(lambda m:  SignaturesCache(file_id=file_id, tumor_type_id=m[0], donor_id=m[1], trinucleotide_id_r=m[2], count=m[3]), mutations))
                    session.add_all(values)
                    session.commit()
                    session.close()


            result  = defaultdict(list)

            mutations = list(map(lambda x: [tumor_type_dict[x[0]][0],  x[1], trinucleotides_dict[x[2]][0], x[3]], mutations))

            for m in mutations:
                if filter and m[1] in donors or not filter:
                    result[m[0]].append([ m[1], m[2],  m[3]])

            # result ( tumorTypeString -> [donor, trinucleotide, count] )

            def toDataframe(data):

                columns_str = "A[C>A]A A[C>A]C	A[C>A]G	A[C>A]T	C[C>A]A	C[C>A]C	C[C>A]G	C[C>A]T	G[C>A]A	G[C>A]C	G[C>A]G	G[C>A]T	T[C>A]A	T[C>A]C	T[C>A]G	T[C>A]T	A[C>G]A	A[C>G]C	A[C>G]G	A[C>G]T	C[C>G]A	C[C>G]C	C[C>G]G	C[C>G]T	G[C>G]A	G[C>G]C	G[C>G]G	G[C>G]T	T[C>G]A	T[C>G]C	T[C>G]G	T[C>G]T	A[C>T]A	A[C>T]C	A[C>T]G	A[C>T]T	C[C>T]A	C[C>T]C	C[C>T]G	C[C>T]T	G[C>T]A	G[C>T]C	G[C>T]G	G[C>T]T	T[C>T]A	T[C>T]C	T[C>T]G	T[C>T]T	A[T>A]A	A[T>A]C	A[T>A]G	A[T>A]T	C[T>A]A	C[T>A]C	C[T>A]G	C[T>A]T	G[T>A]A	G[T>A]C	G[T>A]G	G[T>A]T	T[T>A]A	T[T>A]C	T[T>A]G	T[T>A]T	A[T>C]A	A[T>C]C	A[T>C]G	A[T>C]T	C[T>C]A	C[T>C]C	C[T>C]G	C[T>C]T	G[T>C]A	G[T>C]C	G[T>C]G	G[T>C]T	T[T>C]A	T[T>C]C	T[T>C]G	T[T>C]T	A[T>G]A	A[T>G]C	A[T>G]G	A[T>G]T	C[T>G]A	C[T>G]C	C[T>G]G	C[T>G]T	G[T>G]A	G[T>G]C	G[T>G]G	G[T>G]T	T[T>G]A	T[T>G]C	T[T>G]G	T[T>G]T"
                columns = columns_str.split()

                df = pd.DataFrame(data, columns=["donor_id", "trinucleotide_id_t", "count"])

                reshaped = df.pivot("donor_id", "trinucleotide_id_t", "count")

                for col in columns:
                    if col not in reshaped.columns:
                        reshaped[col] = 0

                result = reshaped.fillna(0)


                return result[columns]

            final_results = {}

            sigs_df_norm = None

            for tumor in result.keys():
                # columns: trin, index: patients
                table_donors = toDataframe(result[tumor])

                # FILTER IF THRESHOLD IS ACTIVE
                if threshold_active:
                    table_donors['counts'] = table_donors.sum(axis=1)
                    table_donors = table_donors[table_donors['counts']>=threshold_min].drop("counts", axis=1)

                num_patients = table_donors.shape[0]

                if num_patients == 0:
                    continue

                # if less than 5 patients
                if num_patients<5:
                    table_donors = table_donors.sum().to_frame().transpose()

                region_file_table_name = "full_"+repoId
                #user_file =  create_upload_table_full(session, region_file_table_name, create=False, upload=False)

                user_file_df = pd.read_sql("SELECT * FROM "+region_file_table_name+";", session.bind)
                user_file_df.columns = ["chrom", "start", "stop"]


                (with_donors, cacheit) =  get_refitting(table_donors, user_file_df, sigs_df_norm)
                sigs_df_norm = cacheit

                final_results[tumor] = {}
                final_results[tumor]["data"] = with_donors.to_dict(orient='list')
                final_results[tumor]["num_patients"] = num_patients
                final_results[tumor]["threshold_min"] = threshold_min
                final_results[tumor]["threshold_active"] = threshold_active

            if not filter:
                RESULTS_CACHE[CACHE_ID] = final_results

            update_job(jobID, final_results)

        except Exception as e:
            unregister_job(jobID)
            logger.error("Async error", e)
            raise e

    executor.submit(async_function)

    return json.dumps(
        {"jobID": jobID}
    )
