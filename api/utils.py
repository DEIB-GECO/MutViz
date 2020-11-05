import flask
from sqlalchemy import text
from sqlalchemy.schema import CreateTable

import api
from api.model.models import *

import pandas as pd
import psycopg2

def parse_input_regions(regions):
    chromosome_dict = api.chromosome_dict
    logger = flask.current_app.logger

    regions = regions.split("\n")
    logger.debug(f"regions: {len(regions)}")

    result = []
    error_results = []

    for i, region in enumerate(regions):
        # skip empty line
        if region:
            splt = region.split('\t')
            if len(splt) == 3:
                chrom, start, stop = splt
                chrom = chrom.lower().replace('chr', '')

                if chrom in chromosome_dict:
                    chrom = chromosome_dict[chrom]
                    try:
                        start = int(start) + 1 # BED is 0 based and we want 1 based
                        stop = int(stop)
                        # position negative check is excluded
                        if True or start >= 0 or stop >=0:
                            result.append((chrom, start, stop))
                        else:
                            error_results.append(["position_negative_error", i, region])
                    except ValueError:
                        error_results.append(["position_integer_error", i, region])
                else:
                    error_results.append(["chrom_error", i, region])
            else:
                error_results.append(["wrong_column_size", i, region])
        else:
            error_results.append(["empty_line", i, region])
    return result, error_results


def create_upload_table(session, table_name, create=True):

    table =  db.Table(table_name,
                      db.Column('chrom', db.SmallInteger),
                      db.Column('pos', db.Integer), extend_existing=True)

    if create :
        query_txt = "CREATE TABLE "+table_name+ "(chrom,pos) AS SELECT chrom, (pos_start+pos_stop)/2 FROM full_"+table_name;
        sql = text(query_txt)
        session.execute(sql)
        session.flush()

    return table


def create_upload_table_full(session, table_name, regions=[], temp=True, createUpload=True):

    final_table_name = "full_" + table_name

    if createUpload==True:
        DB_CONF = api.DB_CONF

        def connect():
            c = psycopg2.connect(dbname=DB_CONF["postgres_db"], host=DB_CONF["postgres_host"], port=DB_CONF["postgres_port"], user=DB_CONF["postgres_user"], password=DB_CONF["postgres_pw"])
            return c
        import io

        f = io.StringIO()
        pd.DataFrame(regions).to_csv(f, index=False, header=False)  # removed header
        f.seek(0)  # move position to beginning of file before reading
        cursor = connect().cursor()
        cursor.execute('create table '+final_table_name+' (chrom smallint, pos_start int, pos_stop int);COMMIT; ')
        cursor.copy_from(f, final_table_name, columns=('chrom', 'pos_start','pos_stop'), sep=',')
        cursor.close()