# coding: utf-8
from sqlalchemy import BigInteger, Boolean, Column, Integer, SmallInteger, String
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy(session_options={"autoflush": False,'autocommit':False,'expire_on_commit':False,})


class Mutation(db.Model):
    __tablename__ = 'mutation'
    __table_args__ = (
        db.Index('mutation_pos_chrom_idx', 'pos', 'chrom'),
        db.Index('mutation_chrom_pos_tumor_type_idx', 'chrom', 'pos', 'tumor_type'),
        {'schema': 'public'}
    )

    tumor_type = db.Column(db.String(10), primary_key=True, nullable=False)
    donor_id = db.Column(db.String(32), primary_key=True, nullable=False)
    chrom = db.Column(db.SmallInteger, primary_key=True, nullable=False)
    pos = db.Column(db.BigInteger, primary_key=True, nullable=False)
    mutation_code_id = db.Column(db.SmallInteger, primary_key=True, nullable=False)


class MutationCode(db.Model):
    __tablename__ = 'mutation_code'

    mutation_code_id = db.Column(db.SmallInteger, primary_key=True)
    transition = db.Column(db.Boolean)
    mutation = db.Column(db.String(4))
    from_allele = db.Column(db.String)
    to_allele = db.Column(db.String)


class MutationGroup(db.Model):
    __tablename__ = 'mutation_group'

    tumor_type_id = db.Column(db.SmallInteger, primary_key=True, nullable=False)
    chrom = db.Column(db.SmallInteger, primary_key=True, nullable=False)
    pos = db.Column(db.BigInteger, primary_key=True, nullable=False)
    mutation_code_id = db.Column(db.SmallInteger, primary_key=True, nullable=False)
    mutation_count = db.Column(db.Integer)


class Repository(db.Model):
    __tablename__ = 'repository'

    repository_id = db.Column(db.String(20), primary_key=True)
    name = db.Column(db.String(50))
    description = db.Column(db.String(100))


class TumorType(db.Model):
    __tablename__ = 'tumor_type'

    tumor_type_id = db.Column(db.SmallInteger, primary_key=True)
    tumor_type = db.Column(db.String(8), nullable=False, unique=True)
    description = db.Column(db.String)
    mutation_count = db.Column(db.Integer)
