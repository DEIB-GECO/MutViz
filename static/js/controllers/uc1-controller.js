/* ####################
   UC1 Controller
   #################### */
app.controller('uc1_ctrl', function($scope, $rootScope, $routeParams, $http) {

    /* # Initialization # */
    window.scroll(0, 0);
    $rootScope.active_menu = "uc1";

    $scope.plot = {binSize: 10, d3graph: null, showTotal: true}
    $scope.loaded = false;

    $scope.test = {area:{from:0, to:0, fromPosition:-$scope.plot.binSize/2, toPosition:$scope.plot.binSize/2, visible: true, L:null, H:null}};

    // Selected File
    $scope.file_selector = {name : null, file: null};
    

    // Initialize with the first tumor type or with the example
    if($rootScope.tumorTypes.available.length>0) {
        if($routeParams.showExample=="1"){
            $scope.runExample();
        } else{
            $rootScope.tumorTypes.current = $rootScope.tumorTypes.available[0];
        }

        //$scope.loadtumorType($rootScope.tumorTypes.current, $scope.motifsType.current);
    }

    $scope.doTest = function(file, tumorType) {

        if(Number.isNaN($scope.test.area.from) ||  Number.isNaN($scope.test.area.to))
            return;

        min = $scope.slider.noUiSlider.get()[0];
        max = $scope.slider.noUiSlider.get()[1];

        // Get binned
        bins = uc1_get_bins($rootScope.getDistances(file,tumorType),
                            $scope.getSelectedTypes(),
                            $scope.plot.binSize, 
                            min, 
                            max);

        full = bins.map(function(bin){
            return bin.map(function(mut){return mut[3]}).reduce(function(x,y){return x+y}, 0)
        })

        start = bins.filter(function(b){ return b.x0==$scope.test.area.fromPosition })[0];
        start_pos = bins.indexOf(start);
        stop = bins.filter(function(b){ return b.x1==$scope.test.area.toPosition })[0];
        stop_pos = bins.indexOf(stop);
        sliced = bins.slice(start_pos, stop_pos+1)

        selected = sliced.map(function(bin){
            return bin.map(function(mut){return mut[3]}).reduce(function(x,y){return x+y}, 0)
        })

        res = uc1_test(full, selected);
        $scope.test.L = res.L;
        $scope.test.H = res.H;

    }


    // Asks the backend to compute distances (if needed) and plots the result
    $scope.load = function(filename, tumorType) {
        file = $rootScope.getSelectedFile(filename);
        $scope.file_selector.file = file;
        
        console.log("loading "+filename);

        $scope.loaded = true;

        if(file==null || tumorType==null) {
            console.log("Load: missing argument");
            return;
        }

        // Coordinate available range as the minimum and maximum coordinate in the data
        dataRange = {
            min : -file.maxDistance,
            max : +file.maxDistance
        };

        // Slider
        $scope.slider = document.getElementById("slider");

        // Initial selected range set between 1/4 and 3/4 of the coordinate space
        selectedRange = {
            min: dataRange.min+0*(dataRange.max-dataRange.min),
            max: dataRange.min+1*(dataRange.max-dataRange.min)
        }

        // Initialize the slider
        if($scope.slider.noUiSlider == null) {

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

        }

        // Generate the plot
        $scope.plot.d3graph = uc1($rootScope.getDistances(file,tumorType), 
                                  $scope.plot.binSize, 
                                  selectedRange,
                                  $scope.getSelectedTypes(), 
                                  $rootScope.mutationTypes.stacked, 
                                  $scope.plot.showTotal);

        $scope.setDefaultArea();
        $scope.drawArea();

        // Set callback on slider change
        $scope.slider.noUiSlider.on('set.one', function () { 

            selectedRange = {
                min: $scope.slider.noUiSlider.get()[0],
                max: $scope.slider.noUiSlider.get()[1]
            };

            // Rescale the plot according to the new coordinate range. 
            // rescaleX function is defined in uc1.js.
            uc1_rescaleX($rootScope.getDistances(file,tumorType),
                         $scope.plot.d3graph,
                         $scope.plot.binSize, 
                         selectedRange,
                         $scope.getSelectedTypes(),
                         $rootScope.mutationTypes.stacked,
                         $scope.plot.showTotal);

            //$scope.setDefaultArea();
            $scope.drawArea();

        });


    }

    // Returns the valid mutation types selected in the interface
    $scope.getSelectedTypes = function() {
        st =  $rootScope.mutationTypes.selectedTypes.filter(function(t){return t.from!=undefined && t.to!=undefined});
        return st;
    }


    // Update the plot
    $scope.updatePlot = function(file, tumorType) {

        console.log(file);


        // Update function is defined in uc1.js.
        uc1_update( $rootScope.getDistances(file, tumorType),
                   $scope.plot.d3graph,
                   $scope.plot.binSize,
                   $scope.getSelectedTypes(),
                   $rootScope.mutationTypes.stacked, 
                   $scope.plot.showTotal);

        // $scope.setDefaultArea();
        $scope.drawArea();

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
            $scope.updatePlot($scope.file_selector.file, $rootScope.tumorTypes.current);
        }
    };

    // Set Default area
    $scope.setDefaultArea = function() {

        $scope.test.area.from = Math.floor($scope.slider.noUiSlider.get()[0]/3)-1;
        $scope.test.area.to = Math.ceil($scope.slider.noUiSlider.get()[1]/3);
        $scope.test.area.fromPosition = -$scope.plot.binSize/2; 
        $scope.test.area.fromPosition = $scope.plot.binSize/2; 

    }

    // Draw Area
    $scope.drawArea = function() {
        if( isNaN(parseInt($scope.test.area.from) )|| isNaN(parseInt($scope.test.area.to)) )
            return;

        if($scope.test.area.from>$scope.test.area.to)
            return;

        //todo: improve
        min = $scope.slider.noUiSlider.get()[0];
        max = $scope.slider.noUiSlider.get()[1];

        ticks = getTicks(min, max, $scope.plot.binSize);

        //left = -$scope.plot.binSize/2 +$scope.test.area.from*$scope.plot.binSize;
        //right = $scope.plot.binSize/2 +$scope.test.area.to*$scope.plot.binSize;

        left = Math.round(($scope.test.area.from)/$scope.plot.binSize)*$scope.plot.binSize-$scope.plot.binSize/2;
        right = Math.round(($scope.test.area.to)/$scope.plot.binSize)*$scope.plot.binSize+$scope.plot.binSize/2;

        console.log("left: "+left)
        console.log("right: "+left)

        if( left <= min )
            $scope.test.area.fromPosition = min;
        else if( left >= max)
            $scope.test.area.fromPosition = Math.floor(max/$scope.plot.binSize)*$scope.plot.binSize-$scope.plot.binSize/2;
        else 
            $scope.test.area.fromPosition = left;

        if( right <= min )
            $scope.test.area.toPosition = Math.ceil(min/$scope.plot.binSize)*$scope.plot.binSize+$scope.plot.binSize/2;
        else if( right >= max)
            $scope.test.area.toPosition = max;
        else 
            $scope.test.area.toPosition = right;


        uc1_highlightMotif($scope.plot.d3graph, {from:$scope.test.area.fromPosition, to: $scope.test.area.toPosition});
    }

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