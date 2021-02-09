INSERT INTO mutation_group(tumor_type_id, chrom, pos, mutation_code_id, mutation_count) 
SELECT tumor_type_id, chrom, position, mutation_code_id, count(*) FROM mutation_source 
group by tumor_type_id, chrom, position, mutation_code_id
ORDER BY position ASC;