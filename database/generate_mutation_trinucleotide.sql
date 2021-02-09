INSERT INTO mutation_trinucleotide(donor_id, tumor_type_id, chrom, position, mutation_code_id, trinucleotide_id_r)
SELECT donor_id, tumor_type_id, chrom, position, mutation_code_id, trinucleotide_id_r FROM mutation_source
ORDER BY position ASC;