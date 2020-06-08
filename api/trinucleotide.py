from collections import defaultdict

from flask import json, request, abort

from api import DEBUG_MODE, repositories_dict, \
    trinucleotides_dict, tumor_type_dict, executor, RESULTS_CACHE, tumor_type_reverse_dict
from api.clinical import get_donors
from api.db import *
from api.jobs import register_job, update_job, unregister_job
from api.model.models import *

from api.spark.intersection import spark_intersect

def get_trinucleotide(logger):
    repoId = request.form.get('file_name')

    tumorType = request.form.get('tumorType')

    logger.debug(f"tumorType: {tumorType}")
    logger.debug(f"repoId: {repoId}")

    filter =  request.form.get('filter')
    logger.debug(f"filter: {filter}")

    if tumorType and filter:
        tumor_type_id=str(tumor_type_reverse_dict[tumorType])
        donors = get_donors(tumorType, filter)
    else:
        tumor_type_id = None
        donors = None


    if not repoId:
        abort(400)

    CACHE_ID = "TRINUCLEOTIDE#" + repoId + "#" + str(tumorType)

    jobID = register_job()

    def async_function():
        try:
            if not filter and CACHE_ID in RESULTS_CACHE:
                update_job(jobID, RESULTS_CACHE[CACHE_ID])
                return

            session = db.session
            session.execute("set enable_seqscan=false")

            file_id = db.session.query(UserFile).filter_by(name=repoId).one().id
            exists = db.session.query(db.session.query(TrinucleotideCache).filter_by(file_id=file_id).exists()).scalar()

            if not filter and exists:
                logger.debug("Found cached result.")
                mutations = db.session.query( TrinucleotideCache.tumor_type_id, TrinucleotideCache.trinucleotide_id, TrinucleotideCache.count).filter_by(file_id=repositories_dict[repoId][0])
                logger.debug("Retrieved result.")
            else:
                logger.debug("Computing result from scratch.")
                if DEBUG_MODE:
                    mutations = spark_intersect(t_mutation_trinucleotide_test.name, "full_"+repoId , DB_CONF, lambda r: [r["tumor_type_id"],r["trinucleotide_id_r"], r["count"]],
                                                groupby=["tumor_type_id", "trinucleotide_id_r"],
                                                tumorType=tumor_type_id, filter=donors)
                else:
                    mutations = spark_intersect(t_mutation_trinucleotide.name, "full_"+repoId , DB_CONF, lambda r: [r["tumor_type_id"],r["trinucleotide_id_r"], r["count"]],
                                                groupby=["tumor_type_id", "trinucleotide_id_r"],
                                                tumorType=tumor_type_id, filter=donors)


                    values = list(map(lambda m:  TrinucleotideCache(file_id=file_id, tumor_type_id=m[0], trinucleotide_id=m[1], count=m[2]), mutations))
                    if not filter:
                        session.add_all(values)
                        session.commit()
                        session.close()


            result  = defaultdict(dict)
            mutations = list(map(lambda x: [tumor_type_dict[x[0]][0],  trinucleotides_dict[x[1]][0], x[2]], mutations))

            for m in mutations:
                result[m[0]][m[1]] = {"trinucleotide":m[1], "mutation":m[1][2:-2], "count" : m[2]}


            if not filter and not tumorType:
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
