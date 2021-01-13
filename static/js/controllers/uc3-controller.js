/* ####################
   UC4 Controller
   #################### */
app.controller('uc3_ctrl', function($scope, $rootScope, $routeParams, $timeout, $http) {

    /* # Initialization # */
    window.scroll(0, 0);
    $rootScope.active_menu = "uc3";

    $scope.plot = {binSize: 10, d3graph: null, normalizeByMean:false}
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
        
        console.log(result);
        console.log("ciao");


        // Slider
        if($scope.slider == null) {

            $scope.slider = document.getElementById("slider");

            dataRange = {
                min : -result[0].maxDistance,
                max : +result[0].maxDistance
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
                                  selectedRange, $scope.getSelectedTypes(),
                                  $scope.plot.normalizeByMean);

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
                         selectedRange, $scope.getSelectedTypes(),
                         $scope.plot.normalizeByMean);

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
        uc3_update($scope.getData(file.result, selectedTumorTypes),
                   $scope.plot.d3graph,
                   $scope.plot.binSize,
                   $scope.getSelectedTypes(),
                   $scope.plot.normalizeByMean);
    } 


    // Update the plot according to the new bin size
    $scope.changeMutationType  =  function() {

        $scope.test.pvalue = null;

        types = $scope.mutationTypes.selectedTypes.filter(function(t){return t.from !=null && t.from !="" && t.to!=null && t.to!="" && t.from !=t.to});
        
        if(types.length!=$scope.mutationTypes.selectedTypes.length) return;

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



    $scope.getP = function(p){
        P_float = parseFloat(p);
        if(P_float==0) return "< 1 e-4"
        else return p;

    }

    $scope.doTest = function() {

        if($rootScope.selectedTumorTypes.length != 2)
            return;

        f = $rootScope.dist_files[$scope.file_selector.file.identifier]


        console.log(f.result);

        type1 = $rootScope.selectedTumorTypes[0].identifier;
        type2 = $rootScope.selectedTumorTypes[1].identifier;

        res1 = $rootScope.filterDistances(f.result, type1);
        res2 = $rootScope.filterDistances(f.result, type2);

        dist1 = res1.distances;
        dist2 = res2.distances;



        bins1 = get_bins(dist1, $scope.mutationTypes.selectedTypes, $scope.plot.binSize,
                         $scope.slider.noUiSlider.get()[0], $scope.slider.noUiSlider.get()[1]);
        bins2 = get_bins(dist2, $scope.mutationTypes.selectedTypes, $scope.plot.binSize,
                         $scope.slider.noUiSlider.get()[0], $scope.slider.noUiSlider.get()[1]);


        reg1_start = -(f.avgLength-1)/2
        reg1_stop  = +(f.avgLength-1)/2

        reg2_start = -(f.avgLength-1)/2
        reg2_stop  = +(f.avgLength-1)/2

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