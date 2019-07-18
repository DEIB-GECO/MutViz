function compress_regions(csv_txt, peak) {

    output = ""

    lines = csv_txt.split(/\r\n|\n/);
    console.log(lines);

    correctly_parsed = 0;
    parsing_log = "";

    for(var i=0; i<lines.length;i++) {
        cols = lines[i].split(new RegExp("\\s"));

        if (lines[i].trim() != "") { //skip empty lines

            if(peak && cols.length<10 || !peak &&  cols.length<3) {
                parsing_log+="Not enough cols in line "+(i+1)+": "+lines[i]+"\n";
                continue;
            }
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

// Initialize the upload file elements
function bs_input_file() {
    $(".input-file").before(
        function() {
            if ( ! $(this).prev().hasClass('input-ghost') ) {
                var element = $("<input type='file' class='input-ghost' id='newFile' style='visibility:hidden; display:none; height:0'>");
                element.attr("name",$(this).attr("name"));
                element.change(function(){
                    element.next(element).find('input').val((element.val()).split('\\').pop());
                });
                $(this).find("span#btn-choose").click(function(){
                    element.click();
                });

                $(this).find('input').css("cursor","pointer");
                $(this).find('input').mousedown(function() {
                    $(this).parents('.input-file').prev().click();
                    return false;
                });
                return element;
            }
        }
    );
}

// Function that creates a copy of a generic object
function clone(object) { return JSON.parse(JSON.stringify(object))}