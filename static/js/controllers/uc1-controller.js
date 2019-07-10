/* ####################
   UC1 Controller
   #################### */
app.controller('uc1_ctrl', function($scope, $rootScope, $routeParams, $http) {


    /* # Initialization # */
    window.scroll(0, 0);
    $rootScope.active_menu = "uc1";

    // Manage different kinds of tumor type
    $rootScope.tumorTypes = {
        current: null,
        available: []
    }

    // Type of motif (within junctions or generic motifs)
    $scope.motifsType = {
        current : "within_junctions",
        available: ["within_junctions", "generic"]
    }

    // Manage different kinds of mutation (- is used for deletions or insertions)
    $scope.mutationTypes = {
        fromList: ["A","C","T","G","*","-"],
        toList: ["A","C","T","G","*","-"],
        selectedTypes : [ {from: "A", to: "C"} ],
        invalidSelection: false, // to check whether conditions are mutually exclusive
        stacked: true // whether to use different colors for different mutation types or plot them with a single color
    }

    $scope.plot = {binSize: 10, d3graph: null, showTotal: true}
    $scope.slider = document.getElementById("slider");

    // Initialize with the first tumor type or with the example
    if($rootScope.tumorTypes.available.length>0) {
        if($routeParams.showExample=="1"){
            $scope.runExample();
        } else{
            $rootScope.tumorTypes.current = $rootScope.tumorTypes.available[0];
        }

        $scope.loadTumorType($rootScope.tumorTypes.current, $scope.motifsType.current);
    }

    // Load Melanoma and select mutations C>T and G>A
    $scope.runExample = function(){               
        $scope.mutationTypes.selectedTypes = [ {from: "C", to: "T"}, {from: "G", to: "A"} ];
        $rootScope.tumorTypes.current = $rootScope.tumorTypes.available.filter(function(t){return t.name=="Melanoma"})[0];
    }

    // This function is called when the user selects a different motif type
    $scope.loadMotifType = function(motifsType) {
        $scope.loadTumorType($rootScope.tumorTypes.current, motifsType);
    }

    // Load data for the provided tumor type ( the plot is (re)-initialized )
    $scope.loadTumorType = function(tumorType, motifsType) {
        console.log(tumorType);

        file = (motifsType == "within_junctions")? tumorType.in_junctions_file : tumorType.generic_file;

        d3.csv("./data/"+tumorType.folder+"/"+file, function(data) { 

            // Save data in the scope
            $scope.data = data.filter(function(d){return d.from.length==1 && d.to.length==1});

            // Coordinate available range as the minimum and maximum coordinate in the data
            dataRange = {
                min : -700,//d3.min(data, function(d) { return +d.dist }),
                max : +700 //d3.max(data, function(d) { return +d.dist })
            };


            // Initial selected range set between 1/4 and 3/4 of the coordinate space
            selectedRange = {
                min: dataRange.min+0.25*(dataRange.max-dataRange.min),
                max: dataRange.min+0.75*(dataRange.max-dataRange.min)
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
            $scope.plot.d3graph = uc1($scope.data, $scope.plot.binSize, selectedRange, $scope.getSelectedTypes(), 
                                      $scope.mutationTypes.stacked, $scope.plot.showTotal);

            // Set callback on slider change
            $scope.slider.noUiSlider.on('set.one', function () { 

                selectedRange = {
                    min: $scope.slider.noUiSlider.get()[0],
                    max: $scope.slider.noUiSlider.get()[1]
                };

                // Rescale the plot according to the new coordinate range. 
                // rescaleX function is defined in uc1.js.
                uc1_rescaleX($scope.data, $scope.plot.d3graph, $scope.plot.binSize, selectedRange, $scope.getSelectedTypes(),$scope.mutationTypes.stacked );

            });

        });
    }

    // Returns the valid mutation types selected in the interface
    $scope.getSelectedTypes = function() {
        st =  $scope.mutationTypes.selectedTypes.filter(function(t){return t.from!=undefined && t.to!=undefined});
        return st;
    }


    // Update the plot
    $scope.updatePlot = function() {
        // update function is defined in uc1.js.
        uc1_update($scope.data,$scope.plot.d3graph, $scope.plot.binSize, $scope.getSelectedTypes(),
                   $scope.mutationTypes.stacked, $scope.plot.showTotal);
    } 


    // Update the plot according to the new mutation type
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

    // Remove the provided condition on the mutation types
    $scope.removeCondition = function(condition) {
        $scope.mutationTypes.selectedTypes = $scope.mutationTypes.selectedTypes.filter(function(o){
            return o!=condition;
        });
        $scope.changeMutationType();
    }

});