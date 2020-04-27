from operator import itemgetter
from pyspark import SQLContext
from pyspark.sql import SparkSession, DataFrameReader
import os
import sys
import time

def spark_intersect(mutation_table_name, regions_table_name, region_file_id, regions=None, jdbc_jar='postgresql-42.2.12.jar', groupby=None, useSQL=False):

    # SQL VS MINE: 1507 (25min), 3888 (1h,  no bins), 1101 (5 bins)


    numBins = int(os.getenv('MUTVIZ_NUM_BINS', 5))
    print("USING "+str(numBins)+" BINS.")
    start_time = time.time()

    os.environ["SPARK_HOME"] = "/var/lib/spark-2.4.5-bin-hadoop2.7"
    os.environ["PYSPARK_PYTHON"] = sys.executable
    os.environ["PYSPARK_DRIVER_PYTHON"] = sys.executable

    driver_class = "org.postgresql.Driver"

    spark = SparkSession.builder \
            .master("local")      \
            .appName("Word Count") \
            .config("spark.jars", jdbc_jar) \
            .config("spark.driver.memory", "50g") \
            .getOrCreate()

    sql_ctx = SQLContext(spark.sparkContext)
    sc = spark.sparkContext

    url = 'postgresql://localhost:5433/mutviz'
    properties = {'user': 'gulino', 'password': 'stefanoceri', 'driver': driver_class}
    mutations = DataFrameReader(sql_ctx).jdbc(
        url='jdbc:%s' % url, table=mutation_table_name, properties=properties
    )



    regions_df = DataFrameReader(sql_ctx).jdbc(
        url='jdbc:%s' % url, table=regions_table_name, properties=properties
    ).rdd.filter(lambda r: r["file_id"]==region_file_id).toDF()


    # new
    if useSQL :
        mutations.registerTempTable("mutations")
        regions_df.registerTempTable("regions")

        sql_res = spark.sql("SELECT m.tumor_type_id, m.trinucleotide_id_r, count(*) from mutations as m, regions as r WHERE m.chrom=r.chrom AND m.position >= r.start AND m.position <= r.stop GROUP BY m.tumor_type_id, m.trinucleotide_id_r")

        res = sql_res.rdd.map(lambda r: [r["tumor_type_id"], r["trinucleotide_id_r"], r["count(1)"]]).collect()
        print("Spark execution took %s seconds ---" % (time.time() - start_time))
    #print(sql_res.collect())

    else:

     regions = regions_df.collect()
     regions_broadcast = sc.broadcast( sorted(regions, key=itemgetter('start', 'stop')))

     partitioned = mutations.withColumn("bin", mutations["position"]%numBins).repartition("chrom", "bin").sortWithinPartitions("position")

     def partitionWork( p):

         matched = []
         localMutations = list(p)

         if localMutations:
             chrom=localMutations[0]["chrom"]
             #print("chrom "+str(chrom))

             localRegions = filter(lambda r : r['chrom']==chrom, regions_broadcast.value)

             if localRegions:
                 sorted_mutations = localMutations #sorted(localMutations, key=itemgetter('position'))
                 sorted_regions = sorted(localRegions, key=itemgetter('start', 'stop'))

                 cur_reg_idx = 0
                 cur_mut_idx = 0

                 while( cur_mut_idx < len(sorted_mutations)  and cur_reg_idx < len(sorted_regions) ):

                     cur_reg = sorted_regions[cur_reg_idx]
                     cur_mut = sorted_mutations[cur_mut_idx]

                     if cur_mut["position"] < cur_reg["start"]:
                         cur_mut_idx += 1
                     elif cur_mut["position"] <= cur_reg["stop"]:
                         matched.append(cur_mut)
                         cur_mut_idx += 1
                     else:
                         cur_reg_idx += 1

         return matched

     res = partitioned.rdd.mapPartitions(partitionWork)

    # Grouping
     if groupby:
         res = res.toDF().groupBy(groupby).count().rdd.map(lambda r: [r["tumor_type_id"],r["trinucleotide_id_r"], r["count"] ])

     res = res.collect()

    # print(partitioned)
    #
     print("Spark execution took %s seconds ---" % (time.time() - start_time))

    return res