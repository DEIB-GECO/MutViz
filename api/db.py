
DB_CONF = {
    "postgres_user":"mutviz",
    "postgres_pw":"stefanoceri",
    "postgres_db":"mutviz",
    "postgres_host": "localhost",
    "postgres_port": "5432"
}

# DB_CONF = {
#     "postgres_url":"localhost:5433",
#     "postgres_user":"gulino",
#     "postgres_pw":"stefanoceri",
#     "postgres_db":"mutviz"
# }



def get_db_uri():
    #postgres_url = get_env_variable("POSTGRES_URL")
    #postgres_user = get_env_variable("POSTGRES_USER")
    #postgres_pw = get_env_variable("POSTGRES_PW")
    #postgres_db = get_env_variable("POSTGRES_DB")
    url = DB_CONF["postgres_host"]+":"+DB_CONF["postgres_port"]
    return 'postgresql+psycopg2://{user}:{pw}@{url}/{db}'.format(user=DB_CONF["postgres_user"],
                                                                 pw=DB_CONF["postgres_pw"],
                                                                 url=url,
                                                                 db=DB_CONF["postgres_db"])