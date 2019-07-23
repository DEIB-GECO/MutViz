import threading
import uuid
from collections import defaultdict
from logging.config import dictConfig

from flask import Flask, json, request, abort
from flask_cors import CORS
from flask_executor import Executor
from sqlalchemy import between
from sqlalchemy import func

from api.db import *
from api.jobs import register_job, update_job, get_job_result, unregister_job
from api.utils import *

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
app.config['EXECUTOR_PROPAGATE_EXCEPTIONS'] = True

db.init_app(app)

executor = Executor(app)


@app.before_first_request
def activate_job_cleaner():
    thread = threading.Thread(target=api.jobs.auto_delete)
    thread.start()


with app.app_context():
    logger = flask.current_app.logger

chromosome_dict = dict([(str(x), x) for x in range(1, 23)] + [('x', 23), ('y', 24), ('mt', 25), ('m', 25), ])
with app.app_context():
    res = MutationCode.query.all()
    mutation_code_dict = dict([(x.mutation_code_id, (x.from_allele, x.to_allele)) for x in res])
    mutation_code_reverse_dict = dict([((x.from_allele, x.to_allele), x.mutation_code_id) for x in res])
    res = TumorType.query.all()
    tumor_type_dict = dict([(x.tumor_type_id, (x.tumor_type, x.description)) for x in res])
    tumor_type_reverse_dict = dict([(x.tumor_type, x.tumor_type_id) for x in res])
    repositories = Repository.query.all()


# Serve static content
@app.route('/')
def root():
    return app.send_static_file('index.html')


# API L01
@app.route('/api/tumor_types/')
def get_tumor_types():
    result = sorted([{"name": x[0] + " - " +  x[1],
               "identifier": x[0]}
              for x in tumor_type_dict.values()
              ])
    return json.dumps(result)


# API L02
@app.route('/api/repository/')
def get_repository():
    res = list(map(lambda x: {"identifier": x.repository_id,
                              "name": x.name,
                              "description": x.description},
                   repositories))
    return json.dumps(res)


# API R01
@app.route('/api/distance/', methods=['POST'])
def get_distances():
    repoId = request.form.get('repoId')
    logger.debug(f"repoId: {repoId}")

    regions = request.form.get('regions')
    if not regions:
        logger.debug(f"regions: {regions}")

    maxDistance = request.form.get('maxDistance')
    logger.debug(f"maxDistance: {maxDistance}")

    tumorType = request.form.get('tumorType')
    logger.debug(f"tumorType: {tumorType}")

    if not ((repoId or regions) and maxDistance):
        abort(400)

    try:
        maxDistance = int(maxDistance)
    except ValueError:
        abort(400, 'max distance integer')

    regions, error_regions = parse_input_regions(regions)

    # Generate a jobID
    jobID = str(uuid.uuid1()).replace('-', '_')
    register_job(jobID)
    # jobs[jobID] = None

    logger.debug(f"jobID: {jobID}")

    # TODO remove after testing
    # regions = list(regions)[:1000]
    ### Asynchronous computation
    def async_function():
        try:
            session = db.session
            session.execute("set enable_seqscan=false")

            table_name = "t_" + jobID
            logger.debug(f"{jobID} -> {table_name}")

            temp_table = create_upload_table(session, table_name, regions)

            query = session \
                .query(MutationGroup.tumor_type_id,
                       MutationGroup.pos - temp_table.c.pos,
                       MutationGroup.mutation_code_id,
                       func.sum(MutationGroup.mutation_count)) \
                .join(temp_table,
                      (MutationGroup.chrom == temp_table.c.chrom) &
                      between(MutationGroup.pos, temp_table.c.pos - maxDistance, temp_table.c.pos + maxDistance)) \
                .group_by(MutationGroup.tumor_type_id,
                          MutationGroup.pos - temp_table.c.pos,
                          MutationGroup.mutation_code_id)
            if tumorType:
                query = query.filter(MutationGroup.tumor_type_id == tumor_type_reverse_dict[tumorType])

            logger.debug(f"query: {query}")

            # print(session.execute(f"EXPLAIN ANALYZE {query}").fetchall())

            query_result = query.all()

            result = defaultdict(list)

            for t in query_result:
                from_allele, to_allele = mutation_code_dict[t[2]]
                result[t.tumor_type_id].append([t[1], from_allele, to_allele, t[3]])

            result = [
                {"tumorType": tumorType,
                 "maxDistance": maxDistance,
                 "distances": result[tumorType_id]
                 }
                for tumorType, tumorType_id
                in (tumor_type_reverse_dict.items() if not tumorType else [
                    (tumorType, tumor_type_reverse_dict[tumorType])])
            ]
            # print(result)

            session.commit()
            session.close()

            update_job(jobID, result)
            logger.info('JOB DONE: ' + jobID)
        except Exception as e:
            unregister_job(jobID)
            # logger.error("Async error", e)
            raise

    executor.submit(async_function)
    # async_function()
    ### End of asynchronous computation

    return json.dumps(
        {**{"jobID": jobID, 'correct_region_size': len(regions)},
         **({"error": error_regions} if error_regions else {})}
    )


# API R01r
@app.route('/api/distance/<string:jobID>', methods=['GET'])
def get_distances_r(jobID):
    # print(jobID)
    return get_job_result(jobID)


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
    update_job(jobID, {"pvalue": 0.1})

    return json.dumps({"jobID": jobID})


# API T01r
@app.route('/api/t01/<string:jobID>', methods=['GET'])
def get_test1_r(jobID):
    return get_job_result(jobID)


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
    update_job(jobID, {"pvalue": 0.1})

    return json.dumps({"jobID": jobID})


# API T02r
@app.route('/api/t02/<string:jobID>', methods=['GET'])
def get_test2_r(jobID):
    return get_job_result(jobID)


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
    update_job(jobID, {"pvalue": 0.1})

    return json.dumps({"jobID": jobID})


# API T03r
@app.route('/api/t03/<string:jobID>', methods=['GET'])
def get_test3_r(jobID):
    return get_job_result(jobID)


if __name__ == '__main__':
    app.run()
