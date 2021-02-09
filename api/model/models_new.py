# coding: utf-8
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()



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
