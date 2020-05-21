import uuid

from flask import json, request, abort

from api import MUTVIZ_CONF, app, logger, parse_input_regions, db, DEBUG_MODE, repositories_dict, \
    trinucleotides_dict, tumor_type_dict, executor, mutation_code_r_dict, RESULTS_CACHE
from api.db import *
from api.jobs import register_job, update_job, unregister_job
from api.model.models import *

from api.spark.intersection import spark_intersect

def get_uc5(logger):
    repoId = request.form.get('file_name')
    logger.debug(f"repoId: {repoId}")

    trinucleotide = request.form.get('trinucleotide') == "true"

    tumorType = request.form.get('tumorType')
    logger.debug(f"tumorType: {tumorType}")

    if not repoId:
        abort(400)

    CACHE_ID = "DONORS#" + repoId + "#" + str(tumorType) + "#" +str(trinucleotide)

    jobID = register_job()

    def async_function():
        try:
            if CACHE_ID in RESULTS_CACHE:
                update_job(jobID, RESULTS_CACHE[CACHE_ID])
                return

            session = db.session
            session.execute("set enable_seqscan=false")

            file_id = db.session.query(UserFile).filter_by(name=repoId).one().id

            if trinucleotide:
                exists = db.session.query(db.session.query(DonorsTriCache).filter_by(file_id=file_id).exists()).scalar()
            else:
                exists = db.session.query(db.session.query(DonorsCache).filter_by(file_id=file_id).exists()).scalar()

            if exists:
                logger.debug("Cached result found.")
                if trinucleotide:
                    mutations = db.session.query(DonorsTriCache.tumor_type_id, DonorsTriCache.trinucleotide_id, DonorsTriCache.donor_id, DonorsTriCache.count).filter_by(file_id=file_id)
                else:
                    mutations = db.session.query(DonorsCache.tumor_type_id, DonorsCache.mutation_id,  DonorsCache.donor_id, DonorsCache.count).filter_by(file_id=file_id)
            else:

                logger.debug("Computing.")

                if DEBUG_MODE:
                    mutations = spark_intersect(t_mutation_trinucleotide_test.name, "full_"+repoId , DB_CONF, lambda r: [r["tumor_type_id"],r["mutation_code_id"], r["donor_id"], r["count"]], groupby=["tumor_type_id", "mutation_code_id", "donor_id"])
                else:

                    if trinucleotide:
                        mutations = spark_intersect(t_mutation_trinucleotide.name,
                                                    "full_" + repoId, DB_CONF,
                                                    lambda r: [r["tumor_type_id"], r["trinucleotide_id_r"], r["donor_id"],
                                                               r["count"]],
                                                    groupby=["tumor_type_id", "trinucleotide_id_r", "donor_id"])

                        values = list(map(lambda m: DonorsTriCache(file_id=file_id, tumor_type_id=m[0], trinucleotide_id=m[1], donor_id=m[2], count=m[3]), mutations))
                    else:
                        mutations = spark_intersect(t_mutation_trinucleotide.name,
                                                    "full_" + repoId, DB_CONF,
                                                    lambda r: [r["tumor_type_id"], r["mutation_code_id"], r["donor_id"],
                                                               r["count"]],
                                                    groupby=["tumor_type_id", "mutation_code_id", "donor_id"])

                        values = list(map(lambda m:  DonorsCache(file_id=file_id, tumor_type_id=m[0], mutation_id=m[1], donor_id=m[2], count=m[3]), mutations))
                    session.add_all(values)
                    session.commit()
                    session.close()


            result  = {}
            if trinucleotide:
                mutations = list(
                    map(lambda x: [tumor_type_dict[x[0]][0], trinucleotides_dict[x[1]][0], x[2], x[3]], mutations))


                for m in mutations:
                    if m[0] not in result:
                        result[m[0]] = {"data": [], "trinucleotide": trinucleotide}

                    result[m[0]]["data"].append({"mutation": m[1], "donor_id": m[2], "count": m[3]})


            else:
                mutations = list(
                    map(lambda x: [tumor_type_dict[x[0]][0], mutation_code_r_dict[x[1]], x[2], x[3]], mutations))

                for m in mutations:
                    if m[0] not in result:
                        result[m[0]] = {"data": [], "trinucleotide": trinucleotide}
                    result[m[0]]["data"].append({"mutation": m[1], "donor_id": m[2], "count": m[3]})

            RESULTS_CACHE[CACHE_ID] = result

            update_job(jobID, result)

        except Exception as e:
            unregister_job(jobID)
            logger.error("Async error", e)
            raise e

    executor.submit(async_function)

    return json.dumps(
        {"jobID": jobID}
    )