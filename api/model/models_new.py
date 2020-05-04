# coding: utf-8
from sqlalchemy import Boolean, Column, ForeignKey, Integer, SmallInteger, String, Table
from sqlalchemy.schema import FetchedValue
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()



class MutationCode(db.Model):
    __tablename__ = 'mutation_code'

    mutation_code_id = db.Column(db.SmallInteger, primary_key=True)
    transition = db.Column(db.Boolean)
    mutation = db.Column(db.String(4))
    from_allele = db.Column(db.String)
    to_allele = db.Column(db.String)



t_mutation_trinucleotide = db.Table(
    'mutation_trinucleotide',
    db.Column('donor_id', db.Integer, nullable=False),
    db.Column('tumor_type_id', db.SmallInteger, nullable=False),
    db.Column('chrom', db.SmallInteger, nullable=False),
    db.Column('position', db.Integer, nullable=False),
    db.Column('mutation_code_id', db.ForeignKey(u'mutation_code.mutation_code_id'), db.ForeignKey(u'trinucleotide_encoded.id'), nullable=False),
    db.Column('trinucleotide_id_r', db.SmallInteger, nullable=False)
)



class TrinucleotideEncoded(db.Model):
    __tablename__ = 'trinucleotide_encoded'

    id = db.Column(db.SmallInteger, primary_key=True, server_default=db.FetchedValue())
    mutation = db.Column(db.String(7), nullable=False)
    triplet = db.Column(db.String(3), nullable=False)
    from_allele = db.Column(db.String(1), nullable=False)
    to_allele = db.Column(db.String(1), nullable=False)
