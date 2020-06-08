from flask import json, request, abort

from api import  DEBUG_MODE, trinucleotides_dict, tumor_type_dict, executor, mutation_code_r_dict, RESULTS_CACHE, tumor_type_reverse_dict

from api.jobs import register_job, update_job, unregister_job
from api.model.models import *

from api.trinucleotide import intersect_and_group


def get_uc5(logger):

    # Get Params
    file_name = request.form.get('file_name')
    tumor_type = request.form.get('tumorType')
    filter_json = request.form.get('filter')
    trinucleotide = request.form.get('trinucleotide') == "true"

    logger.debug(f"tumor_type: {tumor_type}")
    logger.debug(f"file_name: {file_name}")
    logger.debug(f"filter: {filter_json}")
    logger.debug(f"trinucleotide: {str(trinucleotide)}")

    if not file_name:
        abort(400)

    CACHE_ID = "DONORS#" + file_name + "#" + str(tumor_type) + "#" +str(trinucleotide)

    jobID = register_job()

    def async_function():
        try:
            if CACHE_ID in RESULTS_CACHE:
                update_job(jobID, RESULTS_CACHE[CACHE_ID])
                return

            mut_id = "trinucleotide_id_r" if trinucleotide else "mutation_code_id"
            mutation_table_name = t_mutation_trinucleotide_test.name if DEBUG_MODE else t_mutation_trinucleotide.name

            # Get Intersections, grouped
            mutations = intersect_and_group(mutation_table_name,
                                            file_name,
                                            ["tumor_type_id", mut_id, "donor_id"] ,
                                            tumor_type=tumor_type,
                                            filter_json=filter_json)
            result  = {}

            def getMutationString(x):
                    return trinucleotides_dict[x[1]][0] if trinucleotide else mutation_code_r_dict[x[1]]

            mutations = list(map(lambda x: [tumor_type_dict[x[0]][0], getMutationString(x), x[2], x[3]], mutations))

            for m in mutations:
                if m[0] not in result:
                    result[m[0]] = {"data": [], "trinucleotide": trinucleotide}

                result[m[0]]["data"].append({"mutation": m[1], "donor_id": int(m[2]), "count": int(m[3])})

            if not filter:
                RESULTS_CACHE[CACHE_ID] = result

            update_job(jobID, result)

        except Exception as e:
            unregister_job(jobID)
            logger.error("Async error", e)
            raise e

    executor.submit(async_function)

    return json.dumps(
        {"jobID": jobID}
    )