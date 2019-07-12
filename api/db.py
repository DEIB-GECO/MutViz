def get_db_uri():
    #postgres_url = get_env_variable("POSTGRES_URL")
    #postgres_user = get_env_variable("POSTGRES_USER")
    #postgres_pw = get_env_variable("POSTGRES_PW")
    #postgres_db = get_env_variable("POSTGRES_DB")
    postgres_url = "localhost"
    postgres_user = "mutviz"
    postgres_pw = "stefanoceri"
    postgres_db = "mutviz"
    return 'postgresql+psycopg2://{user}:{pw}@{url}/{db}'.format(user=postgres_user,
                                                                 pw=postgres_pw,
                                                                 url=postgres_url,
                                                                 db=postgres_db)