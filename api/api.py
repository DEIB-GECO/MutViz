from flask import Flask, json, request, abort
from flask_cors import CORS

# documentation:
# https://docs.google.com/document/d/1kNJ7mogv5Jj6Wu2WOU4jCeX-Nav250l4tMHm6YFGANU/edit#

app = Flask(__name__, static_url_path='', static_folder='../static')
cors = CORS(app, resources={r"/api/*": {"origins": "*"}})


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

# API R01
@app.route('/api/distance/', methods=['POST'])
def get_distances():
    regions = request.form.get('regions')
    regionsFormat = request.form.get('regionsFormat')
    maxDistance = int(request.form.get('maxDistance'))
    tumorType = request.form.get('tumorType')

    if not(regions and regionsFormat and maxDistance):
        abort(400)

    if tumorType==None:
        # return result for each available tumor type
        results = [
            {"tumorType": "brca",
             "maxDistance": maxDistance,
             "distances" : [[0,  'A', 'C'], [-1,  'C', 'G']]
             },
            {"tumorType": "coca",
             "maxDistance": maxDistance,
             "distances" : [[0,  'A', 'C'], [-13,  'C', 'G']]}
        ]
        return json.dumps(results)

    else:

        results = {
             "tumorType": tumorType,
             "maxDistance": maxDistance,
             "distances": [[123, 'A', 'C'], [-13, 'C', 'G']]
        }

        return json.dumps(results)


# API T01
@app.route('/api/t01/', methods=['POST'])
def get_test1():
    regions = request.form.get('regions')
    regionsFormat = request.form.get('regionsFormat')
    tumorType = request.form.get('tumorType')
    transitions = request.form.get('transitions')
    maxDistance = int(request.form.get('maxDistance'))

    if not(regions and regionsFormat and maxDistance and tumorType and transitions):
        abort(400)

    if regions == "file non parsabile ...":
        abort(422)


    # parse transitions array
    trans_arr = json.loads(transitions)

    results = { "pvalue" : 0.1}
    return json.dumps(results)

# API T02
@app.route('/api/t02/', methods=['POST'])
def get_test2():
    regions_1 = request.form.get('regions_1')
    regions_2 = request.form.get('regions_2')
    regionsFormat_1 = request.form.get('regionsFormat_1')
    regionsFormat_2 = request.form.get('regionsFormat_2')
    tumorType = request.form.get('tumorType')
    transitions = request.form.get('transitions')
    maxDistance = int(request.form.get('maxDistance'))

    if not(regions_1 and regions_2 and regionsFormat_1 and regionsFormat_2 and maxDistance and tumorType and transitions):
        abort(400)

    if regions_1 == "file non parsabile ..." or regions_2 == "file non parsabile ...":
        abort(422)

    # parse transitions array
    trans_arr = json.loads(transitions)

    results = { "pvalue" : 0.1}
    return json.dumps(results)

# API T03
@app.route('/api/t03/', methods=['POST'])
def get_test3():
    regions = request.form.get('regions')
    regionsFormat = request.form.get('regionsFormat')
    tumorType_1 = request.form.get('tumorType_1')
    tumorType_2 = request.form.get('tumorType_2')
    transitions = request.form.get('transitions')
    maxDistance = int(request.form.get('maxDistance'))


    if not(regions and regionsFormat  and maxDistance and tumorType_1 and tumorType_2 and transitions):
        abort(400)

    if regions == "file non parsabile ...":
        abort(422)

    # parse transitions array
    trans_arr = json.loads(transitions)

    results = { "pvalue" : 0.1}
    return json.dumps(results)

if __name__ == '__main__':
   app.run()

#pip install flask
#pip install -U flask-cors

# export FLASK_APP=api.py
# flask run