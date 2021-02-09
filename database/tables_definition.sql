create table tumor_type
(
    tumor_type_id  smallint not null constraint tumor_type_pkey primary key,
    tumor_type     varchar(8) not null constraint tumor_type_tumor_type_key unique,
    description    varchar,
    mutation_count integer,
    attributes     varchar,
    donor_count    integer,
    wgs            boolean,
    wxs            boolean
);


create table user_file
(
    id          smallserial           not null constraint user_file_pk primary key,
    name        varchar(100),
    description text,
    count       integer, /* number of regions */
    preloaded   boolean default false not null, /* is part of the repository? */
    expiration  date,
    expired     boolean default false not null,
    avg_length  double precision,
    max_length  double precision
);

create table mutation_code
(
    mutation_code_id smallint not null
        constraint mutation_code_r_pkey
            primary key,
    transition       boolean,
    mutation         varchar(4),
    from_allele      "char",
    to_allele        "char",
    mutation_r       varchar(4)
);

create table trinucleotide_encoded
(
    id          smallserial not null constraint trinucleotide_encoded_pkey primary key,
    mutation    varchar(7)  not null,
    triplet     varchar(3)  not null,
    from_allele char        not null, 
    to_allele   char        not null
);


create table mutation_source
(
    donor_id               integer  not null,
    project_code           text     not null,
    chrom                  smallint not null,
    position               integer  not null,
    from_allele            char     not null,
    to_allele              char     not null,
    base_calling_algorithm text,
    tumor_type_id          smallint,
    mutation_code_id       smallint, /* references mutation_code.mutation_code_id */
    id                     serial   not null constraint mutation_source_pkey primary key,
    trinucleotide_id_r     smallint, /* references trinucleotide_encoded.id */
    donor_id_string        text,
    triplet                text
);

create table mutation_group
(
    tumor_type_id    smallint not null constraint new_mutation_group_tumor_type_id_fkey references tumor_type,
    chrom            smallint not null,
    pos              bigint   not null,
    mutation_code_id smallint not null
        constraint new_mutation_group_mutation_code_id_fkey
            references mutation_code,
    mutation_count   integer,
    constraint new_mutation_group_pkey
        primary key (pos, chrom, tumor_type_id, mutation_code_id)
);



create table mutation_trinucleotide
(
    donor_id           integer  not null,
    tumor_type_id      smallint not null,
    chrom              smallint not null,
    position           integer  not null,
    mutation_code_id   smallint not null
        constraint mutation_trinucleotide_mutation_code_mutation_code_id_fk
            references mutation_code
        constraint mutation_trinucleotide_trinucleotide_encoded_id_fk
            references trinucleotide_encoded,
    trinucleotide_id_r smallint not null
);

create table distance_cache
(
    file_id          integer not null
        constraint distance_cache_user_file_id_fk
            references user_file
            on delete cascade,
    tumor_type_id    integer not null,
    distance         integer not null,
    mutation_code_id integer not null,
    count            integer not null,
    constraint distance_cache_pk
        primary key (file_id, tumor_type_id, mutation_code_id, distance)
);

create table mutation_trinucleotide_cache
(
    file_id            smallint not null
        constraint mutation_trinucleotide_cache_user_file_id_fk
            references user_file
            on delete cascade,
    donor_id           integer  not null,
    tumor_type_id      smallint not null,
    chrom              smallint not null,
    position           integer  not null,
    mutation_code_id   smallint not null,
    trinucleotide_id_r smallint not null
);

create table clinical_data
(
    donor_id                             integer,
    project_code                         text,
    donor_sex                            text,
    donor_vital_status                   text,
    donor_age_at_diagnosis               text,
    donor_tumour_stage_at_diagnosis      text,
    prior_malignancy                     text,
    cancer_history_first_degree_relative text,
    exposure_type                        text,
    exposure_intensity                   text,
    tobacco_smoking_history_indicator    text,
    tobacco_smoking_intensity            text,
    alcohol_history                      text,
    alcohol_history_intensity            text,
    first_therapy_type                   text,
    first_therapy_duration               numeric,
    first_therapy_response               text,
    donor_survival_time                  text,
    cancer_type_prior_malignancy         text,
    tumor_type_id_wgs                    smallint,
    tumor_type_id_wxs                    smallint,
    id                                   serial not null
        constraint clinical_data_new_pk
            primary key
);

create index mutation_trinucleotide_cache_file_id_index
    on mutation_trinucleotide_cache (file_id);

create index mutation_trinucleotide_tumor_type_id_chrom_position_donor_id_tr
    on mutation_trinucleotide (tumor_type_id, chrom, position, donor_id, trinucleotide_id_r, mutation_code_id);

create index new_mut_code
    on mutation_group (mutation_code_id);

create index new_mut_tum_type
    on mutation_group (tumor_type_id);

create index mutation_source_project_code_donor_id_string_tumor_type_id_inde
    on mutation_source (project_code, donor_id_string, tumor_type_id);

create index msti
    on mutation_source (project_code, donor_id_string, tumor_type_id);

create unique index user_file_name_uindex
    on user_file (name);