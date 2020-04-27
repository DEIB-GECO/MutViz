var RECT_HEIGHT = 50;

// List of available colors
var uc5_colors = ["#4e79a7","#f28e2c","#e15759","#76b7b2","#59a14f","#edc949","#af7aa1","#ff9da7","#9c755f","#bab0ab", "#808000", "#ffd8b1", "#000075", "#a9a9a9", "#ffffff", "#000000"];

function uc5_tt(data, mutationTypes, tumorType, width, height, left_margin) {


    console.log("width: "+width);

    console.log("called uc5 with data: ");
    console.log(data);
    console.log(mutationTypes);
    console.log(tumorType);

    var g = {} // here we put all useful objects describing our plot
    console.log(mutationTypes.length);

    g.html = d3.select("#uc5 svg");

    g.titleBoxHeight = 25;

    g.distance = 10; // between successive plots
    // Set the dimensions and margins of the plot
    g.margin = {top: 20, right: 0, bottom: 30, left: 50};
    g.width  = (width);
    g.height = height - 2*g.margin.top;



    // append the svg object to the body of the page
    g.svg = g.html.append("g")
        .attr("transform",
              "translate(" + (left_margin) + "," + g.margin.top + ")");

    // Compute quartiles, median, inter quantile range min and max --> these info are then used to draw the box.
    var sumstat = d3.nest() // nest function allows to group the calculation per level of a factor
    .key(function(d) { return d.mutation;})
    .rollup(function(d) {
        q1 = d3.quantile(d.map(function(d) { return d.count;}).sort(d3.ascending),.25)
        median = d3.quantile(d.map(function(d) { return d.count;}).sort(d3.ascending),.5)
        q3 = d3.quantile(d.map(function(d) { return d.count;}).sort(d3.ascending),.75)
        interQuantileRange = q3 - q1
        min = q1 - 1.5 * interQuantileRange
        max = q3 + 1.5 * interQuantileRange
        return({q1: q1, median: median, q3: q3, interQuantileRange: interQuantileRange, min: min, max: max})
    })
    .entries(data)

    console.log(sumstat);

    g.yMax = Math.max.apply(null, sumstat.map(function(entry){return entry.value.max}));
    // leave same space above the maximum
    g.yMax =  g.yMax + 0.1*g.yMax;


    // Show the X scale
    var x = d3.scaleBand()
    .range([ 0, g.width ])
    .domain(mutationTypes)
    .paddingInner(1)
    .paddingOuter(.5)
    g.svg.append("g")
        .attr("transform", "translate(0," +(g. height + g.margin.top)+")")
        .style("font-size", "1em")
        .call(d3.axisBottom(x))

    // Show the Y scale
    var y = d3.scaleLinear()
    .domain([0,g.yMax])
    .range([g.height, 0])
    g.svg.append("g").style("font-size", "1em").call(d3.axisLeft(y))


    // tooltip
    var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(function(d) {
       return "<strong style='color:yellow'>"+d.key+"</strong> <br> q1: "+d.value.q1+"<br>median: "+d.value.median+"<br> q3: "+d.value.q3+
            "<br>interQuantileRange: "+d.value.interQuantileRange+"<br>min: "+d.value.min+"<br>max: "+d.value.max;
        ;
    });

    g.svg.call(tip);

    // Show the main vertical line
    g.svg
        .selectAll("vertLines")
        .data(sumstat)
        .enter()
        .append("line")
        .attr("x1", function(d){return(x(d.key))})
        .attr("x2", function(d){return(x(d.key))})
        .attr("y1", function(d){return(y(Math.max(0,d.value.min)))})
        .attr("y2", function(d){return(y(d.value.max))})
        .attr("stroke", "black")
        .style("width", 40)

    // rectangle for the main box
    var boxWidth = 100
    g.svg
        .selectAll("boxes")
        .data(sumstat)
        .enter()
        .append("rect")
        .attr("x", function(d){return(x(d.key)-boxWidth/2)})
        .attr("y", function(d){return(y(d.value.q3))})
        .attr("height", function(d){return(y(d.value.q1)-y(d.value.q3))})
        .attr("width", boxWidth )
        .attr("stroke", "black")
        .style("fill", "rgb(220, 220, 220)")
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide);

    // Show the median
    g.svg
        .selectAll("medianLines")
        .data(sumstat)
        .enter()
        .append("line")
        .attr("x1", function(d){return(x(d.key)-boxWidth/2) })
        .attr("x2", function(d){return(x(d.key)+boxWidth/2) })
        .attr("y1", function(d){return(y(d.value.median))})
        .attr("y2", function(d){return(y(d.value.median))})
        .attr("stroke", "black")
        .style("width", 80)
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide);


    return g;

}

/* Build the graph with an initial number of bins */
function uc5(data, mutationTypes, tumorType, width, height) {


    // Remove any pre-existing plot
    d3.select("#uc5 svg").html("");

    console.log("width: "+width);

    console.log("called uc5 with data: ");
    console.log(mutationTypes);
    console.log(tumorType);

    var g = {} // here we put all useful objects describing our plot
    console.log(mutationTypes.length);

    g.html = d3.select("#uc5 svg");

    g.titleBoxHeight = 25;

    g.distance = 10; // between successive plots
    // Set the dimensions and margins of the plot
    g.margin = {top: 20, right: 0, bottom: 30, left: 50};
    g.width  = (width-2*g.margin.left);
    g.height = height - 2*g.margin.top;



    // append the svg object to the body of the page
    g.svg = g.html.append("g")
        .attr("transform",
              "translate(" + g.margin.left + "," + g.margin.top + ")");

    // Compute quartiles, median, inter quantile range min and max --> these info are then used to draw the box.
    var sumstat = d3.nest() // nest function allows to group the calculation per level of a factor
    .key(function(d) { return d.mutation;})
    .rollup(function(d) {
        q1 = d3.quantile(d.map(function(d) { return d.count;}).sort(d3.ascending),.25)
        median = d3.quantile(d.map(function(d) { return d.count;}).sort(d3.ascending),.5)
        q3 = d3.quantile(d.map(function(d) { return d.count;}).sort(d3.ascending),.75)
        interQuantileRange = q3 - q1
        min = q1 - 1.5 * interQuantileRange
        max = q3 + 1.5 * interQuantileRange
        return({q1: q1, median: median, q3: q3, interQuantileRange: interQuantileRange, min: min, max: max})
    })
    .entries(data)

    console.log(sumstat);



    g.yMax = Math.max.apply(null, sumstat.map(function(entry){return entry.value.max}));
    // leave same space above the maximum
    g.yMax =  g.yMax + 0.1*g.yMax;

    // Show the X scale
    var x = d3.scaleBand()
    .range([ 0, g.width ])
    .domain(mutationTypes)
    .paddingInner(1)
    .paddingOuter(.5)
    g.svg.append("g")
        .attr("transform", "translate(0," +(g. height + g.margin.top)+")")
        .style("font-size", "1em")
        .call(d3.axisBottom(x))

    // Show the Y scale
    var y = d3.scaleLinear()
    .domain([0,g.yMax])
    .range([g.height, 0])
    g.svg.append("g").style("font-size", "1em").call(d3.axisLeft(y))

    // tooltip
    var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(function(d) {
        return "<strong style='color:yellow'>"+d.key+"</strong> <br> q1: "+d.value.q1+"<br>median: "+d.value.median+"<br> q3: "+d.value.q3+
            "<br>interQuantileRange: "+d.value.interQuantileRange+"<br>min: "+d.value.min+"<br>max: "+d.value.max;
        ;
    });
    
    g.svg.call(tip);


    // Show the main vertical line
    g.svg
        .selectAll("vertLines")
        .data(sumstat)
        .enter()
        .append("line")
        .attr("x1", function(d){return(x(d.key))})
        .attr("x2", function(d){return(x(d.key))})
        .attr("y1", function(d){return(y(Math.max(0,d.value.min)))})
        .attr("y2", function(d){return(y(d.value.max))})
        .attr("stroke", "black")
        .style("width", 40)

    // rectangle for the main box
    var boxWidth = 100
    g.svg
        .selectAll("boxes")
        .data(sumstat)
        .enter()
        .append("rect")
        .attr("x", function(d){return(x(d.key)-boxWidth/2)})
        .attr("y", function(d){return(y(d.value.q3))})
        .attr("height", function(d){return(y(d.value.q1)-y(d.value.q3))})
        .attr("width", boxWidth )
        .attr("stroke", "black")
        .style("fill", "#69b3a2")
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide);


    // Show the median
    g.svg
        .selectAll("medianLines")
        .data(sumstat)
        .enter()
        .append("line")
        .attr("x1", function(d){return(x(d.key)-boxWidth/2) })
        .attr("x2", function(d){return(x(d.key)+boxWidth/2) })
        .attr("y1", function(d){return(y(d.value.median))})
        .attr("y2", function(d){return(y(d.value.median))})
        .attr("stroke", "black")
        .style("width", 80)
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide);

    return g;
}