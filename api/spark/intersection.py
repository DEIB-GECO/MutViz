from operator import itemgetter
from pyspark import SQLContext
from pyspark.sql import SparkSession, DataFrameReader
import os
import sys
import time
from collections import defaultdict

def spark_intersect(mutation_table_name, regions_table_name, DB_CONF, output_format, regions=None, jdbc_jar='postgresql-42.2.12.jar', groupby=None, useSQL=False, minCount=-1):

    # SQL VS MINE8: 388[1h] , 1507 (25min), 1018[bin=20], (1h,  no bins), 1101 (5 bins), 994 [100] - 952 [200] 916(ctcf) 941[41]
    # 590 ETS1
    #3h13 geco 4h37 genomic


    numPartitions = int(os.getenv('MUTVIZ_NUM_PARTITIONS', -1))
    memory = os.getenv('MUTVIZ_DRIVER_MEMORY', "50g")
    sparkDebug = os.getenv('MUTVIZ_SPARK_DEBUG', "false") == "true"
    print("USING "+str(numPartitions)+" PARTITIONS (-1:AUTO).")
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
    print("Using partitions: "+str(numPartitions))
    print("Debug enabled: " + str(sparkDebug))
    print("#############################")

    spark = SparkSession.builder \
        .master("local["+cores+"]") \
        .appName("Word Count") \
        .config("spark.jars", jdbc_jar) \
        .config("spark.driver.memory", memory) \
        .config("spark.driver.cores", cores) \
        .getOrCreate()

    sql_ctx = SQLContext(spark.sparkContext)
    sc = spark.sparkContext

    properties = {'user': DB_CONF["postgres_user"], 'password':DB_CONF["postgres_pw"], 'driver': driver_class}
    url = 'postgresql://'+DB_CONF["postgres_url"]+'/'+DB_CONF["postgres_db"]


    mutations = DataFrameReader(sql_ctx).jdbc(
        url='jdbc:%s' % url, table=mutation_table_name, properties=properties
    )



    regions_df = DataFrameReader(sql_ctx).jdbc(
        url='jdbc:%s' % url, table=regions_table_name, properties=properties
    )

    if sparkDebug:
        print("############ mutations ==> ", mutations.count())
        print("############ regions   ==>", regions_df.count())

    # new
    if useSQL :
        mutations.registerTempTable("mutations")
        regions_df.registerTempTable("regions")

        sql_res = spark.sql("SELECT m.tumor_type_id, m.trinucleotide_id_r, count(*) from mutations as m, regions as r WHERE m.chrom=r.chrom AND m.position >= r.pos_start AND m.position <= r.pos_stop GROUP BY m.tumor_type_id, m.trinucleotide_id_r")

        res = sql_res.rdd.map(lambda r: [r["tumor_type_id"], r["trinucleotide_id_r"], r["count(1)"]]).collect()
        print("Spark execution took %s seconds ---" % (time.time() - start_time))
    #print(sql_res.collect())

    else:

        regions = regions_df.collect()
        print("====> REGIONS COLLECTED AFTER (S) %s" % (time.time() - start_time))
        rb = defaultdict(list)
        for v in regions: rb[v["chrom"]].append(v)

        for c in rb:
            rb[c] = sorted(rb[c], key=itemgetter('pos_start', 'pos_stop'))

        print("====> REGIONS SORTED AFTER (S) %s" % (time.time() - start_time))
        regions_broadcast = sc.broadcast(rb)
        print("====> REGIONS BROADCAST AFTER (S) %s" % (time.time() - start_time))


        def partitionWork(p):

            matched = []

            chrom = p[0]
            localMutations = list(p[1])

            print("====> PROCESSING PARTITION AFTER (S)  %s" % (time.time() - start_time))

            if localMutations:

                localRegions = regions_broadcast.value[chrom]

                if localRegions:
                    sorted_mutations = sorted(localMutations, key=itemgetter('position'))
                    sorted_regions = localRegions

                    cur_reg_idx = 0
                    cur_mut_idx = 0

                    while( cur_mut_idx < len(sorted_mutations)  and cur_reg_idx < len(sorted_regions) ):

                        cur_reg = sorted_regions[cur_reg_idx]
                        cur_mut = sorted_mutations[cur_mut_idx]

                        if cur_mut["position"] < cur_reg["pos_start"]:
                            cur_mut_idx += 1
                        elif cur_mut["position"] <= cur_reg["pos_stop"]:
                            matched.append(cur_mut)
                            cur_mut_idx += 1
                        else:
                            cur_reg_idx += 1

            return matched


        if numPartitions > 0:
            res = mutations.rdd.groupBy(lambda e: e["chrom"],numPartitions=numPartitions).flatMap(partitionWork)
        else:
            res = mutations.rdd.groupBy(lambda e: e["chrom"]).flatMap(partitionWork)

        if sparkDebug:
            print("############ results ==> ", res.count())

        # Grouping
        #todo: if empty
        if groupby:
            if minCount==-1:
                res = res.toDF().groupBy(groupby).count().rdd.map(output_format)
            else:
                res_df = res.toDF().groupBy(groupby).count()
                res = res_df.filter(res_df["count"]>minCount).rdd.map(output_format)

            if sparkDebug:
                print("############ results after grouping ==> ", res.count())

    res = res.collect()

    print("Spark execution took %s seconds ---" % (time.time() - start_time))

    return res