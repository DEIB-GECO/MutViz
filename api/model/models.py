# coding: utf-8
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()


class MutationCode(db.Model):
    __tablename__ = 'mutation_codes'
    __table_args__ = {'schema': 'public'}

    transition = db.Column(db.Boolean)
    mutation = db.Column(db.String(4))
    code = db.Column(db.SmallInteger, primary_key=True)


class Mutation(db.Model):
    __tablename__ = 'mutations'
    __table_args__ = (
        db.Index('index', 'chrom', 'pos', 'tumor_type'),
        {'schema': 'public'}
    )

    tumor_type = db.Column(db.String(10), primary_key=True, nullable=False)
    donor_id = db.Column(db.String(32), primary_key=True, nullable=False)
    chrom = db.Column(db.SmallInteger, primary_key=True, nullable=False)
    pos = db.Column(db.BigInteger, primary_key=True, nullable=False)
    mutation_code = db.Column(db.ForeignKey('public.mutation_codes.code'), nullable=False)

    mutation_code1 = db.relationship('MutationCode', primaryjoin='Mutation.mutation_code == MutationCode.code', backref='mutations')
