/* ####################
   UC4 Controller
   #################### */
app.controller('uc3_ctrl', function($scope, $rootScope, $routeParams, $timeout, $http) {

    /* # Initialization # */
    window.scroll(0, 0);
    $rootScope.active_menu = "uc3";

    $scope.plot = {binSize: 10, d3graph: null}
    $scope.loaded = false;

    $scope.selectedTumorTypes = [];

    $scope.test = {area:{from:0, to:0, fromPosition:-$scope.plot.binSize/2, toPosition:$scope.plot.binSize/2, visible: true, L:null, H:null}};

    // Selected File
    $scope.files_selector = {name : null, file: null};

    // Initialize with the first tumor type
    if($rootScope.tumorTypes.available.length>0) {
        if($routeParams.showExample=="1"){
            $scope.runExample();
        } else {
            $scope.selectedTumorTypes = [$rootScope.tumorTypes.available[0]];

            //$scope.loadTumorType($scope.selectedTumorTypes[0], $scope.motifsType.current);
        }
    }


    // Load data for the provided tumor type ( the plot is (re)-initialized )
    $scope.load = function(filename, selectedTumorTypes) {

        console.log("carico file "+filename);

        $scope.loaded = true;

        file = $rootScope.getSelectedFile(filename);
        $scope.files_selector.file = file;


        if(file==null)
            return;


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
        data = $scope.getData(file, selectedTumorTypes);
        $("#uc1 svg").css("height", (data.length*150)+"px");
        $scope.plot.d3graph = uc3(data,
                                  $scope.plot.binSize,
                                  selectedRange, $scope.getSelectedTypes());

        // Set callback on slider change
        $scope.slider.noUiSlider.on('set.one', function () { 

            selectedRange = {
                min: $scope.slider.noUiSlider.get()[0],
                max: $scope.slider.noUiSlider.get()[1]
            };

            // Rescale the plot according to the new coordinate range. 
            // rescaleX function is defined in uc3.js.
            uc3_rescaleX($scope.getData(file, selectedTumorTypes),
                         $scope.plot.d3graph,
                         $scope.plot.binSize, 
                         selectedRange, $scope.getSelectedTypes());

        });


    }

    // Returns the valid mutation types selected in the interface
    $scope.getSelectedTypes = function() {
        st =  $scope.mutationTypes.selectedTypes.filter(function(t){return t.from!=undefined && t.to!=undefined});
        return st;
    }


    // Update the plot
    $scope.updatePlot = function(file, selectedTumorTypes) {
        // update function is defined in uc3.js.
        uc3_update($scope.getData(file, selectedTumorTypes),
                   $scope.plot.d3graph,
                   $scope.plot.binSize,
                   $scope.getSelectedTypes());
    } 


    // Update the plot according to the new bin size
    $scope.changeMutationType  =  function() {

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
            $scope.updatePlot($scope.files_selector.file, $scope.selectedTumorTypes);
        }
    };

    $scope.doTest = function() {

        if($scope.selectedTumorTypes.length != 2)
            return;

        file = $scope.files_selector.file;

        type1 = $scope.selectedTumorTypes[0]
        type2 = $scope.selectedTumorTypes[1]

        dist1 = $rootScope.getDistances(file,type1)
        dist2 = $rootScope.getDistances(file,type2)

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

        mutation_count_1 = type1.mutation_count;
        mutation_count_2 = type2.mutation_count;

        norm1 = mbins1.map(function(x){return x/mutation_count_1});
        norm2 = mbins2.map(function(x){return x/mutation_count_2});


        console.log("bins");
        console.log(norm1);
        console.log(norm2);


        request_body = {"expected":norm1, "observed":norm2};

        // Call the API
        $http({
            method: 'POST',
            data: request_body,
            headers: {'Content-Type': 'application/json'},
            url: API_T03
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

    $scope.getData = function(file, selectedTumorTypes){


        function getDist(file, typeId) {
            return file.distances.filter(
                function(x){return x.tumorType==typeId
                           })[0].distances.filter(function(x){return x[1].length==1 && x[2].length==1})
        }


        return selectedTumorTypes.map(function(t){
            return {type: t.identifier, data: getDist(file, t.identifier)} 
        });
    }

    $scope.addTumorType = function(type) {
        if(type!=undefined) { 
            $scope.selectedTumorTypes.push(type);
            $scope.load($scope.files_selector.name, $scope.selectedTumorTypes); 

        }
    }

    $scope.removeTumorType = function(type) {
        $scope.selectedTumorTypes = $scope.selectedTumorTypes.filter(function(t){return t!=type});
        if($scope.selectedTumorTypes.length>0)
            $scope.load($scope.files_selector.name, $scope.selectedTumorTypes)
    }


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
        $scope.selectedTumorTypes = $rootScope.tumorTypes.available.slice(0,4);

        $scope.load($scope.files_selector.name, $scope.selectedTumorTypes)
    }

});