## Database
In order to initialize the database run the SQL script "tables_definition.sql".

Build the database following these steps:
1. Populate mutation_code and trinucleotide_encoded with the CSV files available in "data.zip". 
2. Pupulate the tumor_type table using either the provided CSV or depending on the tumor types available for your data.
3. Populate the main table "mutation_source" either with the CSV available in "data.zip" (link to external download) or using your own mutations. If you are using your own mutations, set the application-specific attributes following the convention defined in mutation_code and trinucleotide_encoded tables.
4. Populate the clinical_data table using either the provided CSV or your own data,

Once table mutation_source is properly set, populate tables mutation_group and mutation_trinucleotide using the two dedicated SQL scripts.

For running on Spark and reading from the local file system, dump table mutation_trinucleotide into a CSV (with header) file with path : '[Project_Folder]/dump/mutation_trinucleotide' (note that no .csv extension is required).
