function compress_regions(csv_txt, peak) {

    output = ""

    lines = csv_txt.split(/\r\n|\n/);
    console.log(lines);

    correctly_parsed = 0;
    empty_lines=0;
    parsing_log = "";
    
    if(csv_txt.trim()=="")
        parsing_log+="Empty file."

    for(var i=0; i<lines.length;i++) {
        
        if (lines[i].trim() == "") {  //skip empty lines
            empty_lines+=1;
            continue;
        }
        
        cols = lines[i].split(new RegExp("\\s"));

        if(peak && cols.length<10 || !peak &&  cols.length<3) {
            parsing_log+="line "+(i+1)+": '"+lines[i]+"' (not enough columns).\n";
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

        if(Number.isNaN(start) || Number.isNaN(stop) || Number.isNaN(offset)) {
            parsing_log+="line "+(i+1)+": '"+lines[i]+"' (start and stop must be integer numbers).\n";
            continue;
        } else {
            center= Math.floor((start+stop)/2+offset);
        }
        
        if(output!="")
            output += "\n";

        output += chromosome+"\t"+center;
        correctly_parsed +=1;

    }


    return {output: output, parsed_count: correctly_parsed, total_count: lines.length, error_count:lines.length-empty_lines-correctly_parsed,  log: parsing_log};
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