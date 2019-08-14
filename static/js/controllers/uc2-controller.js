/* ####################
   UC2 Controller
   #################### */
app.controller('uc2_ctrl', function($scope, $rootScope, $routeParams, $http) {

    /* # Initialization # */
    window.scroll(0, 0);
    $rootScope.active_menu = "uc2";

    $scope.plot = {binSize: 10, d3graph: null}
    $scope.loaded = false;

    $scope.test = {pvalue:null}

    // Selected File
    $scope.file_selector = {name1: null, file1:null, name2:null, file2:null}

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
    $scope.load = function(filename1, filename2, tumorType) {

        $scope.file_selector.file1 = $rootScope.getSelectedFile(filename1);
        $scope.file_selector.file2 = $rootScope.getSelectedFile(filename2);

        file1 = $scope.file_selector.file1;
        file2 = $scope.file_selector.file2;


        if(file1==null || file2==null || tumorType==null) {
            console.log("Load: missing argument");
            return;
        }

        $scope.loaded = true;

        // Coordinate available range as the minimum and maximum coordinate in the data
        minMaxDistance = Math.min(file1.maxDistance, file2.maxDistance);
       
        if($scope.slider.noUiSlider == null) {
            dataRange = {
                min : -file.maxDistance,
                max : +file.maxDistance
            };
        } else {
            $scope.slider.noUiSlider.get()[0];
            dataRange = {
                min : $scope.slider.noUiSlider.get()[0],
                max : $scope.slider.noUiSlider.get()[1]
            };
        }


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
            $scope.updatePlot($scope.file_selector.file1, $scope.file_selector.file2, $rootScope.tumorTypes.current);
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

    $scope.doTest = function() {
        file1 = $scope.file_selector.file1;
        file2 = $scope.file_selector.file2;

        dist1 = $rootScope.getDistances(file1,$rootScope.tumorTypes.current)
        dist2 = $rootScope.getDistances(file2,$rootScope.tumorTypes.current)

        console.log(dist1);
        console.log(dist2);

        bins1 = get_bins(dist1, $scope.mutationTypes.selectedTypes, $scope.plot.binSize,
                         $scope.slider.noUiSlider.get()[0], $scope.slider.noUiSlider.get()[1]);
        bins2 = get_bins(dist2, $scope.mutationTypes.selectedTypes, $scope.plot.binSize,
                         $scope.slider.noUiSlider.get()[0], $scope.slider.noUiSlider.get()[1]);


        mbins1 = bins1.map(function(bin){
            return bin.map(function(mut){return mut[3]}).reduce(function(x,y){return x+y}, 0)
        })

        mbins2 = bins2.map(function(bin){
            return bin.map(function(mut){return mut[3]}).reduce(function(x,y){return x+y}, 0)
        })
        
        mutation_count = $rootScope.tumorTypes.current.mutation_count;
        
        norm1 = mbins1.map(function(x){return x/mutation_count});
        norm2 = mbins2.map(function(x){return x/mutation_count});

        console.log("bins");
        console.log(norm1);
        console.log(norm2);
        
        
        request_body = {"expected":norm1, "observed":norm2};

        // Call the API
        $http({
            method: 'POST',
            data: request_body,
            headers: {'Content-Type': 'application/json'},
            url: API_T02
        }).then(
            function success(response) {
                console.log(response);
                $scope.test.pvalue = response.data.pvalue.toFixed(3);
            },
            function error(response) {
                console.log(response);
                $scope.test.pvalue = "error";
            }
        );


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