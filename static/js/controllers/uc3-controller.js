/* ####################
   UC4 Controller
   #################### */
app.controller('uc3_ctrl', function($scope, $rootScope, $routeParams, $timeout, $http) {

    /* # Initialization # */
    window.scroll(0, 0);
    $rootScope.active_menu = "uc3";

    $scope.plot = {binSize: 10, d3graph: null}
    $scope.loaded = false;

    // status
    $scope.execution = {running:false};

    $scope.test = {area:{from:0, to:0, fromPosition:-$scope.plot.binSize/2, toPosition:$scope.plot.binSize/2, visible: true, L:null, H:null}};

    // Selected File
    $scope.file_selector = {file: null};

    $scope.pollUC1 = function(filename, jobID) {

        console.log("Polling "+filename+ " "+jobID);


        $http({method: 'GET', url: API_JOBS+ jobID}).then(
            function success(response) {
                if( response.data.ready == true) {

                    console.log("result for "+ jobID+" is ready");

                    // Add the new file to the local list of files together with the answer
                    $rootScope.dist_files[filename].result = response.data.result;

                    $scope.load($rootScope.dist_files[filename].result, true);
                    $scope.execution.running = false;

                } else {

                    // schedule another call
                    $timeout($scope.pollUC1, POLLING_TIMEOUT, true, filename, jobID);

                }
            }, 
            function error(response) {

                // Attempt another computation
                console.error("Error polling for uc1.");
                $scope.execution.running = false;
                window.alert("An error occurred.");

            }
        );
    }

    $scope.loadFile = function(file) {

        $scope.loaded = false;

        filename = file.identifier;
        console.log("Load "+filename);

        $("#uc3").html("<svg></svg>")

        $scope.execution.running = true;


        if( filename in $rootScope.dist_files && "result" in $rootScope.dist_files[filename] ){ 
            $scope.load($rootScope.dist_files[filename].result, true);
            $scope.execution.running = false;
            return;
        } else {

            request_body = {
                file_name: filename,
                maxDistance: $rootScope.maxDistance 
            }

            // Call the API
            $http({
                method: 'POST',
                data: $.param(request_body),
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                url: API_R01
            }).then(
                function success(response) {
                    $rootScope.dist_files[filename] = file;
                    $scope.pollUC1(filename, response.data.jobID);
                }
                , 
                function error(response) {
                    console.error("error");
                    $scope.execution.running = false;
                    window.alert("An error occurred.");
                }
            );


        }

    }


    // Load data for the provided tumor type ( the plot is (re)-initialized )
    $scope.load = function(result) {
        
        selectedTumorTypes = $rootScope.selectedTumorTypes;

        $("svg").css("height", 100+145*selectedTumorTypes.length);

        $scope.test.pvalue = null;

        $scope.loaded = true;


        // Slider
        if($scope.slider == null) {

            $scope.slider = document.getElementById("slider");

            dataRange = {
                min : -1000,
                max : +1000
            };

            selectedRange = {
                min: dataRange.min+0*(dataRange.max-dataRange.min),
                max: dataRange.min+1*(dataRange.max-dataRange.min)
            }

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

        } else {
            selectedRange = {
                min: $scope.slider.noUiSlider.get()[0],
                max: $scope.slider.noUiSlider.get()[1]
            }
        }

        // Generate the plot
        data = $scope.getData(result, selectedTumorTypes);
        
        // Save last result
        $rootScope.lastResult = JSON.stringify(data);
        
        //todo:check $("#uc1 svg").css("height", (data.length*150)+"px");
        $scope.plot.d3graph = uc3(data,
                                  $scope.plot.binSize,
                                  selectedRange, $scope.getSelectedTypes());

        // Set callback on slider change
        $scope.slider.noUiSlider.on('set.one', function () { 

            $scope.test.pvalue = null;
            $scope.$apply();

            selectedRange = {
                min: $scope.slider.noUiSlider.get()[0],
                max: $scope.slider.noUiSlider.get()[1]
            };

            // Rescale the plot according to the new coordinate range. 
            // rescaleX function is defined in uc3.js.
            uc3_rescaleX($scope.getData(result, selectedTumorTypes),
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

        $scope.test.pvalue = null;

        // update function is defined in uc3.js.
        uc3_update($scope.getData(file, selectedTumorTypes),
                   $scope.plot.d3graph,
                   $scope.plot.binSize,
                   $scope.getSelectedTypes());
    } 


    // Update the plot according to the new bin size
    $scope.changeMutationType  =  function() {

        $scope.test.pvalue = null;

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
            $scope.updatePlot($scope.file_selector.file, $rootScope.selectedTumorTypes);
        }
    };

    $scope.doTest = function() {

        if($rootScope.selectedTumorTypes.length != 2)
            return;

        file = $rootScope.dist_files[$scope.file_selector.file.identifier].result

        type1 = $rootScope.selectedTumorTypes[0]
        type2 = $rootScope.selectedTumorTypes[1]
        
        console.log($scope.mutationTypes.selectedTypes);

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


        $scope.test.pvalue = uc23_test(norm1, norm2);

        /*
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
        );*/


    }

    $scope.getData = function(file, selectedTumorTypes){

        function getDist(file, typeId) {
            return file.filter(
                function(x){return x.tumorType==typeId
                           })[0].distances.filter(function(x){return x[1].length==1 && x[2].length==1})
        }


        return selectedTumorTypes.map(function(t){
            return {type: t.identifier, data: getDist(file, t.identifier)} 
        });
    }

    $scope.addTumorType = function(type) {
        if(type!=undefined) { 
            $rootScope.selectedTumorTypes.push(type);
            $scope.loadFile($scope.file_selector.file); 

        }
    }

    $scope.removeTumorType = function(type) {
        $rootScope.selectedTumorTypes = $rootScope.selectedTumorTypes.filter(function(t){return t!=type});
        if($rootScope.selectedTumorTypes.length>0)
            $scope.loadFile($scope.file_selector.file)
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
        $rootScope.selectedTumorTypes = $rootScope.tumorTypes.available.slice(0,4);

        $scope.loadFile($scope.file_selector.file)
    }

});