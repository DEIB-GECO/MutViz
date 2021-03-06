import uuid
import pandas as pd

from api import MUTVIZ_CONF, app, repositories_dict, tumor_type_dict, parse_input_regions, db, \
    create_upload_table, logger, create_upload_table_full, UserFile
from flask import json, request, abort


def get_repository():
    repositories = [{"identifier": id,
                     "name": name,
                     "description": description,
                     "count": count,
                     "avgLength":avg,
                     "maxLength":max
                     }
                    for identifier, (id, name, description, count, avg, max) in
                    sorted(repositories_dict.items(), key=lambda x: x[1][1])  # sort by name
                    ]
    return json.dumps(repositories)

def get_tumor_types():
    result = [{"name": x[0] + " - " + x[1],
               "identifier": x[0],
               "mutation_count": x[2], "description": x[3], "attributes":x[4], "donor_count":x[5]}
              for x in sorted(tumor_type_dict.values())
              ]
    return json.dumps(result)


def generateRegionId(name):
    region_id = "temp_"+name.lower()+str(uuid.uuid1()).replace('-', '_')
    region_id = ''.join(e for e in region_id if e.isalnum())
    return region_id


def check_regions(logger, regions_name):

    if not regions_name:
        logger.error("Missing regions or region_name.")
        abort(400)

    exists = False

    try:
        session = db.session
        # session.execute("set enable_seqscan=false")



        exists = session.query(session.query(UserFile).filter_by(name=regions_name, expired=False).exists()).scalar()

        session.commit()
        session.close()

    except Exception as e:
        logger.error("Error or table does not exist", e)
        abort(500)

    if exists:
        result = {"text":"ok"}
        return json.dumps(result)
    else:
        abort(404)


def upload_regions(logger):
    print("Uploading regions")
    logger.debug("Uploading regions.")
    regions_name =  request.form.get('regions_name')
    regions = request.form.get('regions')

    if not regions or not regions_name:
        logger.error("Missing regions or region_name.")
        abort(400)

    regions_name = regions_name

    regions, error_regions = parse_input_regions(regions)

    id = generateRegionId(regions_name)

    try:
        session = db.session
        #session.execute("set enable_seqscan=false")
        create_upload_table_full(session, id, createUpload=True, regions=regions)
        create_upload_table(session, id, create=True)

        df_regions = pd.DataFrame(regions, columns=['chr', 'start', 'stop'])
        df_regions["len"] = df_regions["stop"]-df_regions["start"]+1

        avg_len = df_regions["len"].mean().astype("float")
        max_len = df_regions["len"].max().astype("float")


        # Add an entry to the user file
        uf = UserFile(name=id, preloaded=False, count=len(regions), avg_length=avg_len, max_length=max_len)
        session.add(uf)

        session.commit()
        session.close()

    except Exception as e:
        logger.error("Error uploading regions.", e)
        abort(500)

    result = { "id": id, "name":regions_name, "parsed_lines":len(regions), "avg_len":avg_len, "max_len":max_len,
               **({"error": error_regions} if error_regions else {})}

    return json.dumps(result)