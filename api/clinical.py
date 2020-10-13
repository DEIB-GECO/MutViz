import json

from sqlalchemy import text

from api import MUTVIZ_CONF, app, repositories_dict, tumor_type_dict, parse_input_regions, db, \
    create_upload_table, logger, create_upload_table_full, UserFile, ClinicalDatum, tumor_type_reverse_dict
from flask import json, request, abort


def get_query(tumor_type_id, filter_json):
    correct_id = str(tumor_type_dict[int(tumor_type_id)][6])
    print("id " + tumor_type_id + " correct_id " + correct_id)
    filter = json.loads(filter_json)
    table_name = ClinicalDatum.__tablename__
    query = "SELECT DISTINCT(donor_id)  FROM " + table_name + " WHERE tumor_type_id=" + correct_id + " AND ("

    conditions = []
    for key in filter:
        alternatives = []
        for value in filter[key]:
            if isinstance(value, int) or isinstance(value, float):
                alternatives.append(key + " = " + str(value))
            else:
                alternatives.append(key + " = '" + value + "'")
        conditions.append("(" + (' OR '.join(alternatives)) + ")")

    conditions_string = ' AND '.join(conditions)

    query += conditions_string + ")"

    return query


def get_donors(tumor_type, filter_json):
    tumor_type_id=tumor_type_reverse_dict[tumor_type]
    correct_id = str(tumor_type_dict[tumor_type_id][6])
    print("id "+str(tumor_type_id)+" correct_id "+correct_id)
    query = get_query(correct_id, filter_json)

    donors = []

    try:
        result = db.get_engine().connect().execute(text(query))

        for value in result:
            donors.append(value[0])

        return donors

    except:
        abort(500)


def test_condition(logger):
    tumorType = request.form.get('tumorType')
    filter = request.form.get('filter')

    if not tumorType or not filter:
        logger.error("Missing tumor or filter.")
        abort(400)

    donors = get_donors(tumorType, filter)


    answer= {"tumor_type": tumorType,
                 "filter": filter,
                "count":  len(donors)}

    return json.dumps(answer)



def get_values(logger, tumor_type, attribute_name):

    #tumor_type =  request.form.get('tumor_type_id')
    #attribute_name = request.form.get('regions')
    table_name = ClinicalDatum.__tablename__

    tumor_type_id=tumor_type_reverse_dict[tumor_type]
    correct_id = str(tumor_type_dict[tumor_type_id][6])

    print("tumor_type_id =>",correct_id, "=",tumor_type)
    query = "SELECT "+attribute_name+", count(*) from "+table_name+" where tumor_type_id="+correct_id+" group by "+attribute_name+";"


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

