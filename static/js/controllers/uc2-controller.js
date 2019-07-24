/* ####################
   UC2 Controller
   #################### */
app.controller('uc2_ctrl', function($scope, $rootScope, $routeParams, $http) {

    /* # Initialization # */
    window.scroll(0, 0);
    $rootScope.active_menu = "uc2";

    $scope.plot = {binSize: 10, d3graph: null}
    $scope.loaded = false;

    // Selected File
    $scope.selectedFile1 = null;
    $scope.selectedFile2 = null;

    // Initialize with the first tumor type
    if($rootScope.tumorTypes.available.length>0) {
        if($routeParams.showExample=="1"){
            $scope.runExample();
        } else{
            $rootScope.tumorTypes.current = $rootScope.tumorTypes.available[0];
        }
        //$scope.load($rootScope.tumorTypes.current);
    }


    // Asks the backend to compute distances (if needed) and plots the result
    $scope.load = function(file1, file2, tumorType) {
        $scope.loaded = true;

        if(file1==null || file2==null || tumorType==null) {
            console.log("Load: missing argument");
            return;
        }

        // Coordinate available range as the minimum and maximum coordinate in the data
        minMaxDistance = Math.min(file1.maxDistance, file2.maxDistance);
        dataRange = {
            min : -minMaxDistance,
            max : +minMaxDistance
        };


        // Slider
        $scope.slider = document.getElementById("slider");

        // Initial selected range set between 1/4 and 3/4 of the coordinate space
        selectedRange = {
            min: dataRange.min+0*(dataRange.max-dataRange.min),
            max: dataRange.min+1*(dataRange.max-dataRange.min)
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
        $scope.plot.d3graph = uc2($scope.getData(file1, file2, tumorType),
                                  $scope.plot.binSize,
                                  selectedRange,
                                  $scope.getSelectedTypes());

        // Set callback on slider change
        $scope.slider.noUiSlider.on('set.one', function () { 

            selectedRange = {
                min: $scope.slider.noUiSlider.get()[0],
                max: $scope.slider.noUiSlider.get()[1]
            };

            // Rescale the plot according to the new coordinate range. 
            // rescaleX function is defined in uc2.js.
            uc2_rescaleX($scope.getData(file1, file2, tumorType), 
                         $scope.plot.d3graph,
                         $scope.plot.binSize, 
                         selectedRange,
                         $scope.getSelectedTypes());

        });


    }

    // Returns the valid mutation types selected in the interface
    $scope.getSelectedTypes = function() {
        st =  $scope.mutationTypes.selectedTypes.filter(function(t){return t.from!=undefined && t.to!=undefined});
        return st;
        return st;
    }


    // Update the plot
    $scope.updatePlot = function(file1, file2, tumorType) {
        console.log(tumorType)
        // update function is defined in uc2.js.

        uc2_update($scope.getData(file1, file2, tumorType),
                   $scope.plot.d3graph,
                   $scope.plot.binSize, 
                   $scope.getSelectedTypes());
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
            $scope.updatePlot($scope.selectedFile1, $scope.selectedFile2, $rootScope.tumorTypes.current);
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

    // Load Melanoma and select mutations C>T and G>A
    $scope.runExample = function(){               
        $scope.mutationTypes.selectedTypes = [ {from: "C", to: "T"}, {from: "G", to: "A"} ];
        $rootScope.tumorTypes.current = $rootScope.tumorTypes.available.filter(function(t){return t.name=="Melanoma"})[0];
    }

    $scope.getData = function(file1, file2, tumorType)  {

        // Extract distances for the proper tumorType
        data = {f1:{name:file1.name}, f2:{name:file2.name}}

        data.f1.distances = file1.distances.filter(
            function(x){return x.tumorType==tumorType.identifier
                       })[0].distances.filter(function(x){return x[1].length==1 && x[2].length==1})

        data.f2.distances = file2.distances.filter(
            function(x){return x.tumorType==tumorType.identifier
                       })[0].distances.filter(function(x){return x[1].length==1 && x[2].length==1})

        return data;
    }

});