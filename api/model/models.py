# coding: utf-8
from sqlalchemy import BigInteger, Boolean, Column, Integer, SmallInteger, String
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy(session_options={"autoflush": False,'autocommit':False,'expire_on_commit':False,})

class MutationGroup(db.Model):
    __tablename__ = 'mutation_group'

    tumor_type_id = db.Column(db.SmallInteger, primary_key=True, nullable=False)
    chrom = db.Column(db.SmallInteger, primary_key=True, nullable=False)
    pos = db.Column(db.BigInteger, primary_key=True, nullable=False)
    mutation_code_id = db.Column(db.SmallInteger, primary_key=True, nullable=False)
    mutation_count = db.Column(db.Integer)


class MutationCode(db.Model):
    __tablename__ = 'mutation_code'

    mutation_code_id = db.Column(db.SmallInteger, primary_key=True)
    transition = db.Column(db.Boolean)
    mutation = db.Column(db.String(4))
    from_allele = db.Column(db.String)
    to_allele = db.Column(db.String)
    mutation_r = db.Column(db.String(4))

t_mutation_trinucleotide = db.Table(
    'mutation_trinucleotide',
    db.Column('donor_id', db.Integer, nullable=False),
    db.Column('tumor_type_id', db.SmallInteger, nullable=False, index=True),
    db.Column('chrom', db.SmallInteger, nullable=False, index=True),
    db.Column('position', db.Integer, nullable=False),
    db.Column('mutation_code_id', db.ForeignKey(u'mutation_code.mutation_code_id'), db.ForeignKey(u'trinucleotide_encoded.id'), nullable=False),
    db.Column('trinucleotide_id_r', db.SmallInteger, nullable=False),
    db.Index('mutation_trinucleotide_chrom_position_index', 'chrom', 'position'),
    db.Index('mutation_trinucleotide_tumor_type_id_chrom_position_index', 'tumor_type_id', 'chrom', 'position')
)

t_mutation_trinucleotide_test = db.Table(
    'mutation_trinucleotide_test',
    db.Column('donor_id', db.Integer),
    db.Column('tumor_type_id', db.SmallInteger),
    db.Column('chrom', db.SmallInteger),
    db.Column('position', db.Integer),
    db.Column('mutation_code_id', db.SmallInteger),
    db.Column('trinucleotide_id_r', db.SmallInteger)
)


class TrinucleotideEncoded(db.Model):
    __tablename__ = 'trinucleotide_encoded'

    id = db.Column(db.SmallInteger, primary_key=True, server_default=db.FetchedValue())
    mutation = db.Column(db.String(7), nullable=False)
    triplet = db.Column(db.String(3), nullable=False)
    from_allele = db.Column(db.String(1), nullable=False)
    to_allele = db.Column(db.String(1), nullable=False)

class TumorType(db.Model):
    __tablename__ = 'tumor_type'

    tumor_type_id = db.Column(db.SmallInteger, primary_key=True)
    tumor_type = db.Column(db.String(8), nullable=False, unique=True)
    description = db.Column(db.String)
    mutation_count = db.Column(db.Integer)
    attributes = db.Column(db.String)
    donor_count = db.Column(db.Integer)
    wgs = db.Column(db.Boolean)
    wxs = db.Column(db.Boolean)

class UserFile(db.Model):
    __tablename__ = 'user_file'

    id = db.Column(db.SmallInteger, primary_key=True, server_default=db.FetchedValue())
    name = db.Column(db.String(100), unique=True)
    description = db.Column(db.Text)
    count = db.Column(db.Integer)
    preloaded = db.Column(db.Boolean, nullable=False, server_default=db.FetchedValue())
    expiration = db.Column(db.Date)
    expired = db.Column(db.Boolean, nullable=False, server_default=db.FetchedValue())
    avg_length = db.Column(db.Float(53))
    max_length = db.Column(db.Float(53))

class DistanceCache(db.Model):
    __tablename__ = 'distance_cache'

    file_id = db.Column(db.Integer, primary_key=True, nullable=False)
    tumor_type_id = db.Column(db.Integer, primary_key=True, nullable=False)
    distance = db.Column(db.Integer, primary_key=True, nullable=False)
    mutation_code_id = db.Column(db.Integer, primary_key=True, nullable=False)
    count = db.Column(db.Integer, nullable=False)

class ClinicalDatum(db.Model):
    __tablename__ = 'clinical_data'

    donor_id = db.Column(db.Integer)
    project_code = db.Column(db.Text)
    donor_sex = db.Column(db.Text)
    donor_vital_status = db.Column(db.Text)
    donor_age_at_diagnosis = db.Column(db.Text)
    donor_tumour_stage_at_diagnosis = db.Column(db.Text)
    prior_malignancy = db.Column(db.Text)
    cancer_history_first_degree_relative = db.Column(db.Text)
    exposure_type = db.Column(db.Text)
    exposure_intensity = db.Column(db.Text)
    tobacco_smoking_history_indicator = db.Column(db.Text)
    tobacco_smoking_intensity = db.Column(db.Text)
    alcohol_history = db.Column(db.Text)
    alcohol_history_intensity = db.Column(db.Text)
    first_therapy_type = db.Column(db.Text)
    first_therapy_duration = db.Column(db.Numeric)
    first_therapy_response = db.Column(db.Text)
    donor_survival_time = db.Column(db.Text)
    cancer_type_prior_malignancy = db.Column(db.Text)
    tumor_type_id_wgs = db.Column(db.SmallInteger)
    tumor_type_id_wxs = db.Column(db.SmallInteger)
    id = db.Column(db.Integer, primary_key=True, server_default=db.FetchedValue())

t_mutation_trinucleotide_cache = db.Table(
    'mutation_trinucleotide_cache',
    db.Column('file_id', db.ForeignKey(u'user_file.id', ondelete=u'CASCADE'), nullable=False),
    db.Column('donor_id', db.Integer, nullable=False),
    db.Column('tumor_type_id', db.SmallInteger, nullable=False),
    db.Column('chrom', db.SmallInteger, nullable=False),
    db.Column('position', db.Integer, nullable=False),
    db.Column('mutation_code_id', db.SmallInteger, nullable=False),
    db.Column('trinucleotide_id_r', db.SmallInteger, nullable=False)
)

