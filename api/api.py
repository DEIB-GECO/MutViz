import uuid
from collections import defaultdict
from logging.config import dictConfig

import flask
import sqlalchemy
from flask import Flask, json, request, abort
from flask_cors import CORS

from api.db import *
from api.model.models import *

# documentation:
# https://docs.google.com/document/d/1kNJ7mogv5Jj6Wu2WOU4jCeX-Nav250l4tMHm6YFGANU/edit#

dictConfig({
    'version': 1,
    'formatters': {'default': {
        'format': '[%(asctime)s] %(levelname)s in %(module)s:%(lineno)d: %(message)s',
    }},
    'handlers': {'wsgi': {
        'class': 'logging.StreamHandler',
        'stream': 'ext://flask.logging.wsgi_errors_stream',
        'formatter': 'default'
    }},
    'root': {
        'level': 'DEBUG',
        'handlers': ['wsgi']
    }
})

app = Flask(__name__, static_url_path='', static_folder='../static')
cors = CORS(app, resources={r"/api/*": {"origins": "*"}})

app.config['SQLALCHEMY_DATABASE_URI'] = get_db_uri()
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# JOBS   jobId->resultJson
jobs = {"abcde-fghi-lmno": None, "abbbb-fknifn": None}

with app.app_context():
    logger = flask.current_app.logger

chromosome_dict = dict([(str(x), x) for x in range(1, 23)] + [('x', 23), ('y', 24), ('mt', 25)])
with app.app_context():
    res = MutationCode.query.all()
    mutation_code_dict = dict([(x.mutation_code_id, (x.from_allele, x.to_allele)) for x in res])
    # print(mutation_code_dict)
    res = TumorType.query.all()
    tumor_type_dict = dict([(x.tumor_type_id, x.tumor_type) for x in res])
    tumor_type_reverse_dict = dict([(x.tumor_type, x.tumor_type_id) for x in res])


def getJobResult(jobID):
    if not jobID in jobs:
        abort(404)
    elif jobs[jobID] == None:
        return json.dumps({"ready": False})
    else:
        res = json.dumps({"ready": True, "result": jobs[jobID]})
        # del jobs[jobID]
        return res


# Serve static content
@app.route('/')
def root():
    return app.send_static_file('index.html')


# API L01
@app.route('/api/tumor_types/')
def get_tumor_types():
    results = [
        {"name": "Breast Cancer",
         "identifier": "BRCA"},
        {"name": "Colorectal Cancer",
         "identifier": "COCA"}
    ]
    result = [{"name": x,
               "identifier": x}
              for x in tumor_type_dict.values()
              ]
    return json.dumps(result)


# API L02
@app.route('/api/repository/')
def get_repository():
    mutations = Repository.query.all()
    res = list(map(lambda x: {"identifier": x.repository_id, "name": x.name, "description": x.description}, mutations))
    return json.dumps(res)


# API R01
@app.route('/api/distance/', methods=['POST'])
def get_distances():
    repoId = request.form.get('repoId')
    logger.debug(f"repoId: {repoId}")

    regions = request.form.get('regions')
    if not regions:
        logger.debug(f"regions: {regions}")

    # no need?
    # regionsFormat = request.form.get('regionsFormat')
    # logger.debug("regionsFormat:" + regionsFormat)

    maxDistance = request.form.get('maxDistance')
    logger.debug(f"maxDistance: {maxDistance}")

    tumorType = request.form.get('tumorType')
    logger.debug(f"tumorType: {tumorType}")

    # REMOVED region_format
    if not ((repoId or regions) and maxDistance):
        abort(400)

    # we can move into thread?
    if regions:
        regions = regions.split("\n")
        logger.debug(f"regions: {len(regions)}")
        regions = filter(lambda x: x, regions)
        regions = map(lambda x: x.split("\t"), regions)
    else:
        logger.debug("regions:" + str(regions))
    maxDistance = int(maxDistance)

    # Generate a jobID
    jobID = str(uuid.uuid1()).replace('-', '_')
    table_name = "t_" + jobID

    logger.debug(f"{jobID}->{table_name}")

    ### Asynchronous computation

    session = db.session
    session.execute("set enable_seqscan=false")

    session.execute(sqlalchemy.text(f"CREATE TEMPORARY TABLE {table_name}(chrom smallint, pos bigint)"))
    # session.execute(f"INSERT INTO {table_name} VALUES ({4},{4})")
    session.flush()

    if tumorType == None:
        result = defaultdict(list)
        # return result for each available tumor type
        if regions:
            for i, (chrom, pos) in enumerate(regions):
                if i % 100 == 0:
                    session.flush()
                    print(i)
                chrom = chrom.lower().replace('chr', '')
                try:
                    pos = int(pos)
                except ValueError:
                    pos = None

                if chrom in chromosome_dict and pos:
                    chrom = chromosome_dict[chrom]
                    session.execute(f"INSERT INTO {table_name} VALUES ({chrom},{pos})")
            logger.debug("INSERTED")

            session.flush()

            query_result = session.execute(
                f"""SELECT tumor_type_id,  mut.pos - te.pos as new_pos, mutation_code_id, count(*)
                    FROM mutation_group AS mut
                    JOIN {table_name} as te ON te.chrom = mut.chrom 
                        AND mut.pos between te.pos - {maxDistance} 
                        AND te.pos + {maxDistance}
                    GROUP BY tumor_type_id,  new_pos, mutation_code_id""") \
                .fetchall()
            logger.debug(query_result[0])

            for t in query_result:
                from_allele, to_allele = mutation_code_dict[t[2]]
                result[t.tumor_type_id].append([t[1], from_allele, to_allele, t[3]])

        result = [
            {"tumorType": tumorType,
             "maxDistance": maxDistance,
             "distances": result[tumorType_id]
             }
            for tumorType_id, tumorType in tumor_type_dict.items()
        ]

        session.close()

        jobs[jobID] = result

    else:
        # TODO
        results = {
            "tumorType": tumorType,
            "maxDistance": maxDistance,
            "distances": [[123, 'A', 'C'], [-13, 'C', 'G']]
        }

        jobs[jobID] = results

    ### End of asynchronous computation

    return json.dumps({"jobID": jobID})


# API R01r
@app.route('/api/distance/<string:jobID>', methods=['GET'])
def get_distances_r(jobID):
    # print(jobID)
    return getJobResult(jobID)


# API T01
@app.route('/api/t01/', methods=['POST'])
def get_test1():
    repoId = request.form.get('repoId')
    regions = request.form.get('regions')
    regionsFormat = request.form.get('regionsFormat')
    tumorType = request.form.get('tumorType')
    mutations = request.form.get('mutations')
    maxDistance = int(request.form.get('maxDistance'))

    if not ((repoId or regions and regionsFormat) and
            maxDistance and tumorType and mutations):
        abort(400)

    # in teoria inutile perchè lo parso lato client
    if regions == "file non parsabile ...":
        abort(422)

    # Generate a jobID
    jobID = str(uuid.uuid1())

    ### Asynchronous computation
    trans_arr = json.loads(mutations)  # parse mutations array
    jobs[jobID] = {"pvalue": 0.1}

    return json.dumps({"jobID": jobID})


# API T01r
@app.route('/api/t01/<string:jobID>', methods=['GET'])
def get_test1_r(jobID):
    return getJobResult(jobID)


# API T02
@app.route('/api/t02/', methods=['POST'])
def get_test2():
    repoId1 = request.form.get('repoId1')
    repoId2 = request.form.get('repoId2')
    regions_1 = request.form.get('regions_1')
    regions_2 = request.form.get('regions_2')
    regionsFormat_1 = request.form.get('regionsFormat_1')
    regionsFormat_2 = request.form.get('regionsFormat_2')
    tumorType = request.form.get('tumorType')
    mutations = request.form.get('mutations')
    maxDistance = int(request.form.get('maxDistance'))

    if not ((repoId1 or regions_1 and regionsFormat_1) and
            (repoId2 or regions_2 and regionsFormat_2) and
            maxDistance and tumorType and mutations):
        abort(400)

    if regions_1 == "file non parsabile ..." or regions_2 == "file non parsabile ...":
        abort(422)

    # Generate a jobID
    jobID = str(uuid.uuid1())

    ### Asynchronous computation
    trans_arr = json.loads(mutations)  # parse mutations array
    jobs[jobID] = {"pvalue": 0.1}

    return json.dumps({"jobID": jobID})


# API T02r
@app.route('/api/t02/<string:jobID>', methods=['GET'])
def get_test2_r(jobID):
    return getJobResult(jobID)


# API T03
@app.route('/api/t03/', methods=['POST'])
def get_test3():
    repoId = request.form.get('repoId')
    regions = request.form.get('regions')
    regionsFormat = request.form.get('regionsFormat')
    tumorType_1 = request.form.get('tumorType_1')
    tumorType_2 = request.form.get('tumorType_2')
    mutations = request.form.get('mutations')
    maxDistance = int(request.form.get('maxDistance'))

    if not ((repoId or regions and regionsFormat) and
            maxDistance and tumorType_1 and tumorType_2 and mutations):
        abort(400)

    if regions == "file non parsabile ...":
        abort(422)

    # Generate a jobID
    jobID = str(uuid.uuid1())

    ### Asynchronous computation
    trans_arr = json.loads(mutations)  # parse mutations array
    jobs[jobID] = {"pvalue": 0.1}

    return json.dumps({"jobID": jobID})


# API T03r
@app.route('/api/t03/<string:jobID>', methods=['GET'])
def get_test3_r(jobID):
    return getJobResult(jobID)


if __name__ == '__main__':
    app.run()
