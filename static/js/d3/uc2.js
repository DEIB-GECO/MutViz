// Function that builds the color scale

function uc2_getColor(value, max=1, normalize=false) {
    if(normalize) {
         return d3.scaleLinear().domain([0, 1/max, 1]).range(['#f44336', 'white', '#0a3281'])(value);
    } else {
         return d3.scaleLinear().range(["white", "#0a3281"]).domain([0,1])(value);
    }
     
}

// Get y value
function uc2_yVal(bin, normalize=false, avg=1) {
    y_val = bin.map( function(x) {
        if(x.length>=4)
            return x[3];
        else
            return 1;
    }).reduce(function(x,y){return x+y},0);

    return normalize?y_val/avg:y_val;
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
function uc2_addTracks(g, data, normalize) {

    g.svg.selectAll()
        .data(data, function(d) {return d.group+':'+d.variable;})
        .enter()
        .append("rect")
        .attr("x", function(d) { return g.xAxisScale(d.group) })
        .attr("y", function(d) { return g.y(d.variable) })
        .attr("width", function(b){return g.xAxisScale(b.x1)-g.xAxisScale(b.x0)} )
        .attr("height", g.y.bandwidth() )
        .style("fill", function(d) { return uc2_getColor(d.value,g.global_max,normalize)} )
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
function uc2_update(data, g, binSize, mutationTypes, normalize) {
    


    // bins intervals centered on 0
    ticks = getTicks(g.xAxisScale.domain()[0], g.xAxisScale.domain()[1], binSize);

    // Configure the histogram function
    var histogram = d3.histogram()
    .value(function(d) {return d[0]})
    .domain(g.xAxisScale.domain())       
    .thresholds(ticks); 

    filtered_f1   = uc2_getFilteredData(data.f1.distances, mutationTypes);
    filtered_f2 = uc2_getFilteredData(data.f2.distances, mutationTypes);

    var binsf1    = histogram(filtered_f1);
    var binsf2  = histogram(filtered_f2);
    
    
    let avg_f1 = null;
    let avg_f2 = null;
    

    if(normalize){
    let fullTicks = getTicks(g.fullXAxisScale.domain()[0], g.fullXAxisScale.domain()[1], binSize);

    let fullHistogram = d3.histogram().value(function(d) {return d[0];}).domain(g.fullXAxisScale.domain()).thresholds(fullTicks); ;
    let fullBinsf1 = fullHistogram(filtered_f1);
    let fullBinsf2 = fullHistogram(filtered_f2);

    avg_f1 = d3.mean(fullBinsf1, function(d) { return uc2_yVal(d)});
    avg_f2 = d3.mean(fullBinsf2, function(d) { return uc2_yVal(d)});
        console.log("AVG_F1 "+avg_f1+" AVG_F2"+avg_f2);
        
        
   }

    var maxInf1 = d3.max(binsf1, function(d) { return +uc2_yVal(d,normalize, avg_f1) });
    var maxf2 = d3.max(binsf2, function(d) { return +uc2_yVal(d, normalize, avg_f2) });
    
    g.global_max = Math.max(maxInf1,maxf2);


    var binsf1Norm = binsf1.map( function(b){
        b.value = uc2_yVal(b,normalize, avg_f1) / g.global_max;
        b.variable = data.f1.name;
        b.group = b.x0;
        return b;
    });

    var binsf2Norm = binsf2.map(function(b){
        b.value = uc2_yVal(b, normalize, avg_f2) / g.global_max; 
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

    uc2_addTracks(g, data,normalize);


    // remove 
    d3.selectAll(".legend").remove();
    d3.selectAll(".legend_ticks").remove();
    
    // create element for legend
    legend_el = d3.select("#uc2 svg").append("g").lower().attr("class","plot-legend").attr("transform","translate(" + g.margin.left + "," + 0 + ")")
    
    let numElements = 500;
    
    legendElementWidth = g.width/numElements;
    height = 0;
    gridSize = 10;
    
    
    for(i=0; i<numElements; i++)
        legend_el.append("g").attr("class", "legend").append("rect")
        .attr("x",  legendElementWidth * i)
        .attr("y", height)
        .attr("width", legendElementWidth)
        .attr("height", gridSize/2)
        .style("fill", uc2_getColor(i/numElements, g.global_max,normalize));
    


    // Setup the x axis
    legend_scale = d3.scaleLinear().domain([0,g.global_max]).range([0,g.width]);
    legend_xAxis = legend_el.append("g").attr("class","legend_ticks").attr("transform", "translate(0," + 0+ ")");
    
    yAxisTicks = legend_scale.ticks().filter(function(tick){return  Number.isInteger(tick);});
    yAxis = d3.axisBottom(legend_scale)
    .tickValues(yAxisTicks)
    .tickFormat(d3.format('d'));
    legend_xAxis.call(yAxis);
    
   


}

/* This function rescales the x axis, given the graph object and the new provided domain (range) */
function uc2_rescaleX(data, g, binSize, range, mutationTypes, normalize) {

    g.xAxisScale = d3.scaleLinear().domain([range.min,range.max]).range([0, g.width]);

    g.xAxis
        .transition()
        .duration(500)
        .call(d3.axisBottom(g.xAxisScale).tickFormat(function(d) { return d3.format(".2s")(d); }));

    uc2_update(data, g, binSize, mutationTypes, normalize);
}

/* Build the graph with an initial number of bins */
function uc2(data, binSize, range, mutationTypes, normalize) {

    var g = {} // here we put all useful objects describing our plot

    // Set the dimensions and margins of the plot
    g.margin = {top: 30, right: 30, bottom: 30, left: 40};
    g.width  = 700 - g.margin.left - g.margin.right;
    g.height = 400 - g.margin.top - g.margin.bottom;

    // Remove any pre-existing plot
    d3.select("#uc2 svg").html("");

    // Setup the plot container
    g.svg = d3.select("#uc2 svg").attr("width",700).attr("height",400) 
        .append("g").attr("class","main-plot")
        .attr("transform","translate(" + g.margin.left + "," + g.margin.top + ")");

    // Setup the x axis
    g.xAxisScale = d3.scaleLinear().domain([range.min,range.max]).range([0, g.width]);
    g.fullXAxisScale =  d3.scaleLinear().domain([range.minFull, range.maxFull]).range([0, g.width]);
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
    uc2_update(data, g, binSize, mutationTypes, normalize);

    // Return the plot description
    return g;
}