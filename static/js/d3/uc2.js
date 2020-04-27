// Function that builds the color scale
var uc2_getColor = d3.scaleLinear()
.range(["white", "#0a3281"])
.domain([0,1]);

// Get y value
function yVal(bin) {
    y_val = bin.map( function(x) {
        if(x.length>=4)
            return x[3];
        else
            return 1;
    }).reduce(function(x,y){return x+y},0);

    return y_val;
}

// Highlith on the x-axis the interval corresponding to the the motif
function uc2_highlightMotif(g) {
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

// Add a track to the heatmap
function uc2_addTracks(g, data) {

    g.svg.selectAll()
        .data(data, function(d) {return d.group+':'+d.variable;})
        .enter()
        .append("rect")
        .attr("x", function(d) { return g.xAxisScale(d.group) })
        .attr("y", function(d) { return g.y(d.variable) })
        .attr("width", function(b){return g.xAxisScale(b.x1)-g.xAxisScale(b.x0)} )
        .attr("height", g.y.bandwidth() )
        .style("fill", function(d) { return uc2_getColor(d.value)} )
}


// Filter data taking only mutations with type in mutationTypes (array of selected mutation types)
function uc2_getFilteredData(data, mutationTypes) {

    return data.filter( function(mutation) {

        return mutationTypes.map( 
            function(t){ 
                if(t.from=="*" && t.to=="*")
                    return true;
                if(t.from=="*") 
                    return t.to==mutation[2]  
                if(t.to=="*") 
                    return t.from==mutation[1]  

                return t.from == mutation[1] && t.to==mutation[2]
            }
        ).reduce( function(t1,t2){ return t1 || t2 });


    });
}

// This function (re-)builds the graph g provided the number of bins and selected mutation types
function uc2_update(data, g, binSize, mutationTypes) {

    // bins intervals centered on 0
    ticks = getTicks(g.xAxisScale.domain()[0], g.xAxisScale.domain()[1], binSize);

    // Configure the histogram function
    var histogram = d3.histogram()
    .value(function(d) {return d[0]})
    .domain(g.xAxisScale.domain())       
    .thresholds(ticks); 


    console.log(data);
    filtered_f1   = uc2_getFilteredData(data.f1.distances, mutationTypes);
    filtered_f2 = uc2_getFilteredData(data.f2.distances, mutationTypes);

    console.log(filtered_f1)

    var binsf1    = histogram(filtered_f1);
    var binsf2  = histogram(filtered_f2);

    var maxInf1 = d3.max(binsf1, function(d) { return +yVal(d) });
    var maxf2 = d3.max(binsf2, function(d) { return +yVal(d) });


    var binsf1Norm = binsf1.map( function(b){
        b.value = yVal(b) / maxInf1;
        b.variable = data.f1.name;
        b.group = b.x0;
        return b;
    });

    var binsf2Norm = binsf2.map(function(b){
        b.value = yVal(b) / maxf2; 
        b.variable = data.f2.name;
        b.group = b.x0;
        return b;
    });


    var myVars = [data.f1.name, data.f2.name];


    g.y = d3.scaleBand()
        .range([ g.height, 0 ])
        .domain(myVars)
        .padding(0.01);

    g.yAxis.call(d3.axisLeft(g.y));

    $(".y-axis text").attr("transform", "rotate(270) translate(27,-17)");


    data = binsf1Norm.concat(binsf2Norm);

    uc2_addTracks(g, data);


}

/* This function rescales the x axis, given the graph object and the new provided domain (range) */
function uc2_rescaleX(data, g, binSize, range, mutationTypes) {

    g.xAxisScale = d3.scaleLinear().domain([range.min,range.max]).range([0, g.width]);

    g.xAxis
        .transition()
        .duration(500)
        .call(d3.axisBottom(g.xAxisScale).tickFormat(function(d) { return d3.format(".2s")(d); }));

    uc2_update(data, g, binSize, mutationTypes);
}

/* Build the graph with an initial number of bins */
function uc2(data, binSize, range, mutationTypes, stacked) {

    var g = {} // here we put all useful objects describing our plot

    // Set the dimensions and margins of the plot
    g.margin = {top: 10, right: 30, bottom: 30, left: 40};
    g.width  = 700 - g.margin.left - g.margin.right;
    g.height = 400 - g.margin.top - g.margin.bottom;

    // Remove any pre-existing plot
    d3.select("#uc2 svg").html("");

    // Setup the plot container
    g.svg = d3.select("#uc2 svg")  
        .append("g")
        .attr("transform","translate(" + g.margin.left + "," + g.margin.top + ")");

    // Setup the x axis
    g.xAxisScale = d3.scaleLinear().domain([range.min,range.max]).range([0, g.width]);
    g.xAxis = g.svg.append("g").attr("transform", "translate(0," + g.height + ")");
    g.xAxis.call(d3.axisBottom(g.xAxisScale));

    // Add the y axis (just the svg element, later it will be configured)
    g.yAxis = g.svg.append("g").attr("class","y-axis");

    // Label for the x axis
    g.svg.append("text")             
        .attr("transform",
              "translate(" + (g.width/2) + " ," + 
              (g.height + g.margin.top + 30) + ")")
        .style("text-anchor", "middle")
        .style("font-size", "0.8em")
        .text("distance (bp)");

    // Compute the bins and build the plot
    uc2_update(data, g, binSize, mutationTypes);

    // Return the plot description
    return g;
}