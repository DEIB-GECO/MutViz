from api import jobs, job_counter
import time
import threading

from flask import json, abort
import uuid

# job_id -> (TTL, result)
#from api import logger


def ttl():
    return int(time.time()) + 3600

def get_job_result(job_id, logger):
    try:

        update_ttl(job_id)
        job_value = jobs[job_id][1]

        if job_value!=None:
            return json.dumps({"ready": True, "result": job_value})
        else:
            return json.dumps({"ready": False})
    except KeyError:
        abort(404)

def generateJobId():
    jobID = str(uuid.uuid1()).replace('-', '_')
    return jobID

def register_job():
    job_id = generateJobId()
    update_job(job_id, None)
    #logger.debug(f"Job registered with ID: {job_id}")
    return job_id

def unregister_job(job_id):
    del jobs[job_id]

def update_job(job_id, result):
    if result!=None:
        print('JOB DONE: ' + job_id)

    jobs[job_id] = (ttl(), result)

def update_ttl(job_id):
    jobs[job_id] = (ttl(), jobs[job_id][1])

def auto_delete():
    print("auto_delete is started")
    while True:
        now = int(time.time())
        print("auto_delete is active. now: ", now)
        jobs = dict([x for x in jobs.items() if x[1][0] > now])
        print("jobs:", [(x[0], x[1][0], bool(x[1][1])) for x in jobs.items()])
        time.sleep(1000)
