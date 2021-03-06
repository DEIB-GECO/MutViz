from collections import defaultdict

from flask import  json, request, abort
from sqlalchemy import func, between, text
import numpy as np
import psycopg2

from api import MUTVIZ_CONF, app, logger, parse_input_regions, repositories_dict, mutation_code_dict, \
    tumor_type_reverse_dict, executor, DB_CONF, RESULTS_CACHE
from api.jobs import register_job, update_job, unregister_job
from api.model.models import *
from api.jobs import update_job
from scipy.stats import chi2_contingency

from api.utils import create_upload_table
import pandas as pd

def get_test_distances(logger):
    a = request.form.get('a')
    b = request.form.get('b')
    c = request.form.get('c')
    d = request.form.get('d')

    logger.debug(f"a: {a}")
    logger.debug(f"b: {b}")
    logger.debug(f"c: {c}")
    logger.debug(f"d: {d}")

    if not a or not b or not c or not d:
        abort(400)

    a = float(a)
    b = float(b)
    c = float(c)
    d = float(d)

    observations =  np.array([[a,b],[c,d]])
    p = chi2_contingency(observations)[1]
    logger.debug("p-value "+str(p))
    return json.dumps(
        {"p": float(p)}
    )


def get_distances(logger):
    repoId = request.form.get('file_name')
    logger.debug(f"repoId: {repoId}")

    max_len =   db.session.query(UserFile).filter_by(name=repoId).one().max_length
    maxDistance = max(1000, min(5000, max_len))
    #logger.debug(f"maxDistance: {maxDistance}")

    print("max_distance: "+str(maxDistance))

    tumorType = request.form.get('tumorType')
    logger.debug(f"tumorType: {tumorType}")

    CACHE_ID = "DISTANCE#" + repoId + "#" + str(maxDistance) + "#" + str(tumorType)

    if not repoId:
        abort(400)

    jobID = register_job()

    def async_function():
        try:

            if CACHE_ID in RESULTS_CACHE:
                update_job(jobID, RESULTS_CACHE[CACHE_ID])
                return

            session = db.session
            session.execute("set enable_seqscan=false")

            file_id = db.session.query(UserFile).filter_by(name=repoId).one().id
            #exists = db.session.query(db.session.query(DistanceCache).filter_by(file_id=file_id).exists()).scalar()

            connection = db.get_engine().connect()
            result = connection.execute(text(
                "SELECT file_id FROM " + DistanceCache.__tablename__ + " WHERE file_id=" + str(file_id) + " LIMIT 1;"))
            exists = result.rowcount == 1

            if exists:
                logger.debug("Using cached result.")

                query = "SELECT t.tumor_type_id,t.distance,t.mutation_code_id,t.count  FROM " + DistanceCache.__tablename__ + " t WHERE file_id="+ str(file_id)+";"
                res_df = pd.read_sql_query(query, db.get_engine())
                print("finished reading from sql")
                #query_result = db.session.query( DistanceCache.tumor_type_id, DistanceCache.distance, DistanceCache.mutation_code_id, DistanceCache.count).filter_by(file_id=file_id)
                query_result = res_df.values

            else:

                RegionTable = create_upload_table(session, repoId, create=False)
                query = session \
                    .query(MutationGroup.tumor_type_id,
                           MutationGroup.pos - RegionTable.c.pos,
                           MutationGroup.mutation_code_id,
                           func.sum(MutationGroup.mutation_count)) \
                    .join(RegionTable,
                          (MutationGroup.chrom == RegionTable.c.chrom)  &
                          between(MutationGroup.pos, RegionTable.c.pos - maxDistance, RegionTable.c.pos + maxDistance)) \
                    .group_by(MutationGroup.tumor_type_id,
                              MutationGroup.pos - RegionTable.c.pos,
                              MutationGroup.mutation_code_id)

                if tumorType:
                    query = query.filter(MutationGroup.tumor_type_id == tumor_type_reverse_dict[tumorType])

                logger.debug(f"query: {query}")
                query_result = query.all()

                def connect():
                    c = psycopg2.connect(dbname=DB_CONF["postgres_db"], host=DB_CONF["postgres_host"],
                                         port=DB_CONF["postgres_port"], user=DB_CONF["postgres_user"],
                                         password=DB_CONF["postgres_pw"])
                    return c

                import io

                if db.session.query(UserFile).filter_by(name=repoId).one().preloaded:
                    logger.debug("Caching Result.")
                    f = io.StringIO()
                    df = pd.DataFrame.from_records(query_result)
                    df.insert(0, 'file_id',file_id)
                    df.to_csv(f, index=False, header=False)  # removed header
                    f.seek(0)  # move position to beginning of file before reading
                    cursor = connect().cursor()
                    cursor.copy_from(f, DistanceCache.__tablename__, columns=('file_id','tumor_type_id', 'distance', 'mutation_code_id','count'), sep=',')
                    cursor.execute('COMMIT; ')
                    cursor.close()
                    logger.debug("Caching Finished ")


            result = defaultdict(list)

            for t in query_result:
                from_allele, to_allele = mutation_code_dict[t[2]]
                result[t[0]].append([int(t[1]), from_allele, to_allele, int(t[3])])

            result = [
                {"tumorType": tumorType,
                 "maxDistance": maxDistance,
                 "distances": result[tumorType_id]
                 }
                for tumorType, tumorType_id
                in (tumor_type_reverse_dict.items() if not tumorType else [
                    (tumorType, tumor_type_reverse_dict[tumorType])])
            ]


            session.commit()
            session.close()

            RESULTS_CACHE[CACHE_ID] = result

            update_job(jobID, result)

        except Exception as e:
            unregister_job(jobID)
            logger.error("Async error", e)
            raise e

    executor.submit(async_function)

    print(jobID)

    return json.dumps(
        {"jobID": jobID}
    )