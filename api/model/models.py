# coding: utf-8
from sqlalchemy import BigInteger, Boolean, Column, Index, SmallInteger, String, Table
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()


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
    __table_args__ = {'schema': 'public'}

    mutation_code_id = db.Column(db.SmallInteger, primary_key=True)
    transition = db.Column(db.Boolean)
    mutation = db.Column(db.String(4))
    from_allele = db.Column(db.String)
    to_allele = db.Column(db.String)


t_mutation_group = db.Table(
    'mutation_group',
    db.Column('tumor_type_id', db.SmallInteger),
    db.Column('chrom', db.SmallInteger),
    db.Column('pos', db.BigInteger),
    db.Column('mutation_code', db.SmallInteger),
    db.Index('mutation_group_chrom_pos_idx', 'chrom', 'pos'),
    schema='public'
)


class Repository(db.Model):
    __tablename__ = 'repository'
    __table_args__ = {'schema': 'public'}

    repository_id = db.Column(db.String(20), primary_key=True)
    name = db.Column(db.String(50))
    description = db.Column(db.String(100))


class TumorType(db.Model):
    __tablename__ = 'tumor_type'
    __table_args__ = {'schema': 'public'}

    tumor_type_id = db.Column(db.SmallInteger, primary_key=True)
    tumor_type = db.Column(db.String(4), unique=True)
