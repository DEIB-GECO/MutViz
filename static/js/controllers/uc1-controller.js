/* ####################
   UC1 Controller
   #################### */
app.controller('uc1_ctrl', function($scope, $rootScope, $routeParams, $http) {

    /* # Initialization # */
    window.scroll(0, 0);
    $rootScope.active_menu = "uc1";

    $scope.plot = {binSize: 10, d3graph: null, showTotal: true}
    $scope.loaded = false;

    // Selected File
    $scope.selectedFile = null;

    // Initialize with the first tumor type or with the example
    if($rootScope.tumorTypes.available.length>0) {
        if($routeParams.showExample=="1"){
            $scope.runExample();
        } else{
            $rootScope.tumorTypes.current = $rootScope.tumorTypes.available[0];
        }

        //$scope.loadtumorType($rootScope.tumorTypes.current, $scope.motifsType.current);
    }


    // Asks the backend to compute distances (if needed) and plots the result
    $scope.load = function(file, tumorType) {

        $scope.loaded = true;

        if(file==null || tumorType==null) {
            console.log("Load: missing argument");
            return;
        }

        // Extract distances for the proper tumorType
        distances = file.distances.filter(
            function(x){return x.tumorType==tumorType.identifier
                       })[0].distances


        distances = distances.filter(function(x){return x[1].length==1 && x[2].length==1})

        // Coordinate available range as the minimum and maximum coordinate in the data
        dataRange = {
            min : -file.maxDistance,
            max : +file.maxDistance
        };

        // Slider
        $scope.slider = document.getElementById("slider");

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

            tooltips: false,

            format: wNumb({
                decimals: 0
            })
        });

        // Generate the plot
        $scope.plot.d3graph = uc1(distances, 
                                  $scope.plot.binSize, 
                                  selectedRange,
                                  $scope.getSelectedTypes(), 
                                  $rootScope.mutationTypes.stacked, 
                                  $scope.plot.showTotal);

        // Set callback on slider change
        $scope.slider.noUiSlider.on('set.one', function () { 

            selectedRange = {
                min: $scope.slider.noUiSlider.get()[0],
                max: $scope.slider.noUiSlider.get()[1]
            };

            // Rescale the plot according to the new coordinate range. 
            // rescaleX function is defined in uc1.js.
            uc1_rescaleX(distances,
                         $scope.plot.d3graph,
                         $scope.plot.binSize, 
                         selectedRange,
                         $scope.getSelectedTypes(),
                         $rootScope.mutationTypes.stacked,
                         $scope.plot.showTotal);

        });


    }

    // Returns the valid mutation types selected in the interface
    $scope.getSelectedTypes = function() {
        st =  $rootScope.mutationTypes.selectedTypes.filter(function(t){return t.from!=undefined && t.to!=undefined});
        return st;
    }


    // Update the plot
    $scope.updatePlot = function(file, tumorType) {

        distances = file.distances.filter(function(x){return x.tumorType==tumorType.identifier})[0].distances;

        // Update function is defined in uc1.js.
        uc1_update(distances,
                   $scope.plot.d3graph,
                   $scope.plot.binSize,
                   $scope.getSelectedTypes(),
                   $rootScope.mutationTypes.stacked, 
                   $scope.plot.showTotal);
    } 


    // Update the plot according to the new mutation type
    $scope.changeMutationType =  function() {

        types = $rootScope.mutationTypes.selectedTypes.filter(function(t){return t.from !=null && t.to!=null});

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
            $rootScope.mutationTypes.invalidSelection = true;
        } else {
            $rootScope.mutationTypes.invalidSelection = false;
            $scope.updatePlot($scope.selectedFile, $rootScope.tumorTypes.current);
        }
    };


    // Add a new empty condition for mutation types
    $scope.addCondition = function() {
        $rootScope.mutationTypes.selectedTypes.push({from: null, to: null});
    }

    // Remove the provided condition on the mutation types
    $scope.removeCondition = function(condition) {
        $rootScope.mutationTypes.selectedTypes = $rootScope.mutationTypes.selectedTypes.filter(function(o){
            return o!=condition;
        });
        $scope.changeMutationType();
    }

    // Load Melanoma and select mutations C>T and G>A
    $scope.runExample = function(){               
        $rootrootScope.mutationTypes.selectedTypes = [ {from: "C", to: "T"}, {from: "G", to: "A"} ];
        $rootScope.tumorTypes.current = $rootScope.tumorTypes.available.filter(function(t){return t.name=="Melanoma"})[0];
    }

});