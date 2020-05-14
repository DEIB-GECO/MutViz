from operator import itemgetter
from pyspark import SQLContext
from pyspark.sql import SparkSession, DataFrameReader
import os
import sys
import time
import pandas as pd
from collections import defaultdict

def spark_intersect(regions, mutations):

    # SQL VS MINE8: 388[1h] , 1507 (25min), 1018[bin=20], (1h,  no bins), 1101 (5 bins), 994 [100] - 952 [200] 916(ctcf) 941[41]
    # 590 ETS1
    #3h13 geco 4h37 genomic


    numBins = int(os.getenv('MUTVIZ_NUM_BINS', 1))
    sparkDebug = os.getenv('MUTVIZ_SPARK_DEBUG', "true") == "true"
    memory = os.getenv('MUTVIZ_DRIVER_MEMORY', "50g")
    print("USING "+str(numBins)+" BINS.")
    start_time = time.time()

    os.environ["SPARK_HOME"] = os.getenv('MUTVIZ_SPARK_HOME', "/var/lib/spark-2.4.5-bin-hadoop2.7")
    os.environ["PYSPARK_PYTHON"] = sys.executable
    os.environ["PYSPARK_DRIVER_PYTHON"] = sys.executable

    driver_class = "org.postgresql.Driver"

    cores = os.getenv('MUTVIZ_CORES', "*")

    print("#### SPARK CONFIGURATION ####")
    print("SPARK HOME: " + os.getenv('SPARK_HOME'))
    print("Using cores: "+cores)
    print("Using memory: "+memory)
    print("Using bins: "+str(numBins))
    print("#############################")

    spark = SparkSession.builder \
        .master("local["+cores+"]") \
        .appName("Word Count") \
        .config("spark.driver.memory", memory) \
        .getOrCreate()

    sql_ctx = SQLContext(spark.sparkContext)
    sc = spark.sparkContext

    mutations = sql_ctx.createDataFrame(mutations)
    regions_df = sql_ctx.createDataFrame(regions)

    if sparkDebug:
        print("############ mutations ==> ", mutations.count())
        print("############ regions   ==>", regions_df.count())


    #regions = regions_df.collect()
    #rb = defaultdict(list)
    #for v in regions: rb[v["chrom"]].append(v)

    #for c in rb:
     #   rb[c] = sorted(rb[c], key=itemgetter('pos_start', 'pos_stop'))
    regions = regions_df.collect()
    regions = sorted(regions ,key=itemgetter('pos_start', 'pos_stop'))


    regions_broadcast = sc.broadcast(regions)

    # if numBins > 1:
    #     print("Real Binning")
    #     partitioned = mutations.withColumn("bin", (mutations["position"] % numBins).cast("string") + "-" + mutations[
    #         "chrom"].cast("string")).repartition("bin").sortWithinPartitions("position")
    # else:
    #     print("No Binning, just using chromosome parallelism.")
    #     partitioned = mutations.repartition("chrom").sortWithinPartitions("position")


    def partitionWork(p):

        localMutations = list(p)
        matched = []

        #print(list(filter(lambda x: x["position"] == 56785094, localMutations)))

        if localMutations:
            #print("chrom "+str(chrom))

            localRegions = regions_broadcast.value

            if localRegions:
                sorted_mutations = sorted(localMutations, key=itemgetter('position'))
                sorted_regions = localRegions
                #sorted_regions = sorted(localRegions, key=itemgetter('pos_start', 'pos_stop'))

                cur_reg_idx = 0
                cur_mut_idx = 0

                mutation_found = False
                mutation_idx = 0
                mutation = {}
                mutation_region_idx = 0
                mutation_region = {}
                region_found = False
                region_idx = 0
                region = {}
                region_mutation_idx = 0
                region_mutation = {}

                while( cur_mut_idx < len(sorted_mutations)  and cur_reg_idx < len(sorted_regions) ):

                    cur_reg = sorted_regions[cur_reg_idx]
                    cur_mut = sorted_mutations[cur_mut_idx]

                    if cur_mut["position"]==57610472:
                        mutation_found = True
                        mutation_idx = cur_mut_idx
                        mutation = cur_mut
                        mutation_region_idx = cur_reg_idx
                        mutation_region = cur_reg

                    if cur_reg["pos_stop"] == 57610478:
                        region_found = True
                        region_idx = cur_reg_idx
                        region = cur_reg
                        region_mutation_idx = cur_mut_idx
                        region_mutation = cur_mut

                    if region_found and mutation_found and (cur_reg["pos_stop"] == 57610478 or cur_mut["position"]==57610472):
                        print("Intersecting region ==> ", region_idx, ":", region, " -  ", region_mutation_idx, ":", region_mutation )
                        print("Mutation ==>", mutation_idx, ":", mutation, " -  ", mutation_region_idx, ":", mutation_region )


                    if cur_mut["position"] < cur_reg["pos_start"]:
                        cur_mut_idx += 1
                    elif cur_mut["position"] <= cur_reg["pos_stop"]:
                        if cur_reg["chrom"]==cur_mut["chrom"]:
                            matched.append(cur_mut)
                        else:
                            # look ahead
                            next_region_index =  cur_reg_idx + 1
                            while next_region_index < len(sorted_regions) and sorted_regions[next_region_index]["pos_start"] <= cur_mut["position"]:
                                if  sorted_regions[next_region_index]["chrom"]==cur_mut["chrom"] and sorted_regions[next_region_index]["pos_stop"]>=cur_mut["position"] :
                                    matched.append(cur_mut)
                                next_region_index = next_region_index + 1

                        cur_mut_idx += 1
                    else:
                        cur_reg_idx += 1

        return matched

    #res = partitioned.rdd.mapPartitions(partitionWork)

    #res = mutations.rdd.groupBy(lambda e: e["chrom"]).flatMap(partitionWork)
    res = mutations.rdd.mapPartitions(partitionWork)

    if sparkDebug:
        print("############ results ==> ", res.count())

    # Grouping
    #todo: if empty
    #if groupby:
    #    if minCount==-1:
    #        res = res.toDF().groupBy(groupby).count().rdd.map(output_format)
    #    else:
    #        res_df = res.toDF().groupBy(groupby).count()
    #        res = res_df.filter(res_df["count"]>minCount).rdd.map(output_format)

    res = res.collect()

    # print(partitioned)
    #
    print("Spark execution took %s seconds ---" % (time.time() - start_time))

    return res

folder = "/Users/andreagulino/Desktop/input/"
regions = pd.read_csv(folder+"ctcf_h1_test", sep="\t", names=["chrom", "pos_start", "pos_stop"])
mutations = pd.read_csv(folder+"mutations", sep=",",  names=["chrom", "position", "donor"]).drop("donor", axis=1)

print(mutations[mutations["position"]==56785094])

print(regions.head())
print(mutations.head())

res = spark_intersect(regions, mutations)
print(mutations.shape)
res_df = pd.DataFrame(map(lambda x: [x.chrom, x.position], res), columns=["chrom", "position"])
print(res_df)
print("RESULT SHAPE=>",res_df.shape)

missing = pd.concat([mutations,res_df]).drop_duplicates(keep=False)
print(missing)

