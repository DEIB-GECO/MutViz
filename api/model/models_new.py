# coding: utf-8
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()



class ClinicalDatum(db.Model):
    __tablename__ = 'clinical_data'

    donor_id = db.Column(db.Integer)
    project_code = db.Column(db.Text)
    donor_sex = db.Column(db.Text, server_default=db.FetchedValue())
    donor_vital_status = db.Column(db.Text, server_default=db.FetchedValue())
    donor_age_at_diagnosis = db.Column(db.Text, server_default=db.FetchedValue())
    donor_tumour_stage_at_diagnosis = db.Column(db.Text, server_default=db.FetchedValue())
    prior_malignancy = db.Column(db.Text, server_default=db.FetchedValue())
    cancer_history_first_degree_relative = db.Column(db.Text, server_default=db.FetchedValue())
    exposure_type = db.Column(db.Text, server_default=db.FetchedValue())
    exposure_intensity = db.Column(db.Text, server_default=db.FetchedValue())
    tobacco_smoking_history_indicator = db.Column(db.Text, server_default=db.FetchedValue())
    tobacco_smoking_intensity = db.Column(db.Text, server_default=db.FetchedValue())
    alcohol_history = db.Column(db.Text, server_default=db.FetchedValue())
    alcohol_history_intensity = db.Column(db.Text, server_default=db.FetchedValue())
    first_therapy_type = db.Column(db.Text, server_default=db.FetchedValue())
    first_therapy_duration = db.Column(db.Text, server_default=db.FetchedValue())
    first_therapy_response = db.Column(db.Text, server_default=db.FetchedValue())
    donor_survival_time = db.Column(db.Text, server_default=db.FetchedValue())
    cancer_type_prior_malignancy = db.Column(db.Text, server_default=db.FetchedValue())
    tumor_type_id_wxs = db.Column(db.SmallInteger)
    tumor_type_id_wgs = db.Column(db.SmallInteger)
    id = db.Column(db.Integer, primary_key=True, server_default=db.FetchedValue())
