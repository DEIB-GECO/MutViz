import pandas as pd
import numpy as np

df = pd.read_csv("clinical_data_mutviz.tsv", sep="\t")

tumor_types = set(df["project_code"])

exclude = ["icgc_donor_id", "project_code", "project_code.1"]

rows = []
for id in tumor_types:
    row = [id, None]
    cur = df[df["project_code"]==id]
    #cur = cur.replace("unknown", np.nan)
    non_null_columns = list(cur.columns[~cur.isnull().all() ])
    non_null_columns = filter(lambda x: x not in exclude, non_null_columns)
    row[1] = ",".join(non_null_columns)
    rows.append(row)

result = pd.DataFrame(rows)
result.to_csv("important.csv", index=None, header=["tumor_type_id", "attributes"])
print(result)


