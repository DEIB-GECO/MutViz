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
    
    /*$scope.getMax = function(plotData) {
        
        f1 = plotData.f1;
        f2 = plotData.f2;
        
        maxF1 = f1.distances.map(function(b){return b[3]}).reduce(function(a, b) {return Math.max(a, b);});
        maxF2 = f2.distances.map(function(b){return b[3]}).reduce(function(a, b) {return Math.max(a, b);});
        
        return Math.max(maxF1, maxF2);
    }*/

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
        minMaxDistance = Math.min(file1.result[0].maxDistance, file2.result[0].maxDistance);


        // Slider
        if($scope.slider == null) {

            $scope.slider = document.getElementById("slider");

            dataRange = {
                min : -minMaxDistance,
                max : +minMaxDistance
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

    $scope.getP = function(p){
        P_float = parseFloat(p);
        if(P_float==0) return "< 1 e-4"
        else return p;

    }

    // Update the plot
    $scope.updatePlot = function(file1, file2, tumorType) {

        $scope.test.pvalue = null;

        // update function is defined in uc2.js.

        f1 = $rootScope.dist_files[file1.identifier];
        f2 = $rootScope.dist_files[file2.identifier];

        res1 = $rootScope.filterDistances(f1.result, $rootScope.tumorTypes.current.identifier);
        res2 = $rootScope.filterDistances(f2.result, $rootScope.tumorTypes.current.identifier);

        plotData = $scope.getData(file1.name, file2.name, res1, res2);

        uc2_update(plotData,
                   $scope.plot.d3graph,
                   $scope.plot.binSize, 
                   $scope.getSelectedTypes());
    } 


    // Update the plot according to the new bin size
    $scope.changeMutationType =  function() {
    

        $scope.test.pvalue = null;

        types = $scope.mutationTypes.selectedTypes.filter(function(t){return t.from !=null && t.to!=null});
        
        if(types.length==0) return;

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

        console.log(f1)

        res1 = $rootScope.filterDistances(f1.result, $rootScope.tumorTypes.current.identifier);
        res2 = $rootScope.filterDistances(f2.result, $rootScope.tumorTypes.current.identifier);

        dist1 = res1.distances;
        dist2 = res2.distances;

        bins1 = get_bins(dist1, $scope.mutationTypes.selectedTypes, $scope.plot.binSize,
                         $scope.slider.noUiSlider.get()[0], $scope.slider.noUiSlider.get()[1]);
        bins2 = get_bins(dist2, $scope.mutationTypes.selectedTypes, $scope.plot.binSize,
                         $scope.slider.noUiSlider.get()[0], $scope.slider.noUiSlider.get()[1]);


        console.log(bins1);

        reg1_start = -(f1.avgLength-1)/2
        reg1_stop  = +(f1.avgLength-1)/2

        reg2_start = -(f2.avgLength-1)/2
        reg2_stop  = +(f2.avgLength-1)/2


        region_bins1 = bins1.filter(function(bin){
            return reg1_start>=bin.x0  && reg1_start<bin.x1 || reg1_stop>bin.x0  && reg1_stop<=bin.x1 || (bin.x0>reg1_start && bin.x1<reg1_stop)
        }) 

        region_bins2 = bins2.filter(function(bin){
            return reg2_start>=bin.x0  && reg2_start<bin.x1 || reg2_stop>bin.x0  && reg2_stop<=bin.x1 || (bin.x0>reg2_start && bin.x1<reg2_stop)
        }) 

        flanking_bins1 =  bins1.filter(function(bin){
            return !region_bins1.includes(bin)
        }) 

        flanking_bins2 =  bins2.filter(function(bin){
            return !region_bins2.includes(bin)
        }) 


        function mapvalues(x){
            return x.map(function(x){return x[3];}).reduce(function(x,y){return x+y},0)
        }


        region_bins1_count = region_bins1.map(mapvalues).reduce(function(x,y){return x+y},0);
        region_bins2_count = region_bins2.map(mapvalues).reduce(function(x,y){return x+y},0);
        flanking_bins1_count = flanking_bins1.map(mapvalues).reduce(function(x,y){return x+y},0);
        flanking_bins2_count = flanking_bins2.map(mapvalues).reduce(function(x,y){return x+y},0);

        region_bins1_len =region_bins1.map(function(x){return Math.abs(x.x1-x.x0)}).reduce(function(x,y){return x+y},0);
        region_bins2_len =region_bins2.map(function(x){return Math.abs(x.x1-x.x0)}).reduce(function(x,y){return x+y},0);
        flanking_bins1_len = flanking_bins1.map(function(x){return Math.abs(x.x1-x.x0)}).reduce(function(x,y){return x+y},0);
        flanking_bins2_len = flanking_bins2.map(function(x){return Math.abs(x.x1-x.x0)}).reduce(function(x,y){return x+y},0);

        console.log("r1: "+reg1_start+"-"+reg1_stop)
        console.log("r2: "+reg2_start+"-"+reg2_stop)
        console.log(region_bins1)
        console.log(region_bins2)
        console.log(flanking_bins1)
        console.log(flanking_bins2)

        if(region_bins1_count==0) {
            region_bins1_count = flanking_bins1_count;
            region_bins1_len = flanking_bins1_len;
        }

        if(region_bins2_count==0) {
            region_bins2_count = flanking_bins2_count;
            region_bins2_len = flanking_bins2_len;
        }

        a = region_bins1_count/region_bins1_len
        b = flanking_bins1_count/flanking_bins1_len
        c = region_bins2_count/region_bins2_len
        d = flanking_bins2_count/flanking_bins2_len

        console.log("region_bins1_count:"+region_bins1_count)
        console.log("region_bins1_len:"+region_bins1_len)
        console.log("flanking_bins1_count:"+flanking_bins1_count)
        console.log("flanking_bins1_len:"+flanking_bins1_len)
        console.log("region_bins2_count:"+region_bins2_count)
        console.log("region_bins2_len:"+region_bins2_len)
        console.log("flanking_bins2_count:"+flanking_bins2_count)
        console.log("flanking_bins2_len:"+flanking_bins2_len)

        console.log("a: "+a+", b: "+b+", c: "+c+", d:"+d);
        request_body = {a:a,b:b,c:c,d:d};

        // Call the API
        $http({
            method: 'POST',
            data: $.param(request_body),
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            url: API_R01+"test"
        }).then(
            function success(response) {
               $scope.test.pvalue = response.data.p.toExponential(3);
            }
            , 
            function error(response) {
                console.error("error");
                window.alert("An error occurred.");
            }
        );



        //$scope.test.pvalue = uc23_test(norm1, norm2,f1.avgLength, f2.avgLength );


    }

    $scope.getData = function(name1, name2, res1, res2)  {

        // Extract distances for the proper tumorType
        data = {f1:{name:name1}, f2:{name:name2}}

        data.f1.distances = res1.distances

        data.f2.distances = res2.distances

        return data;
    }

});