from collections import defaultdict

import psycopg2
from flask import json, request, abort
from sqlalchemy import text

from api import DEBUG_MODE, trinucleotides_dict, tumor_type_dict, executor, RESULTS_CACHE, tumor_type_reverse_dict
from api.clinical import get_donors, get_query
from api.db import *
from api.jobs import register_job, update_job, unregister_job
from api.model.models import *

import pandas as pd

from api.spark.intersection import spark_intersect2


def intersect_and_group(mutation_table_name, file_name, groupbylist, tumor_type=None, filter_json=None):

    connection = db.get_engine().connect()
    file_id = db.session.query(UserFile).filter_by(name=file_name).one().id
    region_table_name = "full_" + file_name

    if tumor_type:
        tumor_type_id = str(tumor_type_reverse_dict[tumor_type])

    result = connection.execute(text("SELECT file_id FROM "+t_mutation_trinucleotide_cache.name+" WHERE file_id="+str(file_id)+" LIMIT 1;"))
    exists = result.rowcount==1

    print("Intersections Exist ==>",exists)

    if exists:
        print("reading from sql")
        query = "SELECT * FROM "+t_mutation_trinucleotide_cache.name
        if tumor_type or filter_json:
            query += " WHERE "
        if tumor_type:
            query += " tumor_type_id ="+tumor_type_id
        if tumor_type and filter_json:
            query += " AND"
        if filter_json:
            query += " donor_id IN ("+get_query(tumor_type_id, filter_json)+")"

        print(query)

        res_df = pd.read_sql_query(query, db.get_engine())
        print("finished reading from sql")
    else:
        cols  = t_mutation_trinucleotide_cache._columns.keys()
        res_df = spark_intersect2(mutation_table_name, region_table_name, DB_CONF)

        res_df["file_id"] = file_id
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
        if tumor_type and filter_json:
            donors = get_donors(tumor_type, filter_json)
            res_df = res_df[(res_df["tumor_type_id"]==tumor_type_id) & (res_df["donor_id"].isin(donors))]
        else:
            if filter_json:
                donors = get_donors(tumor_type, filter_json)
                res_df = res_df[res_df["donor_id"].isin(donors)]
            if tumor_type:
                res_df = res_df[res_df["tumor_type_id"]==tumor_type_id]

    # GroupBy and count
    res =  res_df.groupby(groupbylist)[groupbylist[-1]].agg('count').to_frame('count').reset_index()

    return res.values


def get_trinucleotide(logger):

    # Get Params
    file_name = request.form.get('file_name')
    tumor_type = request.form.get('tumorType')
    filter_json =  request.form.get('filter')

    logger.debug(f"tumor_type: {tumor_type}")
    logger.debug(f"file_name: {file_name}")
    logger.debug(f"filter: {filter_json}")

    if not file_name:
        abort(400)

    CACHE_ID = "TRINUCLEOTIDE#" + file_name + "#" + str(tumor_type)

    jobID = register_job()

    def async_function():
        try:
            if not filter_json and CACHE_ID in RESULTS_CACHE:
                update_job(jobID, RESULTS_CACHE[CACHE_ID])
                return

            if DEBUG_MODE:
                mutation_table_name = t_mutation_trinucleotide_test.name
            else:
                mutation_table_name = t_mutation_trinucleotide.name

            # Get Intersections, grouped
            mutations = intersect_and_group(mutation_table_name,
                                            file_name,
                                            ["tumor_type_id", "trinucleotide_id_r"],
                                            tumor_type = tumor_type,
                                            filter_json=filter_json)


            result  = defaultdict(dict)
            mutations = list(map(lambda x: [tumor_type_dict[x[0]][0],  trinucleotides_dict[x[1]][0], x[2]], mutations))

            for m in mutations:
                result[m[0]][m[1]] = {"trinucleotide":m[1], "mutation":m[1][2:-2], "count" : int(m[2])}

            if not filter_json:
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