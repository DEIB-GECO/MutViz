function compress_regions(csv_txt, peak) {

    output = ""

    lines = csv_txt.split(/\r\n|\n/);
    console.log(lines);

    correctly_parsed = 0;
    parsing_log = "";

    for(var i=0; i<lines.length;i++) {
        cols = lines[i].split(new RegExp("\\s"));

        if(peak && cols.length<10 || !peak && cols.length<3) {
            parsing_log+="Not enough cols in line "+(i+1)+": "+lines[i]+"\n";
            continue;
        }
        

        chromosome = cols[0];
        start = Number(cols[1])
        stop = Number(cols[2])
        offset = 0;

        if(peak && Number(cols[9])!=-1) {
            offset = Number(cols[9]);
            stop = start; // s.t. (start+stop)/2 = start
        }

        if(start==NaN || stop==NaN || offset==NaN) {
            parsing_log+="Could not parse line "+(i+1)+": "+lines[i]+"\n";
            continue;
        } else {
            center= Math.floor((start+stop)/2+offset);
        }

        output += chromosome+"\t"+center;
        correctly_parsed +=1;

        if(i<=lines.length)
            output += "\n";
    }

    if(correctly_parsed<lines.length) { 
        console.log("Some lines were not correctly parsed:");
        console.log(parsing_log)
    }

    return {output: output, parsed_count: correctly_parsed, total_count: lines.length, log: parsing_log};
}