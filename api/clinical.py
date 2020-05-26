import uuid

from sqlalchemy import text

from api import MUTVIZ_CONF, app, repositories_dict, tumor_type_dict, parse_input_regions, db, \
    create_upload_table, logger, create_upload_table_full, UserFile, ClinicalDatum, tumor_type_reverse_dict
from flask import json, request, abort

def get_values(logger, tumor_type, attribute_name):

    #tumor_type =  request.form.get('tumor_type_id')
    #attribute_name = request.form.get('regions')
    table_name = ClinicalDatum.__tablename__

    tumor_type_id=str(tumor_type_reverse_dict[tumor_type])
    print("tumor_type_id =>",tumor_type_id, "=",tumor_type)
    query = "SELECT "+attribute_name+", count(*) from "+table_name+" where tumor_type_id="+tumor_type_id+" group by "+attribute_name+";"


    if not tumor_type or not attribute_name:
        logger.error("Missing tumor_type_id or attribute_name.")
        abort(400)

    values = []

    try:
        connection = db.get_engine().connect()
        # session.execute("set enable_seqscan=false")

        result = connection.execute(text(query))
        print(result)


        values_count = 0
        for value in result:
            if not(value[0] is None):
                values.append({"value":value[0], "count":value[1]})
                values_count = values_count + value[1]

        result.close()

    except Exception as e:
        logger.error("Error or table does not exist", e)
        abort(500)

    answer= {"tumor_type": tumor_type,
             "attribute": attribute_name,
             "values_count": values_count,
              "values": values }

    return json.dumps(answer)

#DELETE FROM clinical_attributes;
#UPDATE tumor_type tt SET attributes=(SELECT important from clinical_attributes ca where ca.tumor_type_id=tt.tumor_type_id)

