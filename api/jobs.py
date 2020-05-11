import time

from flask import json, abort

# job_id -> (TTL, result)
jobs = dict()


def ttl():
    return int(time.time()) + 3600


def get_job_result(job_id):
    try:
        update_ttl(job_id)
        job_value = jobs[job_id][1]

        if job_value!=None:
            return json.dumps({"ready": True, "result": job_value})
        else:
            return json.dumps({"ready": False})
    except KeyError:
        abort(404)


def register_job(job_id):
    update_job(job_id, None)


def unregister_job(job_id):
    del jobs[job_id]


def update_job(job_id, result):
    jobs[job_id] = (ttl(), result)


def update_ttl(job_id):
    jobs[job_id] = (ttl(), jobs[job_id][1])


def auto_delete():
    print("auto_delete is started")
    while True:
        global jobs
        now = int(time.time())
        print("auto_delete is active. now: ", now)
        jobs = dict([x for x in jobs.items() if x[1][0] > now])
        print("jobs:", [(x[0], x[1][0], bool(x[1][1])) for x in jobs.items()])
        time.sleep(1000)
