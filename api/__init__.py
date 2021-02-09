from logging.config import dictConfig

from flask import Flask
from flask_cors import CORS
from flask_executor import Executor

from api.db import *
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

MUTVIZ_CONF = {
    "base_url" : "/mutviz"
}

app = Flask(__name__, static_url_path=MUTVIZ_CONF["base_url"] + '', static_folder='../static')
cors = CORS(app, resources={r"/mutviz/api/*": {"origins": "*"}})

app.config['SQLALCHEMY_DATABASE_URI'] = get_db_uri()
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['EXECUTOR_PROPAGATE_EXCEPTIONS'] = True

db.init_app(app)

executor = Executor(app)

with app.app_context():
    DEBUG_MODE = True
    DEBUG_MODE = False

    RESULTS_CACHE = {}

    jobs = dict()
    job_counter = 0

    logger = flask.current_app.logger

chromosome_dict = dict([(str(x), x) for x in range(1, 23)] + [('x', 23), ('y', 24), ('mt', 25), ('m', 25), ])


@app.after_request
def after_request(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, public, max-age=0"
    response.headers["Expires"] = 0
    response.headers["Pragma"] = "no-cache"
    return response

with app.app_context():
    res = MutationCode.query.all()
    mutation_code_dict = dict([(x.mutation_code_id, (x.from_allele, x.to_allele)) for x in res])
    mutation_code_reverse_dict = dict([((x.from_allele, x.to_allele), x.mutation_code_id) for x in res])

    res = MutationCodeR.query.all()
    mutation_code_r_dict = dict([(x.mutation_code_id, x.mutation_r) for x in res])


    res = TumorType.query.all()
    tumor_type_dict = dict([(x.tumor_type_id, (x.tumor_type, x.description, x.mutation_count, x.description, x.attributes, x.donor_count, x.wgs, x.wxs)) for x in res])
    tumor_type_reverse_dict = dict([(x.tumor_type, x.tumor_type_id) for x in res])

    res = TrinucleotideEncoded.query.all()
    trinucleotides_dict = dict([(x.id, (x.mutation, x.triplet, x.from_allele, x.to_allele)) for x in res])


    res = UserFile.query.filter_by(preloaded=True).all()
    repositories_dict = dict()
    for r in res:
        repositories_dict[str(r.name)] = (r.id, r.name, r.description, r.count, r.avg_length, r.max_length)
    del res


# Serve static content
@app.route(MUTVIZ_CONF["base_url"] + '/')
def root():
    return app.send_static_file('index.html')

import api.jobs
import api.repository
import api.clinical
import api.distance
import api.trinucleotide
import api.donors
import api.signature

@app.route(MUTVIZ_CONF["base_url"] + '/api/jobs/<string:jobID>', methods=['GET'])
def get_uc6_r(jobID):
    return api.jobs.get_job_result(jobID, logger)

@app.route(MUTVIZ_CONF["base_url"] + '/api/regions/', methods=['POST'])
def upload():
    return api.repository.upload_regions(logger)

@app.route(MUTVIZ_CONF["base_url"] + '/api/regions/<string:regions_name>', methods=['GET'])
def check(regions_name):
    return api.repository.check_regions(logger, regions_name)

@app.route(MUTVIZ_CONF["base_url"] + '/api/distance/', methods=['POST'])
def get_distances():
    return api.distance.get_distances(logger)

@app.route(MUTVIZ_CONF["base_url"] + '/api/distance/test', methods=['POST'])
def get_test_distances():
    return api.distance.get_test_distances(logger)

@app.route(MUTVIZ_CONF["base_url"] + '/api/repository/')
def get_repository():
    return api.repository.get_repository()

@app.route(MUTVIZ_CONF["base_url"] + '/api/tumor_types/')
def get_tumor_types():
    return api.repository.get_tumor_types()

@app.route(MUTVIZ_CONF["base_url"] + '/api/trinucleotide/', methods=['POST'])
def get_trinucleotide():
    return api.trinucleotide.get_trinucleotide(logger)

@app.route(MUTVIZ_CONF["base_url"] + '/api/donors/', methods=['POST'])
def get_uc5():
    return api.donors.get_uc5(logger)

@app.route(MUTVIZ_CONF["base_url"] + '/api/signatures/', methods=['POST'])
def get_uc6():
    return api.signature.get_uc6(logger)

@app.route(MUTVIZ_CONF["base_url"] + '/api/attributes/<string:tumor_type>/<string:attribute_name>', methods=['GET'])
def get_values(tumor_type, attribute_name):
    return api.clinical.get_values(logger,tumor_type, attribute_name)

@app.route(MUTVIZ_CONF["base_url"] + '/api/attributes/test/', methods=['POST'])
def testCondition():
    return api.clinical.test_condition(logger)
