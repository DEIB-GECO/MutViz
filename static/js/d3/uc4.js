var RECT_HEIGHT = 50;

// List of available colors
var uc4_colors = ["#4e79a7","#f28e2c","#e15759","#76b7b2","#59a14f","#edc949","#af7aa1","#ff9da7","#9c755f","#bab0ab", "#808000", "#ffd8b1", "#000075", "#a9a9a9", "#ffffff", "#000000"];


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
function uc4_highlightMotif(g) {

    return;

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
function uc4_addTracks(g, data) {

    g.svg.selectAll()
        .data(data, function(d) {return d.group+':'+d.variable;})
        .enter()
        .append("rect")
        .attr("x", function(d) { return g.xAxisScale(d.group) })
        .attr("y", function(d) { return g.y(d.variable) })
        .attr("width", function(b){return g.xAxisScale(b.x1)-g.xAxisScale(b.x0)} )
        .attr("height", g.y.bandwidth() ) 
        .style("fill", function(d) { return uc4_getColor(d.value)} )
}


// Filter data taking only mutations with type in mutationTypes (array of selected mutation types)
function uc4_getFilteredData(data, mutationTypes) {

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
function uc4_update(data, g, binSize, mutationTypes) {

    // bins intervals centered on 0
    ticks =  getTicks(g.xAxisScale.domain()[0], g.xAxisScale.domain()[1], binSize);

    // Configure the histogram function
    var histogram = d3.histogram()
    .value(function(d) {return d[0]})
    .domain(g.xAxisScale.domain())       
    .thresholds(ticks); 


    // Binned data (array, one element is the binned data for a specific tumor type in data)
    binned = data.map(function(tumorType){return histogram(uc4_getFilteredData(tumorType.data, mutationTypes));});

    // Max elements contained in a bin (array, one for each binned data in binned)
    maxx = binned.map(function(bins){ return d3.max(bins, function(d) { return +yVal(d) }); });

    // Add to each bin the normalized value
    var normalized = binned.map(function(bins,i){  

        return bins.map( function(b){
            b.value = yVal(b) / maxx[i];
            b.variable = data[i].type;
            b.group = b.x0;
            return b;
        });
    });


    // Different tracks titles
    var types = data.map(function(d){return d.type});

    // Setup y axis
    g.y = d3.scaleBand()
        .range([ g.height, 0 ])
        .domain(types)
        .padding(0.01);

    g.yAxis.call(d3.axisLeft(g.y));

    // Rotate y-axis labels
    $(".y-axis text").attr("transform", "rotate(270) translate(25,-17)");


    // Merge all binned data (the different type is tracked by the property "variable" within each bin)
    union = binned.reduce(function(a,b){return a.concat(b)});

    // Add the tracks to the plot
    uc4_addTracks(g, union);



}

/* This function rescales the x axis, given the new provided domain (range) */
function uc4_rescaleX(data, g, binSize, range, mutationTypes) {

    g.xAxisScale = d3.scaleLinear().domain([range.min,range.max]).range([0, g.width]);

    g.xAxis
        .transition()
        .duration(500)
        .call(d3.axisBottom(g.xAxisScale).tickFormat(function(d) { return d3.format(".2s")(d); }));

    // Recompute the bins and rebuild the plot
    uc4_update(data, g, binSize, mutationTypes);
}

/* Build the graph with an initial number of bins */
function uc4(data, mutationTypes, tumorType, width, height, animate) {


    console.log("width: "+width);

    console.log("called uc4 with data: ");
    console.log(mutationTypes);
    console.log(tumorType);

    var g = {} // here we put all useful objects describing our plot
    console.log(mutationTypes.length);

    g.titleBoxHeight = 25;

    g.distance = 10; // between successive plots
    // Set the dimensions and margins of the plot
    g.margin = {top: 0, right: 0, bottom: 30, left: 50};
    g.width  = (width-1.5*g.margin.left-g.distance*(mutationTypes.length-1))/mutationTypes.length;
    g.height = height - 2*g.margin.top;

    console.log("width: "+g.width)

    // Remove any pre-existing plot
    d3.select("#uc4 svg").html("");

    g.html = d3.select("#uc4 svg");

    g.svg = [];
    g.xAxis = [];
    g.yAxis = [];

    g.xAxisDistance = 0;

    g.yMax = Math.max.apply(null, data.filter(function(t){return t.tumorType==tumorType.identifier})[0].data.filter(
        function(entry){
            return mutationTypes.map(function(el){return el.from+"-"+el.to}).includes(entry[0]+"-"+entry[1]);
        }).map(function(entry){return entry[4]}));

    // leave same space above the maximum
    g.yMax =  g.yMax + 0.1* g.yMax;

    console.log("yMax: "+g.yMax);

    mutationTypes.forEach(function(mutationType,index) {

        actual_data = data.filter(function(t){return t.tumorType==tumorType.identifier})[0].data.filter(
            function(entry){
                return entry[0]==mutationType.from && entry[1]==mutationType.to && entry[0]!=entry[1];
            });

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
            return "<strong>"+d[2]+"-"+d[3]+"</strong> <span style='color:yellow'>" + d[4].toFixed(3) + "</span>";
        });

        g.svg[index].call(tip);

        // Scale the range of the data in the domains
        g.xAxis[index].domain(actual_data.map(function(d) { return d[2]+"-"+d[3]; }));
        g.yAxis[index].domain([0, g.yMax]);

        // append the rectangles for the bar chart
        if(animate){
            g.svg[index].selectAll(".bar")
                .data(actual_data)
                .enter().append("rect")
                .attr("class", "bar")
                .attr("x", function(d) { return g.xAxis[index](d[2]+"-"+d[3]); })
                .attr("width", g.xAxis[index].bandwidth())
                .attr("height", function(d) { return g.height + g.titleBoxHeight- g.yAxis[index](0); }) // always equal to 0
                .attr("y", function(d) { return g.yAxis[index](0); })
            //.attr("y", function(d) { return g.yAxis[index](d[4])+g.titleBoxHeight  })
            //.attr("height", function(d) { return g.height - g.yAxis[index](d[4]); })
                .style("fill",uc4_colors[index])
                .on('mouseover', tip.show)
                .on('mouseout', tip.hide);
        } else {
            g.svg[index].selectAll(".bar").data(actual_data)
                .enter().append("rect")
                .attr("class", "bar")
                .attr("x", function(d) { return g.xAxis[index](d[2]+"-"+d[3]); })
                .attr("width", g.xAxis[index].bandwidth())
                .attr("y", function(d) { return g.yAxis[index](d[4])+g.titleBoxHeight  })
                .attr("height", function(d) { return g.height - g.yAxis[index](d[4]); })
                .style("fill",uc4_colors[index])
                .on('mouseover', tip.show)
                .on('mouseout', tip.hide);
        }

        g.svg[index].selectAll("rect")
            .transition()
            .duration(1000)
            .attr("y", function(d) { return g.yAxis[index](d[4])+g.titleBoxHeight; })
            .attr("height", function(d) { return g.height - g.yAxis[index](d[4]); })
            .delay(function(d,i){console.log(i) ; return(i*100)})

        // add the x Axis
        g.svg[index].append("g")
            .attr("class", "xaxis")
            .attr("transform", "translate(0," + (g.height +g.xAxisDistance + g.titleBoxHeight)+ ")")
            .style("font-size", "0.7em")
            .call(d3.axisBottom(g.xAxis[index]));

        g.svg[index].selectAll(".xaxis text").attr("transform", "translate(-13,+20) rotate(-90)");

        // add the y Axis
        if(index==0){
            g.svg[index].append("g")
                .attr("transform", "translate(-5,"+g.titleBoxHeight+")")
                .style("font-size", "0.8em")
                .call(d3.axisLeft(g.yAxis[index]));
        }

        g.svg[index].append("rect")
            .attr("x", 0)
            .attr("y", g.titleBoxHeight)
            .attr("height", g.height+g.xAxisDistance)
            .attr("width", g.width)
            .style("stroke", "black")
            .style("fill", "none")
            .style("stroke-width", 2);



        g.svg[index].append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("height", g.titleBoxHeight)
            .attr("width", g.width)
            .style("stroke", "black")
            .style("fill", "#efefef")
            .style("stroke-width", 2);

        g.svg[index].append("text")
            .attr("x", g.width/2)
            .attr("y", g.titleBoxHeight / 2)
            .attr("dy", ".35em")
            .style("stroke", "black")
            .text(mutationType.from+">"+mutationType.to);

    });


    // Label for the x axis 
    /*g.svg.append("text")             
        .attr("transform",
              "translate(" + (g.width/2) + " ," + 
              (g.height + g.margin.top + 30) + ")")
        .style("text-anchor", "middle")
        .style("font-size", "0.8em")
        .text("triplets");*/


    // Compute the bins and build the plot
    //uc4_update(data, g, binSize, mutationTypes);

    // Return the plot description
    return g;
}