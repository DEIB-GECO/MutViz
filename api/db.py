
DB_CONF = {
    "postgres_url":"localhost:5433",
    "postgres_user":"gulino",
    "postgres_pw":"stefanoceri",
    "postgres_db":"mutviz"
}


def get_db_uri():
    #postgres_url = get_env_variable("POSTGRES_URL")
    #postgres_user = get_env_variable("POSTGRES_USER")
    #postgres_pw = get_env_variable("POSTGRES_PW")
    #postgres_db = get_env_variable("POSTGRES_DB")
    return 'postgresql+psycopg2://{user}:{pw}@{url}/{db}'.format(user=DB_CONF["postgres_user"],
                                                                 pw=DB_CONF["postgres_pw"],
                                                                 url=DB_CONF["postgres_url"],
                                                                 db=DB_CONF["postgres_db"])