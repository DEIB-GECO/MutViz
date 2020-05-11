var RECT_HEIGHT = 50;

// List of available colors
var uc6_colors = ["rgb(70, 130, 180)","#f28e2c","#e15759","#76b7b2","#59a14f","#edc949","#af7aa1","#ff9da7","#9c755f","#bab0ab", "#808000", "#ffd8b1", "#000075", "#a9a9a9", "#ffffff", "#000000"];

/* Build the graph with an initial number of bins */
function uc6_box(data, showOutliers, signatures, width, height) {


    // Remove any pre-existing plot
    d3.select("#uc6 svg").html("");

    var g = {} // here we put all useful objects describing our plot


    g.html = d3.select("#uc6 svg");

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
    .key(function(d) { return d.signature;})
    .rollup(function(d) {
        q1 = d3.quantile(d.map(function(d) { return d.value;}).sort(d3.ascending),.25)
        median = d3.quantile(d.map(function(d) { return d.value;}).sort(d3.ascending),.5)
        q3 = d3.quantile(d.map(function(d) { return d.value;}).sort(d3.ascending),.75)
        interQuantileRange = q3 - q1
        min = q1 - 1.5 * interQuantileRange
        max = q3 + 1.5 * interQuantileRange
        return({q1: q1, median: median, q3: q3, interQuantileRange: interQuantileRange, min: min, max: max})
    })
    .entries(data)

    console.log(sumstat);

    //Outliers computation

    if(showOutliers){
        outliers = []

        sumstat.forEach(function(s){

            otl = data.filter(function(d){return d.signature==s.key && (d.value<s.value.min || d.value>s.value.max)});
            console.log("doing union")
            outliers = outliers.concat(otl);

        })
        console.log("outliers total: "+outliers.length)
    }


    g.yMax = Math.max.apply(null, sumstat.map(function(entry){return entry.value.max}));


    if(showOutliers && outliers.length>0) {
        maxOutliers = Math.max.apply(null, outliers.map(function(o){return o.count;}))
        if(maxOutliers>g.yMax) g.yMax = maxOutliers;

    }

    // leave same space above the maximum
    g.yMax =  g.yMax + 0.2*g.yMax;

    if(g.yMax>1) g.yMax = 1;

    // Show the X scale
    var x = d3.scaleBand()
    .range([ 0, g.width ])
    .domain(signatures)
    .paddingInner(1)
    .paddingOuter(.5)


    g.svg.append("g")
        .attr("class", "xaxis")
        .attr("transform", "translate(0," +(g. height + g.margin.top)+")")
        .style("font-size", "1em")
        .call(d3.axisBottom(x))
    g.svg.selectAll(".xaxis text").attr("transform", "translate(-13,+37) rotate(-90)");

    // Show the Y scale
    var y = d3.scaleLinear()
    .domain([0,g.yMax])
    .range([g.height, 0])

    if(g.yMax<0.01) {
        g.svg.append("g").style("font-size", "0.7em").call(d3.axisLeft(y).tickFormat(d3.format(".1e")));
    } else {
        g.svg.append("g").style("font-size", "0.9em").call(d3.axisLeft(y));
    }


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
        .attr("y2", function(d){return y(Math.min(1,d.value.max))   })
        .attr("stroke", "black")
        .style("width", 40)

    // rectangle for the main box
    var boxWidth = 10
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


    // Outliers dots
    if(showOutliers){
        var tip_outliers = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10, 0])
        .html(function(d) {
            //donor_id: "+d.donor_id+"
            return "<strong style='color:yellow'>"+d.signature+"</strong> <br>count: "+d.value;;
        });

        g.svg.call(tip_outliers);

        // Update outliers.
        g.svg.selectAll("circle.outlier")
            .data(outliers)
            .enter().append("circle", "text")
            .attr("class", "outlier")
            .attr("r", 5)
            .attr("cx", function(d){return x(d.signature)} )
            .attr("cy", function(d){return y(d.value)} )
            .style("opacity", 1)
            .attr("stroke", "black")
            .attr("fill", "rgb(240, 249, 255)")
            .on('mouseover', tip_outliers.show)
            .on('mouseout', tip_outliers.hide);
    }



    return g;
}


/* Build the graph with an initial number of bins */
function uc6(data, width, height) {

    var g = {} // here we put all useful objects describing our plot


    g.titleBoxHeight = 0;

    g.distance = 10; // between successive plots
    // Set the dimensions and margins of the plot
    g.margin = {top: 0, right: 0, bottom: 30, left: 50};
    g.width  = (width-1.5*g.margin.left);
    g.height = height - 2*g.margin.top;


    // Remove any pre-existing plot
    d3.select("#uc6 svg").html("");

    g.html = d3.select("#uc6 svg");

    g.svg = [];
    g.xAxis = [];
    g.yAxis = [];

    g.xAxisDistance = 10;

    g.yMax = Math.max.apply(null, data.map(function(entry){return entry.value}));

    // leave same space above the maximum
    g.yMax =  g.yMax + 0.1* g.yMax;

    index = 0;


    // Setup the plot container
    x_translate = (g.margin.left + index*g.width+index*g.distance);
    g.svg[index]  = g.html 
        .append("g")
        .attr("transform","translate(" +x_translate + "," + (g.margin.top+g.titleBoxHeight) + ")");

    // Setup the x axis

    // set the ranges
    g.xAxis[index] = d3.scaleBand()
        .range([0, g.width])
        .padding(0.1);
    g.yAxis[index] = d3.scaleLinear()
        .range([g.height-20, 0]);

    var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(function(d) {
        return "<strong>"+d.signature+"</strong> <span style='color:yellow'>" + d.value + "</span>";
    });

    g.svg[index].call(tip);

    // Scale the range of the data in the domains
    g.xAxis[index].domain(data.map(function(d) { return d.signature; }));
    g.yAxis[index].domain([0, g.yMax]);

    // append the rectangles for the bar chart
    g.svg[index].selectAll(".bar")
        .data(data)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", function(d) { return g.xAxis[index](d.signature); })
        .attr("width", g.xAxis[index].bandwidth())
        .attr("height", function(d) { return g.height - g.yAxis[index](0); }) // always equal to 0
        .attr("y", function(d) { return g.yAxis[index](0); })
    //.attr("y", function(d) { return g.yAxis[index](d.value)+g.titleBoxHeight  })
    //.attr("height", function(d) { return g.height - g.yAxis[index](d.value); })
        .style("fill",uc6_colors[index])
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide);


    g.svg[index].selectAll("rect")
        .transition()
        .duration(800)
        .attr("y", function(d) { return g.yAxis[index](d.value); })
        .attr("height", function(d) { return g.height - g.yAxis[index](d.value); })
        .delay(function(d,i){console.log(" ") ; return(i*10)})

    // add the x Axis
    g.svg[index].append("g")
        .attr("class", "xaxis")
        .attr("transform", "translate(0," + (g.height +g.xAxisDistance + g.titleBoxHeight)+ ")")
        .style("font-size", "0.7em")
        .call(d3.axisBottom(g.xAxis[index]));

    g.svg[index].selectAll(".xaxis text").attr("transform", "translate(-13,+30) rotate(-90)");


    if(g.yMax<0.001) {
        to_call = d3.axisLeft(g.yAxis[index]).tickFormat(d3.format(".1e"));
    } else {
        to_call = d3.axisLeft(g.yAxis[index]);
    }

    // add the y Axis
    if(index==0){
        g.svg[index].append("g")
            .attr("transform", "translate(-5,"+g.titleBoxHeight+")")
            .style("font-size", "0.8em")
            .call(to_call);
    }

    g.svg[index].append("rect")
        .attr("x", 0)
        .attr("y", g.titleBoxHeight)
        .attr("height", g.height+g.xAxisDistance)
        .attr("width", g.width)
        .style("stroke", "black")
        .style("fill", "none")
        .style("stroke-width", 2);


    return g;
}