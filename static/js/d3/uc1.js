// List of available colors
var uc1_colors = ["#e6194B", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4", "#42d4f4", "#f032e6", "#bfef45", "#fabebe", "#469990", "#e6beff", "#9A6324", "#fffac8", "#800000", "#aaffc3", "#808000", "#ffd8b1", "#000075", "#a9a9a9", "#ffffff", "#000000"];

// Highlith on the x-axis the interval corresponding to the the motif
function highlightMotif(g) {
    g.svg.selectAll("line.motif").remove()
    g.svg.append("line")
        .attr("class", "motif")
        .attr("x1", g.xAxisScale(-9.5))
        .attr("y1", g.height+2)
        .attr("x2", g.xAxisScale(+9.5))
        .attr("y2", g.height+2)
        .attr("stroke-width", 2)
        .attr("stroke", "black")
}


// Add a group of bars to the plot (alreadyAddedMutations keeps track of the already added bars to understand
// at which vertical position each bar of the new group should start)
function uc1_addBars(g, groupId, bins, alreadyAddedMutations, color) {

    // Bars representing the amount of mutations in a bin, independently on the type of mutation
    var selection = g.svg.selectAll("rect[rect-type='"+color+"']").data(bins) // update selection

    // Get the vertical position of each bar, depending on the already stacked bars for a given bin (alreadyAddedMutations)
    yPos = function(bin, i) { 
        if(alreadyAddedMutations!=null) {
            return g.yAxisScale(bin.length+alreadyAddedMutations[i]);
        } else
            return g.yAxisScale(bin.length);
    }

    selection
        .enter()
        .append("rect") // Add a new rect for each new element
    //.merge(total) // merge the new elements added with enter() with elements already existing in the selection and apply changes to all of them
    //.transition().duration(1) // transition effect lasting 1 seond
        .attr("rect-type", "group-"+groupId)
        .attr("x", 1) // starting distance of each element from y-axis (then will be translated...)
        .attr("transform", function(d,i) { return "translate(" + g.xAxisScale(d.x0) + "," + yPos(d,i) + ")"; }) // we move each rectangle depending on where the associated bin starts, and 
        .attr("width",  function(d) { return g.xAxisScale(d.x1) - g.xAxisScale(d.x0) -1 ; }) // width of the rect
        .attr("height", function(d) { return g.height - g.yAxisScale(d.length) })       // height of the rect

        .style("fill", color)

    if(alreadyAddedMutations!=null)
        for(i in alreadyAddedMutations) {
            alreadyAddedMutations[i] += bins[i].length;
        }

    return alreadyAddedMutations;


    // selection.exit().remove()
}


// Filter data taking only mutations with type in mutationTypes (array of selected mutation types: A->C, C->* ... )
function uc1_getFilteredData(data, mutationTypes) {

    return data.filter( function(mutation) {

        return mutationTypes.map( 
            function(t){ 
                if(t.from=="*") 
                    return t.to==mutation.to  
                if(t.to=="*") 
                    return t.from==mutation.from  

                return t.from == mutation.from && t.to==mutation.to  
            }
        ).reduce( function(t1,t2){ return t1 || t2 });


    });

}

function uc1_addLegendItem(g, index, color, text) {

    //append legend colour blocks
    g.legend.append("rect")
        .attr("x", g.width - 305)
        .attr("y", 12*index)
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", color);

    //append legend texts
    g.legend.append("text")
        .attr("x", g.width - 310)
        .attr("y", 5+12*index)
        .attr("dy", "0.32em")
        .text(text);
}

// This function (re-)builds the graph g provided the number of bins and selected mutation types
function uc1_update(data, g, binSize, mutationTypes, stacked, showTotal) {

    console.log("Building an histogram with "+binSize+" binSize.");

    /* In di3.js d3.histogram is called a Layout and shows the distribution of data by grouping
     * discrete data points into * bins. Constructs a new histogram function with a provided value accessor,
     * range function, and bin function. The returned layout object is both an object and a function. 
     * That is: you can call it as an object to set additional parameter (e.g. .value(), .domain() ...), 
     * or to get the binned data.

       https://d3-wiki.readthedocs.io/zh_CN/master/Histogram-Layout/?q=d3.histogram&check_keywords=yes&area=default */

    // bins intervals centered on 0
    positive_side = d3.range(0-binSize/2, g.xAxisScale.domain()[1] + 1, binSize);
    negative_side = d3.range(binSize/2, -g.xAxisScale.domain()[0]+1, binSize).map(function(i){return -i}).reverse();

    ticks = negative_side.concat(positive_side);

    // Configure the histogram function
    var histogram = d3.histogram()
    /* The value accessor: for each mutation return the distance from the motif */
    .value(function(d) {return d.dist})
    /* Then the domain of the graph: 0 to max_x already defined... */
    .domain(g.xAxisScale.domain())       
    /* An array of thresholds defines how values should be split among bins. 
                       * Each value defines the upper limit of a given bin. xAxisScale.ticks(bins) returns the
                       * array representing the xAxis split into (more-or-less) binSize parts (bins). */
    // https://github.com/d3/d3-scale/issues/9
    .thresholds(ticks); 


    /* Apply the defined function to data to get the bins (array of array, nBins x itemsInThatBin)
     * bins[0] is both an array of items (contained into that bin), and an object with properties:
     * - x0: start coordinate of the bin
     * - x1: stop coordinate of the bin */
    var bins = histogram(data);

    /* Now, since we can know the maximum value of y, 
     * we can complete the definition of yAxisScale and then build the yAxis.
     * The max function iterates over the bins, and for each bin (another array) takes the number of contained items (length * of the array containing the items) */

    g.yAxisScale.domain([0, d3.max(bins, function(d) { return d.length }) + 20]);

    g.yAxis
        .transition()
        .duration(1000)
        .call(d3.axisLeft(g.yAxisScale));

    // Adding vertical bars 

    /* In d3, selection methods, e.g. selectAll are used to select existing objects.
     * Joining Data ( selection.data() ), allows to bind a selection to an array of data, 
     * returning another selection, called "update selection", that is aware of which data is already represented in the 
     * plot, what is missing from the plot, what is in the plot but not in the data. In particular, we can call on the 
     * "update selection" the following methods:
     *  - enter(): if the element is not represented in the data, creates the representation for that data
     * 
     * On the result of a selection method you can call:
     * - enter() : to create the DOM elements in the data not present in the plot
     * - exit() : returns the DOM elements with no correspondences in the data
     * - remove() : removes the selected elements from the document. */


    // Remove all the bars existing in the plot
    g.svg.selectAll("rect").remove();
    g.svg.selectAll(".legend").remove();


    // Create the legend container
    g.legend = g.svg.append("g")
        .attr("class","legend")
        .attr("font-family", "sans-serif")
        .attr("font-size", 12)
        .attr("text-anchor", "end")
        .attr("transform", "translate("+(g.width-250)+",0)");

    // Bars representing the amount of mutations in a bin, independently on the type of mutation
    if (showTotal) {
        uc1_addBars(g, 0, bins, null, "silver");
        uc1_addLegendItem(g, 0, "silver", "ALL");
    }

    // Bars representing the selected types of mutations

    alreadyAdded = bins.map(function(bin){return 0;});

    filteredArray = [];
    maxInFiltered = 0;

    for( var i=0; i<mutationTypes.length; i++) {

        type = mutationTypes[i];

        filteredData = uc1_getFilteredData(data, [type]);
        filteredArray[i] = histogram(filteredData);

        curMax = d3.max( filteredArray[i], function(d) { return d.length })
        maxInFiltered = curMax>maxInFiltered?curMax:maxInFiltered;

    }

    if( !showTotal) {
        g.yAxisScale.domain([0, maxInFiltered + 20]);

        g.yAxis
            .transition()
            .duration(1000)
            .call(d3.axisLeft(g.yAxisScale));
    }


    for( i=0; i<mutationTypes.length; i++) {
        if(stacked) {
            color = uc1_colors[i];
            legendText = type.from+" > "+type.to;
        } else {
            color = uc1_colors[0];
            legendText = "selection";
        }

        alreadyAdded = uc1_addBars(g, i, filteredArray[i], alreadyAdded, color, legendText);

        if( stacked || i<1)
            uc1_addLegendItem(g, i+1, color, legendText);
    }


    highlightMotif(g);

}

/* This function rescales the x axis, given the graph object and the new provided domain (range) */
function uc1_rescaleX(data, g, binSize, range, mutationTypes, stacked, showTotal) {

    // uc1(data, binSize, range, mutationTypes);
    //return;

    console.log("rescaling x");
    g.xAxisScale = d3.scaleLinear().domain([range.min,range.max]).range([0, g.width]);

    // g.xAxisScale.domain([range.min,range.max])    
    g.xAxis
        .transition()
        .duration(1000)
        .call(d3.axisBottom(g.xAxisScale).tickFormat(function(d) { return d3.format(".2s")(d); }));

    uc1_update(data, g, binSize, mutationTypes,stacked, showTotal);
}

/* Build the graph with an initial number of bins */
function uc1(data, binSize, range, mutationTypes, stacked, showTotal) {

    var g = {} // here we put all useful objects describing our plot

    // Set the dimensions and margins of the plot
    g.margin = {top: 10, right: 50, bottom: 30, left: 55},
        g.width  = 700 - g.margin.left - g.margin.right,
        g.height = 400 - g.margin.top - g.margin.bottom;

    d3.select("#uc1 svg").html("");


    g.svg = d3.select("#uc1 svg")  
        .append("g")
        .attr("transform","translate(" + g.margin.left + "," + g.margin.top + ")");

    // Defines linear functions for X and Y axis initialization
    g.xAxisScale = d3.scaleLinear().domain([range.min, range.max]).range([0, g.width]);
    g.yAxisScale = d3.scaleLinear().range([g.height, 0]); // domain depends on the bins

    // Append to groups, one of each axis. xAxis must be moved down by the height of the graph
    g.xAxis = g.svg.append("g").attr("transform", "translate(0," + g.height + ")")
    g.yAxis = g.svg.append("g")

    // xAxis (yAxis) is a Selection of one element

    // xAxis.call(f) means that we call f on the selection xAxis
    // d3.axisBottom(xAxisScale) : creates the human-readable reference marks with the provided scale xAxisScale
    g.xAxis.call(d3.axisBottom(g.xAxisScale));

    // Label for the x axis
    g.svg.append("text")             
        .attr("transform",
              "translate(" + (g.width/2) + " ," + 
              (g.height + g.margin.top + 30) + ")")
        .style("text-anchor", "middle")
        .style("font-size", "0.8em")
        .text("distance (bp)");

    // Label for the y axis
    g.svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -2 - g.margin.left)
        .attr("x",0 - (g.height / 2))
        .attr("dy", "0.8em")
        .style("text-anchor", "middle")
        .style("font-size", "0.8em")
        .text("number of mutations per bin");      



    // Build the histogram with the provided number of bins
    uc1_update(data, g, binSize, mutationTypes, stacked, showTotal);

    // return a reference to the graph
    return g;
}