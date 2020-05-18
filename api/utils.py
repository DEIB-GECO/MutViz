import flask
from sqlalchemy.schema import CreateTable

import api
from api.model.models import *


def parse_input_regions(regions):
    chromosome_dict = api.api.chromosome_dict
    logger = flask.current_app.logger

    regions = regions.split("\n")
    logger.debug(f"regions: {len(regions)}")

    result = []
    error_results = []

    for i, region in enumerate(regions):
        # skip empty line
        if region:
            splt = region.split('\t')
            if len(splt) == 2:
                chrom, pos = splt
                chrom = chrom.lower().replace('chr', '')

                if chrom in chromosome_dict:
                    chrom = chromosome_dict[chrom]
                    try:
                        pos = int(pos)
                        # position negative check is excluded
                        if True or pos >= 0:
                            result.append((chrom, pos))
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


def create_upload_table(session, table_name, regions=[], temp=True, create=True, upload=True):

    if table_name in db.metadata.tables:
        temp_table =db.metadata.tables[table_name]
    else:
        temp_table = db.Table(table_name,
                              db.Column('chrom', db.SmallInteger),
                              db.Column('pos', db.Integer),
                              prefixes=['TEMPORARY'] if temp else [],
                              extend_existing=True,
                              )

    if create:
        session.execute(CreateTable(temp_table))
        # logger.debug("temp_table => " + str(session.query(temp_table).all()))
        session.flush()

    if upload:
        for i, inp in enumerate(regions):
            if i % 1000 == 0:
                session.flush()
                print(f"{table_name} {i}")
            # session.execute(temp_table_insert.values(inp)) #.values(chrom=chrom, pos=pos))
            session.execute(temp_table.insert(values=inp))  # .values(chrom=chrom, pos=pos))

    # logger.debug("temp_table => " + str(session.query(temp_table).all()))
    return temp_table


def create_upload_table_full(session, table_name, regions=[], temp=True, create=True, upload=True):
    if table_name in db.metadata.tables:
        temp_table =db.metadata.tables[table_name]
    else:

        temp_table = db.Table(table_name,
                              db.Column('chrom', db.SmallInteger),
                              db.Column('start', db.Integer),
                              db.Column('stop', db.Integer),
                              prefixes=['TEMPORARY'] if temp else [],
                              extend_existing=True,
                              )

    if create:
        session.execute(CreateTable(temp_table))
        # logger.debug("temp_table => " + str(session.query(temp_table).all()))
        session.flush()

    if upload:
        for i, inp in enumerate(regions):
            if i % 1000 == 0:
                session.flush()
                print(f"{table_name} {i}")
            # session.execute(temp_table_insert.values(inp)) #.values(chrom=chrom, pos=pos))
            session.execute(temp_table.insert(values=inp))  # .values(chrom=chrom, pos=pos))

    # logger.debug("temp_table => " + str(session.query(temp_table).all()))
    return temp_table