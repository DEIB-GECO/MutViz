# coding: utf-8
from sqlalchemy import BigInteger, Boolean, Column, Integer, SmallInteger, String
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy(session_options={"autoflush": False,'autocommit':False,'expire_on_commit':False,})


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



class MutationDonors(db.Model):
    __tablename__ = 'mutation_donors'

    donor_id = db.Column(db.String(32), primary_key=True, nullable=False)
    tumor_type_id = db.Column(db.SmallInteger, primary_key=True, nullable=False)
    chrom = db.Column(db.SmallInteger, primary_key=True, nullable=False)
    pos = db.Column(db.BigInteger, primary_key=True, nullable=False)
    mutation_code_id = db.Column(db.SmallInteger, primary_key=True, nullable=False)

class MutationGroup(db.Model):
    __tablename__ = 'mutation_group'

    tumor_type_id = db.Column(db.SmallInteger, primary_key=True, nullable=False)
    chrom = db.Column(db.SmallInteger, primary_key=True, nullable=False)
    pos = db.Column(db.BigInteger, primary_key=True, nullable=False)
    mutation_code_id = db.Column(db.SmallInteger, primary_key=True, nullable=False)
    mutation_count = db.Column(db.Integer)


class Repository(db.Model):
    __tablename__ = 'repository'

    repository_id = db.Column(db.String(20), primary_key=True)
    name = db.Column(db.String(50))
    description = db.Column(db.String(100))



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
    db.Column('tumor_type_id', db.SmallInteger, nullable=False, index=True),
    db.Column('chrom', db.SmallInteger, nullable=False, index=True),
    db.Column('position', db.Integer, nullable=False),
    db.Column('mutation_code_id', db.ForeignKey(u'mutation_code.mutation_code_id'), db.ForeignKey(u'trinucleotide_encoded.id'), nullable=False),
    db.Column('trinucleotide_id_r', db.SmallInteger, nullable=False),
    db.Index('mutation_trinucleotide_chrom_position_index', 'chrom', 'position'),
    db.Index('mutation_trinucleotide_tumor_type_id_chrom_position_index', 'tumor_type_id', 'chrom', 'position')
)

t_mutation_trinucleotide_test = db.Table(
    'mutation_trinucleotide_test',
    db.Column('donor_id', db.Integer),
    db.Column('tumor_type_id', db.SmallInteger),
    db.Column('chrom', db.SmallInteger),
    db.Column('position', db.Integer),
    db.Column('mutation_code_id', db.SmallInteger),
    db.Column('trinucleotide_id_r', db.SmallInteger)
)

class TrinucleotideCache(db.Model):
    __tablename__ = 'trinucleotide_cache'

    file_id = db.Column(db.SmallInteger, primary_key=True, nullable=False)
    tumor_type_id = db.Column(db.SmallInteger, primary_key=True, nullable=False)
    trinucleotide_id = db.Column(db.SmallInteger, primary_key=True, nullable=False)
    count = db.Column(db.Integer, nullable=False)



t_regions = db.Table(
    'regions',
    db.Column('file_id', db.SmallInteger, nullable=False, server_default=db.FetchedValue()),
    db.Column('chrom', db.SmallInteger, nullable=False),
    db.Column('start', db.Integer, nullable=False),
    db.Column('stop', db.Integer, nullable=False),
    db.Column('middle', db.Integer, nullable=True)
)


class TrinucleotideEncoded(db.Model):
    __tablename__ = 'trinucleotide_encoded'

    id = db.Column(db.SmallInteger, primary_key=True, server_default=db.FetchedValue())
    mutation = db.Column(db.String(7), nullable=False)
    triplet = db.Column(db.String(3), nullable=False)
    from_allele = db.Column(db.String(1), nullable=False)
    to_allele = db.Column(db.String(1), nullable=False)



class TumorType(db.Model):
    __tablename__ = 'tumor_type'

    tumor_type_id = db.Column(db.SmallInteger, primary_key=True)
    tumor_type = db.Column(db.String(8), nullable=False, unique=True)
    description = db.Column(db.String)
    mutation_count = db.Column(db.Integer)



class UserFile(db.Model):
    __tablename__ = 'user_file'

    id = db.Column(db.SmallInteger, primary_key=True, server_default=db.FetchedValue())
    name = db.Column(db.String(100))
    description = db.Column(db.String(100))
    count = db.Column(db.Integer)

class MutationGrouped(db.Model):
    __tablename__ = 'mutation_grouped'

    tumor_type_id = db.Column(db.SmallInteger, primary_key=True, nullable=False, index=True)
    chrom = db.Column(db.SmallInteger, primary_key=True, nullable=False, index=True)
    position = db.Column(db.Integer, primary_key=True, nullable=False, index=True)
    mutation_code_id = db.Column(db.SmallInteger, primary_key=True, nullable=False)
    count = db.Column(db.BigInteger)

class DonorsCache(db.Model):
    __tablename__ = 'donors_cache'

    file_id = db.Column(db.SmallInteger, primary_key=True, nullable=False)
    tumor_type_id = db.Column(db.SmallInteger, primary_key=True, nullable=False)
    donor_id = db.Column(db.Integer, primary_key=True, nullable=False)
    mutation_id = db.Column(db.SmallInteger, primary_key=True, nullable=False)
    count = db.Column(db.Integer, nullable=False)

