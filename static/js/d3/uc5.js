var RECT_HEIGHT = 50;


// List of available colors
var uc5_colors = ["#4e79a7","#f28e2c","#e15759","#76b7b2","#59a14f","#edc949","#af7aa1","#ff9da7","#9c755f","#bab0ab", "#808000", "#ffd8b1", "#000075", "#a9a9a9", "#ffffff", "#000000"];

function uc5_tt(data, showOutliers,mutationTypes, width, height, left_margin) {

    var g = {} // here we put all useful objects describing our plot

    g.html = d3.select("#uc5 svg");

    g.titleBoxHeight = 25;

    g.distance = 10; // between successive plots
    // Set the dimensions and margins of the plot
    g.margin = {top: 20, right: 0, bottom: 30, left: 50};
    g.width  = width-40;
    g.height = height - 2*g.margin.top - 50;



    // append the svg object to the body of the page
    g.svg = g.html.append("g")
        .attr("transform",
              "translate(" + (left_margin-40) + "," + g.margin.top + ")");

    // Compute quartiles, median, inter quantile range min and max --> these info are then used to draw the box.
    var sumstat = d3.nest() // nest function allows to group the calculation per level of a factor
    .key(function(d) { return d.mutation;})
    .rollup(function(d) {
        q1 = d3.quantile(d.map(function(d) { return d.count;}).sort(d3.ascending),.25)
        median = d3.quantile(d.map(function(d) { return d.count;}).sort(d3.ascending),.5)
        q3 = d3.quantile(d.map(function(d) { return d.count;}).sort(d3.ascending),.75)
        interQuantileRange = q3 - q1
        min = Math.max(0, q1 - 1.5 * interQuantileRange)
        max = Math.round(q3 + 1.5 * interQuantileRange)
        return({q1: q1, median: median, q3: q3, interQuantileRange: interQuantileRange, min: min, max: max})
    })
    .entries(data);

    //Outliers computation

    if(showOutliers){

        outliers = []

        sumstat.forEach(function(s){

            otl = data.filter(function(d){return d.mutation==s.key && (d.count<s.value.min || d.count>s.value.max)});

            outliers = outliers.concat(otl);

        })
    }

    g.yMax = Math.max.apply(null, sumstat.map(function(entry){return entry.value.max}));


    if(showOutliers && outliers.length>0) {
        maxOutliers = Math.max.apply(null, outliers.map(function(o){return o.count;}))
        console.log("the real max is "+maxOutliers)
        if(maxOutliers>g.yMax) g.yMax = maxOutliers;
    }
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
    var boxWidth = 50
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



    // Outliers dots
    if(showOutliers){
        var tip_outliers = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10, 0])
        .html(function(d) {
            return "<strong style='color:yellow'>"+d.mutation+"</strong> <br> donor_id: "+d.donor_id+"<br>count: "+d.count;;
        });

        g.svg.call(tip_outliers);

        // Update outliers.
        g.svg.selectAll("circle.outlier")
            .data(outliers)
            .enter().append("circle", "text")
            .attr("class", "outlier")
            .attr("r", 3)
            .attr("cx", function(d){return x(d.mutation)} )
            .attr("cy", function(d){return y(d.count)} )
            .style("opacity", 1)
            .attr("stroke", "black")
            .attr("fill", "rgb(240, 249, 255)")
            .on('mouseover', tip_outliers.show)
            .on('mouseout', tip_outliers.hide);
    }



    return g;

}

/* Build the graph with an initial number of bins */
function uc5(data, showOutliers, mutationTypes, width, height, trinucleotide) {
    
  

    // Remove any pre-existing plot
    d3.select("#uc5 svg").html("");

    var g = {} // here we put all useful objects describing our plot


    g.html = d3.select("#uc5 svg").attr("width",width+0.25*width).attr("height",height);

    g.titleBoxHeight = 25;

    g.distance = 10; // between successive plots
    // Set the dimensions and margins of the plot
    g.margin = {top: 20, right: 0, bottom: 30, left: 50};
    g.width  = (width-2*g.margin.left)-40;
    g.height = height - 2*g.margin.top-50;



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
        min = Math.max(0, q1 - 1.5 * interQuantileRange)
        max = Math.round(q3 + 1.5 * interQuantileRange)
        return({q1: q1, median: median, q3: q3, interQuantileRange: interQuantileRange, min: min, max: max})
    })
    .entries(data)

    //Outliers computation

    if(showOutliers){
        outliers = []

        sumstat.forEach(function(s){

            otl = data.filter(function(d){
                return d.mutation==s.key && (d.count<s.value.min || d.count>s.value.max)

            });
            outliers = outliers.concat(otl);

        })
    }


    g.yMax = Math.max.apply(null, sumstat.map(function(entry){return entry.value.max}));


    if(showOutliers && outliers.length>0) {
        maxOutliers = Math.max.apply(null, outliers.map(function(o){return o.count;}))
        if(maxOutliers>g.yMax) g.yMax = maxOutliers;

    }

    // leave same space above the maximum
    g.yMax =  g.yMax + 0.1*g.yMax;

    // Show the X scale
    var x = d3.scaleBand()
    .range([ 0, g.width ])
    .domain(mutationTypes)
    .paddingInner(1)
    .paddingOuter(.5)
    g.svg.append("g").attr("class", "xaxis")
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
    var boxWidth = 50
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
            return "<strong style='color:yellow'>"+d.mutation+"</strong> <br> donor_id: "+d.donor_id+"<br>count: "+d.count;;
        });

        g.svg.call(tip_outliers);

        // Update outliers.
        g.svg.selectAll("circle.outlier")
            .data(outliers)
            .enter().append("circle", "text")
            .attr("class", "outlier")
            .attr("r", 3)
            .attr("cx", function(d){return x(d.mutation)} )
            .attr("cy", function(d){return y(d.count)} )
            .style("opacity", 1)
            .attr("stroke", "black")
            .attr("fill", "rgb(240, 249, 255)")
            .on('mouseover', tip_outliers.show)
            .on('mouseout', tip_outliers.hide);
    }

    return g;
}

/* Build the graph with an initial number of bins */
function uc5_tri(data,showOutliers, mutationTypes, befaft, width, height) {

    var g = {} // here we put all useful objects describing our plot

    mutationTypes = mutationTypes.map(function(m){return {"from":m[0], "to":m[2]}})

    g.titleBoxHeight = 25;

    g.distance = 10; // between successive plots
    // Set the dimensions and margins of the plot
    g.margin = {top: 0, right: 0, bottom: 30, left: 50};
    g.width  = (width-1.5*g.margin.left-g.distance*(mutationTypes.length-1))/mutationTypes.length;
    g.height = height - 2*g.margin.top - 100;


    // Remove any pre-existing plot
    d3.select("#uc5 svg").html("");

    g.html = d3.select("#uc5 svg").attr("width",width).attr("height",height);

    g.svg = [];
    g.xAxis = [];
    g.yAxis = [];

    g.xAxisDistance = 0;


    // Compute quartiles, median, inter quantile range min and max --> these info are then used to draw the box.
    var sumstat = d3.nest() // nest function allows to group the calculation per level of a factor
    .key(function(d) { return d.mutation;})
    .rollup(function(d) {
        q1 = d3.quantile(d.map(function(d) { return d.count;}).sort(d3.ascending),.25)
        median = d3.quantile(d.map(function(d) { return d.count;}).sort(d3.ascending),.5)
        q3 = d3.quantile(d.map(function(d) { return d.count;}).sort(d3.ascending),.75)
        interQuantileRange = q3 - q1
        min = Math.max(0, q1 - 1.5 * interQuantileRange)
        max = Math.round(q3 + 1.5 * interQuantileRange)
        return({q1: q1, median: median, q3: q3, interQuantileRange: interQuantileRange, min: min, max: max})
    })
    .entries(data)


    g.yMax = Math.max.apply(null, data.filter(
        function(entry){
            return mutationTypes.map(function(el){return el.from+">"+el.to}).includes(entry["mutation"]);
        }).map(function(entry){return entry["count"]}));


    g.yMax = Math.max.apply(null, sumstat.map(function(entry){return entry.value.max}));



    if(showOutliers){
        outliers = []

        sumstat.forEach(function(s){

            otl = data.filter(function(d){
                return d.mutation==s.key && (d.count<s.value.min || d.count>s.value.max)

            });
            outliers = outliers.concat(otl);

        })
    }

    if(showOutliers && outliers.length>0) {
        maxOutliers = Math.max.apply(null, outliers.map(function(o){return o.count;}))
        if(maxOutliers>g.yMax) g.yMax = maxOutliers;

    }

    // leave same space above the maximum
    g.yMax =  g.yMax + 0.1*g.yMax;


    mutationTypes.forEach(function(mutationType,index) {



        actual_data = data.filter(
            function(entry){
                return entry["mutation"]==mutationType.from+">"+mutationType.to;
            });

        // Setup the plot container
        x_translate = (g.margin.left + index*g.width+index*g.distance);
        g.svg[index]  = g.html 
            .append("g")
            .attr("transform","translate(" +x_translate + "," + (g.margin.top+g.titleBoxHeight) + ")");

        // Setup the x axis

        // Show the X scale
        // Scale the range of the data in the domains
        g.xAxis[index] = d3.scaleBand()
            .range([0, g.width])
            .padding(0.1);

        g.xAxis[index].domain(befaft);


        // Show the Y scale
        g.yAxis[index]= d3.scaleLinear()
            .domain([0,g.yMax])
            .range([g.height-0, 0])
        



        // tooltip
        var tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10, 0])
        .html(function(d) {
            return "<strong style='color:yellow'>"+d.mutation+"</strong> <br> q1: "+d.value.q1+"<br>median: "+d.value.median+"<br> q3: "+d.value.q3+
                "<br>interQuantileRange: "+d.value.interQuantileRange+"<br>min: "+d.value.min+"<br>max: "+d.value.max;
            ;
        });


        g.svg[index].call(tip);



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

        localType = mutationType.from+">"+mutationType.to;

        local_stats = sumstat.filter(function(s){
            return s.key.includes(mutationType.from+">"+mutationType.to)
        })


        local_outliers = [];

        // leave same space above the maximum
        if(showOutliers){

            local_stats.forEach(function(s){

                otl = data.filter(function(d){
                    return d.mutation==s.key && (d.count<s.value.min || d.count>s.value.max)

                });
                local_outliers = local_outliers.concat(otl);

            })
        }


        local_stats = local_stats.map(function(s){
            
            s.mutation = s.key;
            s.key = s.key[0]+"-"+s.key[6];
            return s;
        });




        // Show the main vertical line
        g.svg[index]
            .selectAll("vertLines")
            .data(local_stats)
            .enter()
            .append("line")
            .attr("x1", function(d){return(g.xAxis[index](d.key) + g.xAxis[index].bandwidth()/2)})
            .attr("x2", function(d){return(g.xAxis[index](d.key) + g.xAxis[index].bandwidth()/2)})
            .attr("y1", function(d){return(g.titleBoxHeight + g.yAxis[index](Math.max(0,d.value.min)))})
            .attr("y2", function(d){return( g.titleBoxHeight + g.yAxis[index](d.value.max))})
            .attr("stroke", "black")
            .style("width", 40)

        // rectangle for the main box
        g.svg[index]
            .selectAll("boxes")
            .data(local_stats)
            .enter()
            .append("rect")
            .attr("x", function(d){return(1+g.xAxis[index](d.key))})
            .attr("y", function(d){return(g.titleBoxHeight + g.yAxis[index]( d.value.q3))})
            .attr("height", function(d){return(g.yAxis[index](d.value.q1)-g.yAxis[index](d.value.q3))})
            .attr("width",   g.xAxis[index].bandwidth()-2 )
            .attr("stroke", "black")
            .style("fill", "#69b3a2")
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide);



        // Show the median
        g.svg[index]
            .selectAll("medianLines")
            .data(local_stats)
            .enter()
            .append("line")
            .attr("x1", function(d){return(g.xAxis[index](d.key)+1) })
            .attr("x2", function(d){return(g.xAxis[index](d.key)+ g.xAxis[index].bandwidth()-1) })
            .attr("y1", function(d){return(g.titleBoxHeight + g.yAxis[index](d.value.median))})
            .attr("y2", function(d){return(g.titleBoxHeight + g.yAxis[index](d.value.median))})
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
                return "<strong style='color:yellow'>"+d.mutation+"</strong> <br> donor_id: "+d.donor_id+"<br>count: "+d.count;;
            });


            g.svg[index].call(tip_outliers);

            // Update outliers.
            g.svg[index].selectAll("circle.outlier")
                .data(local_outliers)
                .enter().append("circle", "text")
                .attr("class", "outlier")
                .attr("r", 3)
                .attr("cx", function(d){return (g.xAxis[index](d.mutation[0]+"-"+d.mutation[6]) + g.xAxis[index].bandwidth()/2)} )
                .attr("cy", function(d){return g.titleBoxHeight +g.yAxis[index](d.count)} )
                .style("opacity", 1)
                .attr("stroke", "black")
                .attr("fill", "rgb(240, 249, 255)")
                .on('mouseover', tip_outliers.show)
                .on('mouseout', tip_outliers.hide);
        }



        g.svg[index].append("rect")
            .attr("x", 0)
            .attr("y", g.titleBoxHeight)
            .attr("height", g.height+g.xAxisDistance)
            .attr("width", g.width)
            .style("stroke", "black")
            .style("fill", "none")
            .style("stroke-width", 1);



        g.svg[index].append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("height", g.titleBoxHeight)
            .attr("width", g.width)
            .style("stroke", "black")
            .style("fill", "#efefef")
            .style("stroke-width", 1);

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
