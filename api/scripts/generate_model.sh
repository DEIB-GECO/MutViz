#!/usr/bin/env bash


TABLES="mutation,mutation_code,mutation_group,mutation_group_pre,repository,tumor_type"

postgres_url="localhost"
postgres_user="mutviz"
postgres_pw="stefanoceri"
postgres_db="mutviz"

flask-sqlacodegen --flask --schema "public" --tables $TABLES --outfile model/models.py postgresql+psycopg2://$postgres_user:$postgres_pw@$postgres_url/$postgres_db