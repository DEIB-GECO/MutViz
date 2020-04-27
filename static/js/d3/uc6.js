var RECT_HEIGHT = 50;

// List of available colors
var uc6_colors = ["rgb(70, 130, 180)","#f28e2c","#e15759","#76b7b2","#59a14f","#edc949","#af7aa1","#ff9da7","#9c755f","#bab0ab", "#808000", "#ffd8b1", "#000075", "#a9a9a9", "#ffffff", "#000000"];


/* Build the graph with an initial number of bins */
function uc6(data, width, height) {


    console.log("width: "+width);

    console.log("called uc6 with data: ");


    var g = {} // here we put all useful objects describing our plot


    g.titleBoxHeight = 0;

    g.distance = 10; // between successive plots
    // Set the dimensions and margins of the plot
    g.margin = {top: 0, right: 0, bottom: 30, left: 50};
    g.width  = (width-1.5*g.margin.left);
    g.height = height - 2*g.margin.top;

    console.log("width: "+g.width)

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

    console.log("yMax: "+g.yMax);

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
        return "<strong>"+d.signature+"</strong> <span style='color:yellow'>" + d.value.toFixed(3) + "</span>";
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
        .delay(function(d,i){console.log(i) ; return(i*10)})

    // add the x Axis
    g.svg[index].append("g")
        .attr("class", "xaxis")
        .attr("transform", "translate(0," + (g.height +g.xAxisDistance + g.titleBoxHeight)+ ")")
        .style("font-size", "0.7em")
        .call(d3.axisBottom(g.xAxis[index]));

    g.svg[index].selectAll(".xaxis text").attr("transform", "translate(-13,+30) rotate(-90)");

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









// Label for the x axis 
/*g.svg.append("text")             
        .attr("transform",
              "translate(" + (g.width/2) + " ," + 
              (g.height + g.margin.top + 30) + ")")
        .style("text-anchor", "middle")
        .style("font-size", "0.8em")
        .text("triplets");*/


// Compute the bins and build the plot
//uc6_update(data, g, binSize, mutationTypes);

// Return the plot description
return g;
}