# coding: utf-8
from sqlalchemy import Boolean, Column, Date, ForeignKey, Integer, SmallInteger, String, Table, Text
from sqlalchemy.schema import FetchedValue
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()



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



class UserFile(db.Model):
    __tablename__ = 'user_file'

    id = db.Column(db.SmallInteger, primary_key=True, server_default=db.FetchedValue())
    name = db.Column(db.String(100), unique=True)
    description = db.Column(db.Text)
    count = db.Column(db.Integer)
    preloaded = db.Column(db.Boolean, nullable=False, server_default=db.FetchedValue())
    expiration = db.Column(db.Date)
    expired = db.Column(db.Boolean, nullable=False, server_default=db.FetchedValue())
