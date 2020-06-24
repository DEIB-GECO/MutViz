//#### DATA BINNING
// Filter data taking only mutations with type in mutationTypes (array of selected mutation types: A->C, C->* ... )
function getFilteredData(data, mutationTypes) {

    return data.filter( function(mutation) {

        return mutationTypes.map( 
            function(t){ 
                if(t.from=="*") 
                    return t.to==mutation[2]  
                if(t.to=="*") 
                    return t.from==mutation[1]  

                return t.from == mutation[1] && t.to==mutation[2]
            }
        ).reduce( function(t1,t2){ return t1 || t2 });

    });

}

function get_bins(data, mutationTypes, binSize, minX, maxX) {


    filtered = getFilteredData(data, mutationTypes);

    ticks = getTicks(minX, maxX, binSize);

    // Configure the histogram function
    var histogram = d3.histogram().value(function(d) {return d[0];})
    .domain([minX, maxX])       
    .thresholds(ticks); 

    return histogram(filtered);
}


function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}


function getTicks(min, max, binSize) {
    // Ticks
    b = Number.parseInt(binSize)
    m = Number.parseInt(min);
    M = Number.parseInt(max);

    positive_side = d3.range(0-b/2, M, b);
    negative_side = d3.range(b/2, -m+1, b).map(function(i){return -i}).reverse();

    ticks = negative_side.concat(positive_side).filter(onlyUnique);

    return ticks;
}


function compress_regions(csv_txt, peak) {

    output = ""

    lines = csv_txt.split(/\r\n|\n/);


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

        lines[i] = lines[i].replace(/\,/g,"\t");
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
        } else 

            if(output!="")
                output += "\n";

        output += chromosome+"\t"+start+"\t"+stop;
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

function save( dataBlob, filesize ){
    saveAs( dataBlob, 'D3 vis exported to PNG.png' ); // FileSaver.js function
}


// Below are the functions that handle actual exporting:
// getSVGString ( svgNode ) and svgString2Image( svgString, width, height, format, callback )
function getSVGString( svgNode ) {
    svgNode.setAttribute('xlink', 'http://www.w3.org/1999/xlink');
    var cssStyleText = getCSSStyles( svgNode );
    appendCSS( cssStyleText, svgNode );

    var serializer = new XMLSerializer();
    var svgString = serializer.serializeToString(svgNode);
    svgString = svgString.replace(/(\w+)?:?xlink=/g, 'xmlns:xlink='); // Fix root xlink without namespace
    svgString = svgString.replace(/NS\d+:href/g, 'xlink:href'); // Safari NS namespace fix

    return svgString;

    function getCSSStyles( parentElement ) {
        var selectorTextArr = [];

        // Add Parent element Id and Classes to the list
        selectorTextArr.push( '#'+parentElement.id );
        for (var c = 0; c < parentElement.classList.length; c++)
            if ( !contains('.'+parentElement.classList[c], selectorTextArr) )
                selectorTextArr.push( '.'+parentElement.classList[c] );

        // Add Children element Ids and Classes to the list
        var nodes = parentElement.getElementsByTagName("*");
        for (var i = 0; i < nodes.length; i++) {
            var id = nodes[i].id;
            if ( !contains('#'+id, selectorTextArr) )
                selectorTextArr.push( '#'+id );

            var classes = nodes[i].classList;
            for (var c = 0; c < classes.length; c++)
                if ( !contains('.'+classes[c], selectorTextArr) )
                    selectorTextArr.push( '.'+classes[c] );
        }

        // Extract CSS Rules
        var extractedCSSText = "";
        for (var i = 0; i < document.styleSheets.length; i++) {
            var s = document.styleSheets[i];

            try {
                if(!s.cssRules) continue;
            } catch( e ) {
                if(e.name !== 'SecurityError') throw e; // for Firefox
                continue;
            }

            var cssRules = s.cssRules;
            for (var r = 0; r < cssRules.length; r++) {
                if ( contains( cssRules[r].selectorText, selectorTextArr ) )
                    extractedCSSText += cssRules[r].cssText;
            }
        }


        return extractedCSSText;

        function contains(str,arr) {
            return arr.indexOf( str ) === -1 ? false : true;
        }

    }

    function appendCSS( cssText, element ) {
        var styleElement = document.createElement("style");
        styleElement.setAttribute("type","text/css"); 
        styleElement.innerHTML = cssText;
        var refNode = element.hasChildNodes() ? element.children[0] : null;
        element.insertBefore( styleElement, refNode );
    }
}


function svgString2Image( svgString, width, height, format, callback ) {
    var format = format ? format : 'jpg';

    var imgsrc = 'data:image/svg+xml;base64,'+ btoa( unescape( encodeURIComponent( svgString ) ) ); // Convert SVG string to data URL

    var canvas = document.createElement("canvas");
    var context = canvas.getContext("2d");

    canvas.width = width;
    canvas.height = height;

    var image = new Image();
    image.onload = function() {
        context.clearRect ( 0, 0, width, height );
        context.drawImage(image, 0, 0, width, height);

        canvas.toBlob( function(blob) {
            var filesize = Math.round( blob.length/1024 ) + ' KB';
            if ( callback ) callback( blob, filesize );
        },
      'image/png',
      1);


    };

    image.src = imgsrc;
}

function range(start, stop, step) {
    if (typeof stop == 'undefined') {
        // one param defined
        stop = start;
        start = 0;
    }

    if (typeof step == 'undefined') {
        step = 1;
    }

    if ((step > 0 && start >= stop) || (step < 0 && start <= stop)) {
        return [];
    }

    var result = [];
    for (var i = start; step > 0 ? i < stop : i > stop; i += step) {
        result.push(i);
    }

    return result;
};