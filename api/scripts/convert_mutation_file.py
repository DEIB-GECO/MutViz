import csv

input_file_name = '/Users/andreagulino/Desktop/mutations/example_mut.txt'
output_file_name = '/Users/andreagulino/Desktop/mutations/converted/conv.txt'
delimiter = '\t'

mapping = { 'AG':1,
            'GA':2,
            'CT':3,
            'TC':4,
            'AC':5,
            'AT':6,
            'CA':7,
            'CG':8,
            'GC':9,
            'GT':10,
            'TA':11,
            'TG':12}

with open(input_file_name) as csv_file:
    with open(output_file_name, mode='w') as employee_file:

        csv_reader = csv.reader(csv_file, delimiter=delimiter)

        # example line: chr15	24985486	24985487	G	A	DO218489

        for row in csv_reader:


            chromosome = row[0]
            pos = row[1]
            mutation = row[3]+row[4]
            donor_id = row[5]

            out_row = [chromosome,pos,mutation,donor_id]

            writer = csv.writer(employee_file, delimiter=delimiter)
            writer.writerow(out_row)