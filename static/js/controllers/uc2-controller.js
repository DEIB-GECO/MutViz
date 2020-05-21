/* ####################
   UC2 Controller
   #################### */
app.controller('uc2_ctrl', function($scope, $rootScope, $routeParams, $http, $timeout) {

    /* # Initialization # */
    window.scroll(0, 0);
    $rootScope.active_menu = "uc2";

    $scope.plot = {binSize: 10, d3graph: null}
    $scope.loaded = false;

    // status
    $scope.execution = {running:false};

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

    $scope.pollUC1 = function(filename, filename1, filename2, jobID) {

        console.log("Polling "+filename+" "+filename1+" "+filename2+" "+jobID);


        $http({method: 'GET', url: API_JOBS+ jobID}).then(
            function success(response) {
                if( response.data.ready == true) {

                    console.log("result for "+ jobID+":"+filename+" is ready, f1: "+filename1+" f2: "+filename2);

                    // Add the new file to the local list of files together with the answer
                    $rootScope.dist_files[filename].result = response.data.result;

                    if(filename1 in $rootScope.dist_files &&  "result" in $rootScope.dist_files[filename1] &&
                       filename2 in $rootScope.dist_files &&  "result" in $rootScope.dist_files[filename2] ){

                        f1 = $rootScope.dist_files[filename1];
                        f2 = $rootScope.dist_files[filename2];
                        
                        descr = filename1+" "+filename2

                        $scope.load(f1, f2, descr);
                        $scope.execution.running = false;
                    }


                } else {

                    $timeout($scope.pollUC1, POLLING_TIMEOUT, true, filename,  filename1, filename2, jobID);

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

    $scope.loadFiles = function(file1, file2) {

        $scope.loaded = false;

        filename1 = file1.identifier;
        filename2 = file2.identifier;
        
        console.log("Load "+filename1+" "+filename2);

        $("#uc2").html("<svg></svg>")

        $scope.execution.running = true;

        if( filename1 in $rootScope.dist_files && "result" in $rootScope.dist_files[filename1] 
           && filename2 in $rootScope.dist_files && "result" in $rootScope.dist_files[filename2] ){ 
            
            console.log("using cached")

            f1 = $rootScope.dist_files[filename1];
            f2 =  $rootScope.dist_files[filename2];

            $scope.load(f1, f2);
            $scope.execution.running = false;
        } else {
            console.log("asking to api")
            function onlyUnique(value, index, self) { 
                return self.indexOf(value) === index;
            }
            
            [file1,file2].filter(onlyUnique).forEach(function(file){
                
                console.log("asking to api file: "+file.identifier)

                if(!(file.identifier in $rootScope.dist_files)) {

                    request_body = {
                        file_name: file.identifier,
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
                            $rootScope.dist_files[file.identifier] = file;
                            $scope.pollUC1(file.identifier, file1.identifier, file2.identifier, response.data.jobID);
                        }
                        , 
                        function error(response) {
                            console.error("error");
                            $scope.execution.running = false;
                            window.alert("An error occurred.");
                        }
                    );
                }

            })


        }

    }

    // Asks the backend to compute distances (if needed) and plots the result
    $scope.load = function(file1, file2, descr) {

        console.log("plotting "+file1.identifier+" "+file2.identifier+" descr:"+descr);
        
        $("svg").css("height", window.innerHeight);

        $scope.test.pvalue = null;

        // Filter by selected tumor type
        res1 = $rootScope.filterDistances(file1.result, $rootScope.tumorTypes.current.identifier);
        res2 = $rootScope.filterDistances(file2.result, $rootScope.tumorTypes.current.identifier);
        
        plotData = $scope.getData(file1.name, file2.name, res1, res2);


        $scope.loaded = true;

        // Coordinate available range as the minimum and maximum coordinate in the data
        minMaxDistance = Math.min(file1.result.maxDistance, file2.result.maxDistance);


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

        // Save last result
        $rootScope.lastResult = JSON.stringify(plotData);
        
        // Generate the plot
        $scope.plot.d3graph = uc2(plotData,
                                  $scope.plot.binSize,
                                  selectedRange,
                                  $scope.getSelectedTypes());

        // Set callback on slider change
        $scope.slider.noUiSlider.on('set.one', function () { 

            $scope.test.pvalue = null;
            $scope.$apply();

            selectedRange = {
                min: $scope.slider.noUiSlider.get()[0],
                max: $scope.slider.noUiSlider.get()[1]
            };

            // Rescale the plot according to the new coordinate range. 
            // rescaleX function is defined in uc2.js.
            uc2_rescaleX(plotData,
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

        $scope.test.pvalue = null;

        // update function is defined in uc2.js.

        f1 = $rootScope.dist_files[file1.identifier];
        f2 = $rootScope.dist_files[file2.identifier];

        res1 = $rootScope.filterDistances(f1.result, $rootScope.tumorTypes.current.identifier);
        res2 = $rootScope.filterDistances(f2.result, $rootScope.tumorTypes.current.identifier);
        
        plotData = $scope.getData(file1.identifier, file2.identifier, res1, res2);

        uc2_update(plotData,
                   $scope.plot.d3graph,
                   $scope.plot.binSize, 
                   $scope.getSelectedTypes());
    } 


    // Update the plot according to the new bin size
    $scope.changeMutationType =  function() {

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

        f1 = $rootScope.dist_files[$scope.file_selector.file1.identifier];
        f2 = $rootScope.dist_files[$scope.file_selector.file2.identifier];

        res1 = $rootScope.filterDistances(f1.result, $rootScope.tumorTypes.current.identifier);
        res2 = $rootScope.filterDistances(f2.result, $rootScope.tumorTypes.current.identifier);

        dist1 = res1.distances;
        dist2 = res2.distances;

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

        $scope.test.pvalue = uc23_test(norm1, norm2);

       
    }

    $scope.getData = function(name1, name2, res1, res2)  {

        // Extract distances for the proper tumorType
        data = {f1:{name:name1}, f2:{name:name2}}

        data.f1.distances = res1.distances

        data.f2.distances = res2.distances

        return data;
    }

});