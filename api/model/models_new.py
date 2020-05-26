# coding: utf-8
from sqlalchemy import Column, Integer, String
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()



class ClinicalDatum(db.Model):
    __tablename__ = 'clinical_data'

    donor_id = db.Column(db.Integer, primary_key=True, nullable=False)
    tumor_type_id = db.Column(db.Integer, primary_key=True, nullable=False)
    donor_sex = db.Column(db.String(1))
    donor_vital_status = db.Column(db.String)
    donor_age_at_diagnosis = db.Column(db.Integer)
    donor_tumour_stage_at_diagnosis = db.Column(db.String)
    donor_survival_time = db.Column(db.Integer)
    prior_malignancy = db.Column(db.String)
    cancer_type_prior_malignancy = db.Column(db.String)
    cancer_history_first_degree_relative = db.Column(db.String)
    exposure_type = db.Column(db.String)
    exposure_intensity = db.Column(db.String)
    tobacco_smoking_history_indicator = db.Column(db.String)
    alcohol_history = db.Column(db.String)
    alcohol_history_intensity = db.Column(db.String)
    first_therapy_type = db.Column(db.String)
    first_therapy_duration = db.Column(db.Integer)
    first_therapy_response = db.Column(db.String)
