# coding: utf-8
from sqlalchemy import BigInteger, Boolean, Column, ForeignKey, Index, Integer, SmallInteger, String
from sqlalchemy.orm import relationship
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()


class Mutation(db.Model):
    __tablename__ = 'mutation'
    __table_args__ = (
        db.Index('mutation_chrom_pos_tumor_type_idx', 'chrom', 'pos', 'tumor_type'),
        db.Index('index', 'chrom', 'pos', 'tumor_type'),
        {'schema': 'public'}
    )

    tumor_type = db.Column(db.String(10), primary_key=True, nullable=False)
    donor_id = db.Column(db.String(32), primary_key=True, nullable=False)
    chrom = db.Column(db.SmallInteger, primary_key=True, nullable=False)
    pos = db.Column(db.BigInteger, primary_key=True, nullable=False)
    mutation_code = db.Column(db.ForeignKey('public.mutation_code.code'), primary_key=True, nullable=False)

    mutation_code1 = db.relationship('MutationCode', primaryjoin='Mutation.mutation_code == MutationCode.code', backref='mutations')


class MutationCode(db.Model):
    __tablename__ = 'mutation_code'
    __table_args__ = {'schema': 'public'}

    transition = db.Column(db.Boolean)
    mutation = db.Column(db.String(4))
    code = db.Column(db.SmallInteger, primary_key=True)


class MutationGroup(db.Model):
    __tablename__ = 'mutation_group'
    __table_args__ = (
        db.Index('mutation_group_chrom_pos_tumor_type_id_idx', 'chrom', 'pos', 'tumor_type_id'),
        {'schema': 'public'}
    )

    tumor_type_id = db.Column(db.ForeignKey('public.tumor_type.tumor_type_id'), primary_key=True, nullable=False)
    chrom = db.Column(db.SmallInteger, primary_key=True, nullable=False)
    pos = db.Column(db.BigInteger, primary_key=True, nullable=False)
    mutation_code = db.Column(db.ForeignKey('public.mutation_code.code'), primary_key=True, nullable=False)
    mutation_count = db.Column(db.Integer)

    mutation_code1 = db.relationship('MutationCode', primaryjoin='MutationGroup.mutation_code == MutationCode.code', backref='mutation_groups')
    tumor_type = db.relationship('TumorType', primaryjoin='MutationGroup.tumor_type_id == TumorType.tumor_type_id', backref='mutation_groups')


class MutationGroupPre(db.Model):
    __tablename__ = 'mutation_group_pre'
    __table_args__ = (
        db.Index('mutation_group_chrom_pos_tumor_type_idx', 'chrom', 'pos', 'tumor_type'),
        {'schema': 'public'}
    )

    tumor_type = db.Column(db.String(10), primary_key=True, nullable=False)
    chrom = db.Column(db.SmallInteger, primary_key=True, nullable=False)
    pos = db.Column(db.BigInteger, primary_key=True, nullable=False)
    mutation_code = db.Column(db.ForeignKey('public.mutation_code.code'), primary_key=True, nullable=False)
    mutation_count = db.Column(db.BigInteger)

    mutation_code1 = db.relationship('MutationCode', primaryjoin='MutationGroupPre.mutation_code == MutationCode.code', backref='mutation_group_pres')


class Repository(db.Model):
    __tablename__ = 'repository'
    __table_args__ = {'schema': 'public'}

    id = db.Column(db.String(20), primary_key=True)
    name = db.Column(db.String(50))
    description = db.Column(db.String(100))


class TumorType(db.Model):
    __tablename__ = 'tumor_type'
    __table_args__ = {'schema': 'public'}

    tumor_type_id = db.Column(db.SmallInteger, primary_key=True)
    tumor_type = db.Column(db.String(4), unique=True)
