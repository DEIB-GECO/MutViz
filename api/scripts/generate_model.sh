#!/usr/bin/env bash


#TABLES="user_file,regions,mutation_trinucleotide_test,tumor_type,trinucleotide_encoded,mutation_code"
TABLES="mutation_trinucleotide_cache"

postgres_url="localhost:5432"
postgres_user="mutviz"
postgres_pw="stefanoceri"
postgres_db="mutviz"

flask-sqlacodegen  --flask --tables $TABLES --outfile model/models_new.py postgresql+psycopg2://$postgres_user:$postgres_pw@$postgres_url/$postgres_db