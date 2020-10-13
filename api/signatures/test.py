from functools import reduce

import pandas as pd
import dask.dataframe as ddf
import numpy as np


df = pd.DataFrame(np.random.randint(0,100,size=(100, 4)), columns=list('ABCD'))

print(df)

ciao = 0
def iteration(row):
    print(row.shape)
    return ({"ciao":1}, 1)

def reduction(x,y):
    from collections import Counter
    A = Counter(x[0])
    B = Counter(y[0])
    return (A+B,x[1]+y[1])


df_dask = ddf.from_pandas(df, npartitions=10)  # where the number of partitions is the number of cores you want to use
res = df_dask.map_partitions(lambda x: iteration(x), meta=('str')).compute(scheduler='multiprocessing')

reduced = reduce((lambda x, y: reduction(x,y)), res)

codon_freq = dict(reduced[0])
tot = reduced[1]
