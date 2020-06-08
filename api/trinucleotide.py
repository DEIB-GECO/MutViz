from collections import defaultdict

import psycopg2
from flask import json, request, abort
from sqlalchemy import text

from api import DEBUG_MODE, repositories_dict, \
    trinucleotides_dict, tumor_type_dict, executor, RESULTS_CACHE, tumor_type_reverse_dict
from api.clinical import get_donors, get_query
from api.db import *
from api.jobs import register_job, update_job, unregister_job
from api.model.models import *

import pandas as pd

from api.spark.intersection import spark_intersect, spark_intersect2


def intersect_and_group(mutation_table_name, fileId, region_table_name, groupbylist, DB_CONF, tumor_type_id=None, filter_json=None, donors=None):

    connection = db.get_engine().connect()

    result = connection.execute(text("SELECT file_id FROM "+t_mutation_trinucleotide_cache.name+" WHERE file_id="+str(fileId)+" LIMIT 1;"))
    exists = result.rowcount==1

    print("Intersections Exist ==>",exists)

    if exists:
        print("reading from sql")
        query = "SELECT * FROM "+t_mutation_trinucleotide_cache.name
        if tumor_type_id or filter_json:
            query += " WHERE "
        if tumor_type_id:
            query += " tumor_type_id ="+tumor_type_id
        if tumor_type_id and filter_json:
            query += " AND"
        if filter_json:
            query += " donor_id IN ("+get_query(tumor_type_id, filter_json)+")"

        print(query)

        res_df = pd.read_sql_query(query, db.get_engine())
        print("finished reading from sql")
    else:
        cols  = t_mutation_trinucleotide_cache._columns.keys()
        res_df = spark_intersect2(mutation_table_name, region_table_name, DB_CONF)

        res_df["file_id"] = fileId
        res_df = res_df[cols]

        print("Intersections Found ==> ", res_df.shape[0])

        # CACHE IT
        def connect():
            c = psycopg2.connect(dbname=DB_CONF["postgres_db"], host=DB_CONF["postgres_host"], port=DB_CONF["postgres_port"], user=DB_CONF["postgres_user"], password=DB_CONF["postgres_pw"])
            return c
        import io

        f = io.StringIO()
        res_df.to_csv(f, index=False, header=False)  # removed header
        f.seek(0)  # move position to beginning of file before reading
        cursor = connect().cursor()
        cursor.copy_from(f, t_mutation_trinucleotide_cache.name, columns=tuple(cols), sep=',')
        cursor.execute('COMMIT;')
        cursor.close()

        # Filter
        if tumor_type_id and donors:
            res_df = res_df[(res_df["tumor_type_id"]==tumor_type_id) & (res_df["donor_id"].isin(donors))]
        else:
            if donors:
                res_df = res_df[res_df["donor_id"].isin(donors)]
            if tumor_type_id:
                res_df = res_df[res_df["tumor_type_id"]==tumor_type_id]

    # GroupBy and count
    res =  res_df.groupby(groupbylist)[groupbylist[-1]].agg('count').to_frame('count').reset_index()

    print(res.columns)
    print(res.head())

    return res.values




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

            if False and not filter and not DEBUG_MODE and exists:
                logger.debug("Found cached result.")
                mutations = db.session.query( TrinucleotideCache.tumor_type_id, TrinucleotideCache.trinucleotide_id, TrinucleotideCache.count).filter_by(file_id=repositories_dict[repoId][0])
                logger.debug("Retrieved result.")
            else:
                logger.debug("Computing result from scratch.")
                if DEBUG_MODE:
                    mutations = intersect_and_group(t_mutation_trinucleotide_test.name, file_id, "full_"+repoId,["tumor_type_id", "trinucleotide_id_r"],DB_CONF, donors=donors, filter_json=filter, tumor_type_id=tumor_type_id)
                    #mutations = spark_intersect(t_mutation_trinucleotide_test.name, "full_"+repoId , DB_CONF, lambda r: [r["tumor_type_id"],r["trinucleotide_id_r"], r["count"]],
                                               # groupby=["tumor_type_id", "trinucleotide_id_r"],
                                                #tumorType=tumor_type_id, filter=donors)
                else:
                    mutations = intersect_and_group(t_mutation_trinucleotide.name,  file_id, "full_" + repoId, ["tumor_type_id", "trinucleotide_id_r"], DB_CONF, filter_json=filter, tumor_type_id=tumor_type_id)
                    #mutations = spark_intersect(t_mutation_trinucleotide.name, "full_"+repoId , DB_CONF, lambda r: [r["tumor_type_id"],r["trinucleotide_id_r"], r["count"]],
                                               # groupby=["tumor_type_id", "trinucleotide_id_r"],
                                               # tumorType=tumor_type_id, filter=donors)


                   # values = list(map(lambda m:  TrinucleotideCache(file_id=file_id, tumor_type_id=m[0], trinucleotide_id=m[1], count=m[2]), mutations))
                    #if not filter:
                    #    session.add_all(values)
                    #    session.commit()
                    #    session.close()



            result  = defaultdict(dict)
            mutations = list(map(lambda x: [tumor_type_dict[x[0]][0],  trinucleotides_dict[x[1]][0], x[2]], mutations))


            for m in mutations:
                result[m[0]][m[1]] = {"trinucleotide":m[1], "mutation":m[1][2:-2], "count" : int(m[2])}

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
