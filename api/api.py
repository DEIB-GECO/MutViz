import threading
import uuid
from collections import defaultdict
from logging.config import dictConfig

from flask import Flask, json, request, abort
from flask_cors import CORS
from flask_executor import Executor
from scipy.stats import ks_2samp
from sqlalchemy import between
from sqlalchemy import func

from api.db import *
from api.jobs import register_job, update_job, get_job_result, unregister_job
from api.signatures.signatures_refitting import get_refitting
from api.spark.intersection import spark_intersect
from api.utils import *

import pandas as pd

# todo:optin to set spark folder

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

base_url = "/mutviz"

app = Flask(__name__, static_url_path=base_url + '', static_folder='../static')
cors = CORS(app, resources={r"/mutviz/api/*": {"origins": "*"}})

app.config['SQLALCHEMY_DATABASE_URI'] = get_db_uri()
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['EXECUTOR_PROPAGATE_EXCEPTIONS'] = True

db.init_app(app)

executor = Executor(app)

job_counter = 0


@app.before_first_request
def activate_job_cleaner():
    thread = threading.Thread(target=api.jobs.auto_delete)
    thread.start()


with app.app_context():
    DEBUG_MODE = True
    DEBUG_MODE = False
    logger = flask.current_app.logger

chromosome_dict = dict([(str(x), x) for x in range(1, 23)] + [('x', 23), ('y', 24), ('mt', 25), ('m', 25), ])
with app.app_context():
    res = MutationCode.query.all()
    mutation_code_dict = dict([(x.mutation_code_id, (x.from_allele, x.to_allele)) for x in res])
    mutation_code_reverse_dict = dict([((x.from_allele, x.to_allele), x.mutation_code_id) for x in res])

    res = MutationCodeR.query.all()
    mutation_code_r_dict = dict([(x.mutation_code_id, x.mutation_r) for x in res])


    res = TumorType.query.all()
    tumor_type_dict = dict([(x.tumor_type_id, (x.tumor_type, x.description, x.mutation_count)) for x in res])
    tumor_type_reverse_dict = dict([(x.tumor_type, x.tumor_type_id) for x in res])

    res = TrinucleotideEncoded.query.all()
    trinucleotides_dict = dict([(x.id, (x.mutation, x.triplet, x.from_allele, x.to_allele)) for x in res])


    res = UserFile.query.all()
    repositories_dict = dict()
    for r in res:
        repositories_dict[str(r.id)] = (r.id, r.name, r.description, r.count)
    print(repositories_dict)
    del res


# Serve static content
@app.route(base_url + '/')
def root():
    return app.send_static_file('index.html')


# API L01
@app.route(base_url + '/api/tumor_types/')
def get_tumor_types():
    result = [{"name": x[0] + " - " + x[1],
               "identifier": x[0],
               "mutation_count": x[2],}
              for x in sorted(tumor_type_dict.values())
              ]
    return json.dumps(result)


# API L02
@app.route(base_url + '/api/repository/')
def get_repository():
    repositories = [{"identifier": id,
                     "name": name,
                     "description": description,
                     "count": count,
                     }
                    for identifier, (id, name, description, count) in
                    sorted(repositories_dict.items(), key=lambda x: x[1][1])  # sort by name
                    ]

    # list(map(lambda x: {"identifier": x.repository_id,
    #                       "name": x.name,
    #                       "description": x.description},
    #            res))
    return json.dumps(repositories)


# API R01
@app.route(base_url + '/api/distance/', methods=['POST'])
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
    # if repoId and

    try:
        maxDistance = int(maxDistance)
    except ValueError:
        abort(400, 'max distance integer')
    error_regions = []
    if not repoId:
        regions, error_regions = parse_input_regions(regions)

    # Generate a jobID
    global job_counter
    job_counter = job_counter + 1
    if job_counter >= 100000:
        job_counter = 1
    jobID = str(uuid.uuid1()).replace('-', '_') + "_" + str(job_counter)
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

            #if not repoId:
            #    table_name = "t_" + jobID
            #    logger.debug(f"{jobID} -> {table_name}")

            #    temp_table = create_upload_table(session, table_name, regions)
            #else:
            #    table_name = repoId
            #    temp_table = create_upload_table(session, table_name, create=False, upload=False)

            #MutationTable = create_upload_table(session, "mutation_trinucleotide", create=False, upload=False)
            RegionTable = create_upload_table(session, "ctcf_h1", create=False, upload=False)
            query = session \
                .query(MutationGroup.tumor_type_id,
                       MutationGroup.pos - RegionTable.c.pos,
                       MutationGroup.mutation_code_id,
                       func.sum(MutationGroup.mutation_count)) \
                .join(RegionTable,
                      (MutationGroup.chrom == RegionTable.c.chrom)  &
                      between(MutationGroup.pos, RegionTable.c.pos - maxDistance, RegionTable.c.pos + maxDistance)) \
                .group_by(MutationGroup.tumor_type_id,
                          MutationGroup.pos - RegionTable.c.pos,
                          MutationGroup.mutation_code_id)

            query
            if tumorType:
                query = query.filter(MutationGrouped.tumor_type_id == tumor_type_reverse_dict[tumorType])



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
            logger.error("Async error", e)
            raise e

    executor.submit(async_function)
    # async_function()
    ### End of asynchronous computation

    print(jobID)
    print(repositories_dict)
    print(repositories_dict[repoId])

    return json.dumps(
        {**{"jobID": jobID, 'correct_region_size': len(regions) if not repoId else repositories_dict[repoId][3]},
         **({"error": error_regions} if error_regions else {})}
    )


# API R01r
@app.route(base_url + '/api/distance/<string:jobID>', methods=['GET'])
def get_distances_r(jobID):
    # print(jobID)
    return get_job_result(jobID)



# API R02
@app.route(base_url + '/api/trinucleotide/', methods=['POST'])
def get_trinucleotide():
    repoId = request.form.get('repoId')
    logger.debug(f"repoId: {repoId}")

    regions = request.form.get('regions')
    if not regions:
        logger.debug(f"regions: {regions}")

    tumorType = request.form.get('tumorType')
    logger.debug(f"tumorType: {tumorType}")

    if not (repoId or regions):
        abort(400)

    error_regions = []
    if not repoId:
        regions, error_regions = parse_input_regions(regions)
        #todo: cambia

    # Generate a jobID
    global job_counter
    job_counter = job_counter + 1
    if job_counter >= 100000:
        job_counter = 1
    jobID = str(uuid.uuid1()).replace('-', '_') + "_" + str(job_counter)
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

            exists = db.session.query(db.session.query(TrinucleotideCache).filter_by(file_id=repositories_dict[repoId][0]).exists()).scalar()

            if exists:
                mutations = db.session.query( TrinucleotideCache.tumor_type_id, TrinucleotideCache.trinucleotide_id, TrinucleotideCache.count).filter_by(file_id=repositories_dict[repoId][0])
            else:

                if DEBUG_MODE:
                    mutations = spark_intersect(t_mutation_trinucleotide_test.name, "full_"+repositories_dict[repoId][1] , DB_CONF, lambda r: [r["tumor_type_id"],r["trinucleotide_id_r"], r["count"]], groupby=["tumor_type_id", "trinucleotide_id_r"], )
                else:
                    mutations = spark_intersect(t_mutation_trinucleotide.name, "full_"+repositories_dict[repoId][1] , DB_CONF, lambda r: [r["tumor_type_id"],r["trinucleotide_id_r"], r["count"]], groupby=["tumor_type_id", "trinucleotide_id_r"])

                    values = list(map(lambda m:  TrinucleotideCache(file_id=repositories_dict[repoId][0], tumor_type_id=m[0], trinucleotide_id=m[1], count=m[2]), mutations))
                    session.add_all(values)
                    session.commit()
                    session.close()


            result  = defaultdict(dict)
            mutations = list(map(lambda x: [tumor_type_dict[x[0]][0],  trinucleotides_dict[x[1]][0], x[2]], mutations))

            for m in mutations:
                result[m[0]][m[1]] = {"trinucleotide":m[1], "mutation":m[1][2:-2], "count" : m[2]}

            update_job(jobID, result)
            logger.info('JOB DONE: ' + jobID)
        except Exception as e:
            unregister_job(jobID)
            logger.error("Async error", e)
            raise e

    executor.submit(async_function)

    return json.dumps(
        {**{"jobID": jobID, 'correct_region_size': len(regions) if not repoId else repositories_dict[repoId][3]},
         **({"error": error_regions} if error_regions else {})}
    )

# API R02r
@app.route(base_url + '/api/trinucleotide/<string:jobID>', methods=['GET'])
def get_trinucleotide_r(jobID):
    # print(jobID)
    return get_job_result(jobID)
# API R03
@app.route(base_url + '/api/donors/', methods=['POST'])
def get_uc5():
    repoId = request.form.get('repoId')
    logger.debug(f"repoId: {repoId}")

    regions = request.form.get('regions')
    if not regions:
        logger.debug(f"regions: {regions}")

    tumorType = request.form.get('tumorType')
    logger.debug(f"tumorType: {tumorType}")

    if not (repoId or regions):
        abort(400)

    error_regions = []
    if not repoId:
        regions, error_regions = parse_input_regions(regions)
        #todo: cambia

    # Generate a jobID
    global job_counter
    job_counter = job_counter + 1
    if job_counter >= 100000:
        job_counter = 1
    jobID = str(uuid.uuid1()).replace('-', '_') + "_" + str(job_counter)
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

            exists=False
            exists = db.session.query(db.session.query(DonorsCache).filter_by(file_id=repositories_dict[repoId][0]).exists()).scalar()
            print("exists: "+str(exists))

            if exists:
                mutations = db.session.query( DonorsCache.tumor_type_id, DonorsCache.mutation_id,  DonorsCache.donor_id, DonorsCache.count).filter_by(file_id=repositories_dict[repoId][0])
            else:

                if DEBUG_MODE:
                    mutations = spark_intersect(t_mutation_trinucleotide_test.name, "full_"+repositories_dict[repoId][1] , DB_CONF, lambda r: [r["tumor_type_id"],r["mutation_code_id"], r["donor_id"], r["count"]], groupby=["tumor_type_id", "mutation_code_id", "donor_id"])
                else:
                    mutations = spark_intersect(t_mutation_trinucleotide.name, "full_"+repositories_dict[repoId][1] , DB_CONF, lambda r: [r["tumor_type_id"], r["mutation_code_id"], r["donor_id"], r["count"]], groupby=["tumor_type_id", "mutation_code_id", "donor_id"])

                    values = list(map(lambda m:  DonorsCache(file_id=repositories_dict[repoId][0], tumor_type_id=m[0], mutation_id=m[1], donor_id=m[2], count=m[3]), mutations))
                    session.add_all(values)
                    session.commit()
                    session.close()


            result  = defaultdict(list)
            mutations = list(map(lambda x: [tumor_type_dict[x[0]][0],  mutation_code_r_dict[x[1]], x[2], x[3]], mutations))

            for m in mutations:
                result[m[0]].append({"mutation":m[1], "donor_id":m[2], "count" : m[3]})

            update_job(jobID, result)
            logger.info('JOB DONE: ' + jobID)
        except Exception as e:
            unregister_job(jobID)
            logger.error("Async error", e)
            raise e

    executor.submit(async_function)

    return json.dumps(
        {**{"jobID": jobID, 'correct_region_size': len(regions) if not repoId else repositories_dict[repoId][3]},
         **({"error": error_regions} if error_regions else {})}
    )

# API R03r
@app.route(base_url + '/api/donors/<string:jobID>', methods=['GET'])
def get_uc5_r(jobID):
    # print(jobID)
    return get_job_result(jobID)


# API R04
@app.route(base_url + '/api/signatures/', methods=['POST'])
def get_uc6():
    repoId = request.form.get('repoId')
    logger.debug(f"repoId: {repoId}")

    regions = request.form.get('regions')
    if not regions:
        logger.debug(f"regions: {regions}")

    tumorType = request.form.get('tumorType')
    logger.debug(f"tumorType: {tumorType}")

    if not (repoId or regions):
        abort(400)

    error_regions = []
    if not repoId:
        regions, error_regions = parse_input_regions(regions)
        #todo: cambia

    # Generate a jobID
    global job_counter
    job_counter = job_counter + 1
    if job_counter >= 100000:
        job_counter = 1
    jobID = str(uuid.uuid1()).replace('-', '_') + "_" + str(job_counter)
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

            exists=False
            exists = db.session.query(db.session.query(SignaturesCache).filter_by(file_id=repositories_dict[repoId][0]).exists()).scalar()
            print("exists: "+str(exists))

            if exists:
                mutations = db.session.query( SignaturesCache.tumor_type_id, SignaturesCache.donor_id, SignaturesCache.trinucleotide_id_r, SignaturesCache.count).filter_by(file_id=repositories_dict[repoId][0])
            else:

                if DEBUG_MODE:
                    mutations = spark_intersect(t_mutation_trinucleotide_test.name, "full_"+repositories_dict[repoId][1] , DB_CONF, lambda r: [r["tumor_type_id"], r["donor_id"], r["trinucleotide_id_r"], r["count"]], groupby=["tumor_type_id",  "donor_id", "trinucleotide_id_r"])
                else:
                    mutations = spark_intersect(t_mutation_trinucleotide.name, "full_"+repositories_dict[repoId][1] , DB_CONF, lambda r: [r["tumor_type_id"], r["donor_id"], r["trinucleotide_id_r"], r["count"]], groupby=["tumor_type_id",  "donor_id", "trinucleotide_id_r"])

                    values = list(map(lambda m:  SignaturesCache(file_id=repositories_dict[repoId][0], tumor_type_id=m[0], donor_id=m[1], trinucleotide_id_r=m[2], count=m[3]), mutations))
                    session.add_all(values)
                    session.commit()
                    session.close()


            result  = defaultdict(list)
            mutations = list(map(lambda x: [tumor_type_dict[x[0]][0],  x[1], trinucleotides_dict[x[2]][0], x[3]], mutations))

            for m in mutations:
                result[m[0]].append([ m[1], m[2],  m[3]])

            def toDataframe(data):

                columns_str = "A[C>A]A A[C>A]C	A[C>A]G	A[C>A]T	C[C>A]A	C[C>A]C	C[C>A]G	C[C>A]T	G[C>A]A	G[C>A]C	G[C>A]G	G[C>A]T	T[C>A]A	T[C>A]C	T[C>A]G	T[C>A]T	A[C>G]A	A[C>G]C	A[C>G]G	A[C>G]T	C[C>G]A	C[C>G]C	C[C>G]G	C[C>G]T	G[C>G]A	G[C>G]C	G[C>G]G	G[C>G]T	T[C>G]A	T[C>G]C	T[C>G]G	T[C>G]T	A[C>T]A	A[C>T]C	A[C>T]G	A[C>T]T	C[C>T]A	C[C>T]C	C[C>T]G	C[C>T]T	G[C>T]A	G[C>T]C	G[C>T]G	G[C>T]T	T[C>T]A	T[C>T]C	T[C>T]G	T[C>T]T	A[T>A]A	A[T>A]C	A[T>A]G	A[T>A]T	C[T>A]A	C[T>A]C	C[T>A]G	C[T>A]T	G[T>A]A	G[T>A]C	G[T>A]G	G[T>A]T	T[T>A]A	T[T>A]C	T[T>A]G	T[T>A]T	A[T>C]A	A[T>C]C	A[T>C]G	A[T>C]T	C[T>C]A	C[T>C]C	C[T>C]G	C[T>C]T	G[T>C]A	G[T>C]C	G[T>C]G	G[T>C]T	T[T>C]A	T[T>C]C	T[T>C]G	T[T>C]T	A[T>G]A	A[T>G]C	A[T>G]G	A[T>G]T	C[T>G]A	C[T>G]C	C[T>G]G	C[T>G]T	G[T>G]A	G[T>G]C	G[T>G]G	G[T>G]T	T[T>G]A	T[T>G]C	T[T>G]G	T[T>G]T"
                columns = columns_str.split()

                df = pd.DataFrame(data, columns=["donor_id", "trinucleotide_id_t", "count"])

                reshaped = df.pivot("donor_id", "trinucleotide_id_t", "count")

                for col in columns:
                    if col not in reshaped.columns:
                        reshaped[col] = 0

                result = reshaped.fillna(0)

                print(result[columns])
                return result[columns]

            final_results = {}

            print(result.keys())
            for tumor in result.keys():
                print("for tumor: "+tumor)
                table_donors = toDataframe(result[tumor])
                with_donors =  get_refitting(table_donors)
                num_donors = with_donors.shape(0)
                final_results[tumor] = (with_donors.sum()/num_donors).values.tolist()


            print(final_results)

            update_job(jobID, final_results)
            logger.info('JOB DONE: ' + jobID)
        except Exception as e:
            unregister_job(jobID)
            logger.error("Async error", e)
            raise e

    executor.submit(async_function)

    return json.dumps(
        {**{"jobID": jobID, 'correct_region_size': len(regions) if not repoId else repositories_dict[repoId][3]},
         **({"error": error_regions} if error_regions else {})}
    )



# API R04r
@app.route(base_url + '/api/signatures/<string:jobID>', methods=['GET'])
def get_uc6_r(jobID):
    return get_job_result(jobID)


# API T01
@app.route(base_url + '/api/t01/', methods=['POST'])
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
@app.route(base_url + '/api/t01/<string:jobID>', methods=['GET'])
def get_test1_r(jobID):
    return get_job_result(jobID)


# API T02
@app.route(base_url + '/api/t02/', methods=['POST'])
def get_test2():
    observed = request.get_json()['observed']
    expected = request.get_json()['expected']

    print(observed)
    print(expected)
    # observed = [0,0,0,1,2,3]
    # expected = [1,0,1,3,2,1]

    pi = ks_2samp(observed, expected, alternative='two-sided', mode='auto')[1]
    # pi = fisher_exact(observed, f_exp=expected)[1]

    ### Asynchronous computation
    # trans_arr = json.loads(mutations)  # parse mutations array
    # update_job(jobID, {"pvalue": 0.1})

    return json.dumps({"pvalue": pi})


# API T02r
@app.route(base_url + '/api/t02/<string:jobID>', methods=['GET'])
def get_test2_r(jobID):
    return get_job_result(jobID)


# API T03
@app.route(base_url + '/api/t03/', methods=['POST'])
def get_test3():
    observed = request.get_json()['observed']
    expected = request.get_json()['expected']

    print(observed)
    print(expected)
    # observed = [0,0,0,1,2,3]
    # expected = [1,0,1,3,2,1]

    pi = ks_2samp(observed, expected, alternative='two-sided', mode='auto')[1]
    # pi = fisher_exact(observed, f_exp=expected)[1]

    ### Asynchronous computation
    # trans_arr = json.loads(mutations)  # parse mutations array
    # update_job(jobID, {"pvalue": 0.1})

    return json.dumps({"pvalue": pi})


# API T03r
@app.route(base_url + '/api/t03/<string:jobID>', methods=['GET'])
def get_test3_r(jobID):
    return get_job_result(jobID)


if __name__ == '__main__':
    app.run()
