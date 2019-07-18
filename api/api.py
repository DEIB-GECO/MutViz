from flask import Flask, json, request, abort
from flask_cors import CORS
import sqlalchemy
import uuid
from model.models import *
from db import *


# documentation:
# https://docs.google.com/document/d/1kNJ7mogv5Jj6Wu2WOU4jCeX-Nav250l4tMHm6YFGANU/edit#

app = Flask(__name__, static_url_path='', static_folder='../static')
cors = CORS(app, resources={r"/api/*": {"origins": "*"}})

app.config['SQLALCHEMY_DATABASE_URI'] = get_db_uri()
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)


#JOBS   jobId->resultJson
jobs = { "abcde-fghi-lmno" : None , "abbbb-fknifn": None}


def getJobResult(jobID):

    if not jobID in jobs:
        abort(404)
    elif  jobs[jobID]==None:
        return json.dumps({"ready": False})
    else:
        res = json.dumps({"ready": True, "result": jobs[jobID]})
        #del jobs[jobID]
        return res


# Serve static content
@app.route('/')
def root():
    return app.send_static_file('index.html')

# API L01
@app.route('/api/tumor_types/')
def get_tumor_types():
    results = [
        { "name": "Breast Cancer",
          "identifier": "brca" },
        { "name": "Colorectal Cancer",
          "identifier": "coca"}
    ]
    return json.dumps(results)

# API L02
@app.route('/api/repository/')
def get_repository():

    with app.app_context():
        mutations = Repository.query.all()
        res = list(map(lambda x: {"identifier":x.id, "name":x.name, "description":x.description }, mutations))

        print(res)

    return json.dumps(res)

# API R01
@app.route('/api/distance/', methods=['POST'])
def get_distances():
    repoId = request.form.get('repoId')
    regions = request.form.get('regions')
    regionsFormat = request.form.get('regionsFormat')
    maxDistance = int(request.form.get('maxDistance'))
    tumorType = request.form.get('tumorType')

    if not( (repoId or regions and regionsFormat) and maxDistance):
        abort(400)

    # Generate a jobID
    jobID = str(uuid.uuid1())

    ### Asynchronous computation
    if tumorType == None:
        # return result for each available tumor type
        results = [
            {"tumorType": "brca",
             "maxDistance": maxDistance,
             "distances": [[0, 'A', 'C'], [-1, 'C', 'G']]
             },
            {"tumorType": "coca",
             "maxDistance": maxDistance,
             "distances": [[0, 'A', 'C'], [-13, 'C', 'G']]}
        ]
        jobs[jobID] = results

    else:

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
    print(jobID)
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

    if not( (repoId or regions and regionsFormat) and
            maxDistance and tumorType and mutations):
        abort(400)

    # in teoria inutile perchè lo parso lato client
    if regions == "file non parsabile ...":
        abort(422)

    # Generate a jobID
    jobID = str(uuid.uuid1())

    ### Asynchronous computation
    trans_arr = json.loads(mutations) #parse mutations array
    jobs[jobID] = { "pvalue" : 0.1}

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

    if not( (repoId1 or regions_1 and regionsFormat_1) and
            (repoId2 or regions_2 and regionsFormat_2) and
             maxDistance and tumorType and mutations):
        abort(400)

    if regions_1 == "file non parsabile ..." or regions_2 == "file non parsabile ...":
        abort(422)

    # Generate a jobID
    jobID = str(uuid.uuid1())

    ### Asynchronous computation
    trans_arr = json.loads(mutations) #parse mutations array
    jobs[jobID] = { "pvalue" : 0.1}

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


    if not( (repoId or regions and regionsFormat) and
             maxDistance and tumorType_1 and tumorType_2 and mutations):
        abort(400)

    if regions == "file non parsabile ...":
        abort(422)

    # Generate a jobID
    jobID = str(uuid.uuid1())

    ### Asynchronous computation
    trans_arr = json.loads(mutations) #parse mutations array
    jobs[jobID] = { "pvalue" : 0.1}

    return json.dumps({"jobID": jobID})

# API T03r
@app.route('/api/t03/<string:jobID>', methods=['GET'])
def get_test3_r(jobID):
    return getJobResult(jobID)



if __name__ == '__main__':
   app.run()