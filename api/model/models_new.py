# coding: utf-8
from sqlalchemy import Column, Integer, SmallInteger
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()



class DonorsTriCache(db.Model):
    __tablename__ = 'donors_tri_cache'

    file_id = db.Column(db.SmallInteger, primary_key=True, nullable=False)
    tumor_type_id = db.Column(db.SmallInteger, primary_key=True, nullable=False)
    donor_id = db.Column(db.Integer, primary_key=True, nullable=False)
    trinucleotide_id = db.Column(db.SmallInteger, primary_key=True, nullable=False)
    count = db.Column(db.Integer, nullable=False)
