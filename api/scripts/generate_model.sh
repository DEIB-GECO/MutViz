#!/usr/bin/env bash


TABLES="mutations,mutation_codes"
POSTGRES_USER="mutviz"
POSTGRES_PW="stefanoceri"
POSTGRES_URL="127.0.0.1:5432"
POSTGRES_DB="mutviz"

flask-sqlacodegen --flask --schema "public" --tables $TABLES --outfile model/models.py postgresql+psycopg2://$POSTGRES_USER:$POSTGRES_PW@$POSTGRES_URL/$POSTGRES_DB