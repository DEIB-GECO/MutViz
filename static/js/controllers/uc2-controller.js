/* ####################
   UC2 Controller
   #################### */
app.controller('uc2_ctrl', function($scope, $rootScope, $routeParams, $http) {

    /* # Initialization # */
    window.scroll(0, 0);
    $rootScope.active_menu = "uc2";


    // Manage different kinds of tumor type
    $scope.tumorTypes = {
        current: null,
        available: []
    }

    // Manage different kinds of mutation (- is used for deletions or insertions)
    $scope.mutationTypes = {
        fromList: ["A","C","T","G","*","-"],
        toList: ["A","C","T","G","*","-"],
        selectedTypes : [ {from: "*", to: "*"} ],
        invalidSelection: false, // to check whether conditions are mutually exclusive
        stacked: true // whether to use different colors for different mutation types or plot them with a single color
    }

    $scope.plot = {binSize: 10, d3graph: null}
    $scope.slider = document.getElementById("slider");

    // Retrieve the list of available tumor types
    $http({method: 'GET', url:  "./data/data-list.json"})
        .then(
        // SUCCESS
        function(response) {
            $scope.tumorTypes.available = response.data.types;

            // Initialize with the first tumor type
            if($scope.tumorTypes.available.length>0) {
                if($routeParams.showExample=="1"){
                    $scope.runExample();
                } else{
                    $scope.tumorTypes.current = $scope.tumorTypes.available[0];
                }
                $scope.loadTumorType($scope.tumorTypes.current);
            }

        }).catch(
        // ERROR
        function(response) {
            console.error("Error while retrieving the list of tumor types.")
        }
    );

    // Load Melanoma and select mutations C>T and G>A
    $scope.runExample = function(){               
        $scope.mutationTypes.selectedTypes = [ {from: "C", to: "T"}, {from: "G", to: "A"} ];
        $scope.tumorTypes.current = $scope.tumorTypes.available.filter(function(t){return t.name=="Melanoma"})[0];
    }

    // Load data for the provided tumor type ( the plot is (re)-initialized )
    $scope.loadTumorType = function(type) {

        console.log("Loading tumor type: "+type.name);

        d3.csv("./data/"+type.folder+"/motifs_in_junctions.csv", function(data_junctions) { 
            d3.csv("./data/"+type.folder+"/motifs.csv", function(data_nojunctions) { 


                // Save data in the scope
                $scope.data = {
                    junctions : data_junctions.filter(function(d){return d.from.length==1 && d.to.length==1}),
                    nojunctions : data_nojunctions.filter(function(d){return d.from.length==1 && d.to.length==1})
                }


                // Coordinate available range as the minimum and maximum coordinate in the data
                dataRange = {
                    min : -500,//d3.min(data_junctions.concat(data_nojunctions), function(d) { return +d.dist }),
                    max : 500//d3.max(data_junctions.concat(data_nojunctions), function(d) { return +d.dist })
                };


                // Initial selected range set between 1/4 and 3/4 of the coordinate space
                selectedRange = {
                    min: -300,
                    max: 300
                }


                // Initialize the slider
                if($scope.slider.noUiSlider != null)
                    $scope.slider.noUiSlider.destroy() 

                noUiSlider.create($scope.slider, {
                    start: [selectedRange.min, selectedRange.max],
                    connect: true,
                    range: {
                        'min': dataRange.min,
                        'max': dataRange.max
                    },
                    // Show a scale with the slider
                    pips: {
                        mode: 'positions',
                        values: [0, 25, 50, 75, 100],
                        density: 4
                    },

                    tooltips: true,

                    format: wNumb({
                        decimals: 0
                    })
                });

                // Generate the plot
                $scope.plot.d3graph = uc2($scope.data, $scope.plot.binSize, selectedRange, $scope.getSelectedTypes());

                // Set callback on slider change
                $scope.slider.noUiSlider.on('set.one', function () { 

                    selectedRange = {
                        min: $scope.slider.noUiSlider.get()[0],
                        max: $scope.slider.noUiSlider.get()[1]
                    };

                    // Rescale the plot according to the new coordinate range. 
                    // rescaleX function is defined in uc2.js.
                    uc2_rescaleX($scope.data, $scope.plot.d3graph, $scope.plot.binSize, selectedRange, $scope.getSelectedTypes());

                });

            }) });
    }

    // Returns the valid mutation types selected in the interface
    $scope.getSelectedTypes = function() {
        st =  $scope.mutationTypes.selectedTypes.filter(function(t){return t.from!=undefined && t.to!=undefined});
        return st;
    }


    // Update the plot
    $scope.updatePlot = function() {
        // update function is defined in uc2.js.
        uc2_update($scope.data,$scope.plot.d3graph, $scope.plot.binSize, $scope.getSelectedTypes());
    } 


    // Update the plot according to the new bin size
    $scope.changeMutationType =  function() {

        types = $scope.mutationTypes.selectedTypes.filter(function(t){return t.from !=null && t.to!=null});

        // Make conditions exclusive
        exclusive = types.map( function(t){ 

            others = types.filter(function(o){return o!=t});

            // exists the same condition than once
            if(types.filter(function(t1){return t1.from==t.from && t1.to==t.to}).length>1)
                return false;

            if( t.to == "*") {
                return !others.map(function(t1){return t1.from}).includes(t.from) &&
                    !others.map(function(t1){return t1.from}).includes("*")  
            } else if(t.from == "*") {
                return !others.map(function(t1){return t1.to}).includes(t.to) &&
                    !others.map(function(t1){return t1.to}).includes("*");
            } else {
                return true; 
            }
        });


        exclusive = exclusive.reduce(function(a,b){return a&&b});

        if(!exclusive) {
            $scope.mutationTypes.invalidSelection = true;
        } else {
            $scope.mutationTypes.invalidSelection = false;
            $scope.updatePlot();
        }
    };


    // Add a new empty condition for mutation types
    $scope.addCondition = function() {
        $scope.mutationTypes.selectedTypes.push({from: null, to: null});
    }

    // Remove a condition on the mutation types
    $scope.removeCondition = function(condition) {
        $scope.mutationTypes.selectedTypes = $scope.mutationTypes.selectedTypes.filter(function(o){
            return o!=condition;
        });
        $scope.changeMutationType();
    }

});