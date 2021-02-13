/* ####################
   uc6 Controller
   #################### */
app.controller('uc6_ctrl', function($scope, $rootScope, $routeParams, $timeout, $http) {

    /* # Initialization # */
    window.scroll(0, 0);
    $rootScope.active_menu = "uc6";

    $scope.defaultMutationTypes = [];

    $scope.selectedTypes =  $scope.defaultMutationTypes.map(function(x){return x;});
    $scope.addingType = {};

    $scope.plot = { d3graph: null}
    $scope.loaded = false;

    $scope.getSelectedFile = function(fileName) {
        return $scope.files_fake.filter(function(f){return f.name == fileName})[0];
    }

    // cache
    $scope.uc6_files = {}

    // status
    $scope.execution = {running:false};

    // outliers
    $scope.outliers = {show:true}

    $scope.MIN_PATIENTS = 5;
    $scope.threshold = {active:false, minMutations: 0}


    $scope.barPlot = true;

    $scope.signatures = ['SBS1', 'SBS2', 'SBS3', 'SBS4', 'SBS5', 'SBS6', 'SBS7a', 'SBS7b',
                         'SBS7c', 'SBS7d', 'SBS8', 'SBS9', 'SBS10a', 'SBS10b', 'SBS11', 'SBS12',
                         'SBS13', 'SBS14', 'SBS15', 'SBS16', 'SBS17a', 'SBS17b', 'SBS18',
                         'SBS19', 'SBS20', 'SBS21', 'SBS22', 'SBS24', 'SBS26', 'SBS28', 'SBS30',
                         'SBS31', 'SBS32', 'SBS33', 'SBS34', 'SBS35', 'SBS36', 'SBS37', 'SBS38',
                         'SBS39', 'SBS40', 'SBS41', 'SBS44', 'SBS84', 'SBS85'];


    $scope.pollUC6 = function(filename, jobID) {

        console.log("Polling "+filename+ " "+jobID);

        $http({method: 'GET', url: API_JOBS+ jobID}).then(
            function success(response) {
                if( response.data.ready == true) {

                    console.log("result for "+ jobID+" is ready");

                    // Add the new file to the local list of files together with the answer
                    if( Object.keys($rootScope.filter.conditions).length==0 )
                        $scope.uc6_files[filename].result = response.data.result;

                    $scope.load(response.data.result, true);
                    $scope.execution.running = false;

                } else {

                    // schedule another call
                    $timeout($scope.pollUC6, POLLING_TIMEOUT, true, filename, jobID);

                }
            }, 
            function error(response) {

                // Attempt another computation
                console.error("Error polling for uc6.");
                $scope.execution.running = false;
                window.alert("An error occurred.");

            }
        );
    }

    $scope.loadFile = function(file) {

        filename = file.identifier;
        console.log("Load "+filename);

        $("#uc6").html("<svg></svg>")

        $scope.execution.running = true;
        $scope.loaded = false;

        condition =  Object.keys($rootScope.filter.conditions).length==0 && filename in $scope.uc6_files && "result" in $scope.uc6_files[filename] 
        && $rootScope.tumorTypes.current.identifier in $scope.uc6_files[filename].result;
        condition =  condition && Object.keys($scope.uc6_files[filename].result).every(function(k){
            current = $scope.uc6_files[filename].result[k];
            return current.threshold_min == $scope.threshold.minMutations && current.threshold_active == $scope.threshold.active;});

        if(condition) {
            $scope.load( $scope.uc6_files[filename].result);
            $scope.execution.running = false;
        } else {

            request_body = {
                file_name: filename,
                threshold_active: $scope.threshold.active,
                threshold_min: $scope.threshold.minMutations
            }
            
            request_body.tumorType = $rootScope.tumorTypes.current.identifier;

            if( Object.keys($rootScope.filter.conditions).length > 0 ) {
                request_body.filter = JSON.stringify($rootScope.filter.conditions);
                request_body.tumorType = $rootScope.tumorTypes.current.identifier;
            }

            // Call the API
            $http({
                method: 'POST',
                data: $.param(request_body),
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                url: API_R04
            }).then(
                function success(response) {
                    $scope.uc6_files[filename] = {...file};
                    $scope.pollUC6(filename, response.data.jobID);
                }, 
                function error(response) {
                    console.error("error");
                    $scope.execution.running = false;
                    window.alert("An error occurred.");
                }
            );


        }

    }

    // Load data for the provided tumor type ( the plot is (re)-initialized )
    $scope.load = function(data) {

        $scope.numPatients = 0;
        plot_data = $scope.signatures.map(function(s){return {signature:s, value:0}});


        if($rootScope.tumorTypes.current.identifier in data) {
            selected_data = data[$rootScope.tumorTypes.current.identifier].data;
            $scope.numPatients = data[$rootScope.tumorTypes.current.identifier].num_patients;
            plot_data = $scope.signatures.flatMap(function(s){

                values = selected_data[s]

                // take the average if it is a box-plot
                if($scope.barPlot) {
                    mean = values.reduce(function(a,b){return a+b})/values.length;
                    return  [{
                        signature:s,
                        value: mean
                    }]
                } else {
                    return values.map(function(v){
                        return {
                            signature:s,
                            value: v
                        }
                    });
                }


            })
        } 

        $scope.loaded = true;

        // Plot area size
        width = 600;
        height = 500;
        if($("#uc6").width()>width)
            width = $("#uc6").width();
        if(window.innerHeight-250>height)
            height=window.innerHeight-260;
      

        // Save last result
        $rootScope.lastResult = JSON.stringify(plot_data);

        $("#uc6 svg").css("height", (data.length*150)+"px");
        // $rootScope.tumorTypes.current
        if($scope.barPlot){
            $scope.plot.d3graph = uc6(plot_data, width, height);
        } else {
            //$scope.outliers.show,
            $scope.plot.d3graph = uc6_box(plot_data, $scope.outliers.show, $scope.signatures, width, height);

        }

    }

    $scope.thresholdChanged = function() {
        if(!$scope.threshold.active) {
            $scope.threshold.minMutations = 0;
        } else {
            $scope.threshold.minMutations = 100;
        }
    }

    // Update the plot
    $scope.updatePlot = function(file) {
        $scope.loadFile($scope.file_selector.name);
    } 


    $scope.showBarPlot = function() {
        $scope.barPlot=true;
        $scope.updatePlot();
    }

    $scope.showBoxPlot = function(){ 
        $scope.barPlot=false;
        $scope.updatePlot();

    }


});