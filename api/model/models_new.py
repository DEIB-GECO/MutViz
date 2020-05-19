# coding: utf-8
from sqlalchemy import Column, Integer
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()



class DistanceCache(db.Model):
    __tablename__ = 'distance_cache'

    file_id = db.Column(db.Integer, primary_key=True, nullable=False)
    tumor_type_id = db.Column(db.Integer, primary_key=True, nullable=False)
    distance = db.Column(db.Integer, primary_key=True, nullable=False)
    mutation_code_id = db.Column(db.Integer, primary_key=True, nullable=False)
    count = db.Column(db.Integer, nullable=False)
