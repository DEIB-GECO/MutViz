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

    // Selected File
    $scope.files_fake_selector = {name : null, file: null};

    $scope.files_fake = [];
    $scope.getSelectedFile = function(fileName) {
        return $scope.files_fake.filter(function(f){return f.name == fileName})[0];
    }
    
    // cache
    $scope.uc6_files = {}

    $scope.signatures = ['SBS1', 'SBS2', 'SBS3', 'SBS4', 'SBS5', 'SBS6', 'SBS7a', 'SBS7b',
                         'SBS7c', 'SBS7d', 'SBS8', 'SBS9', 'SBS10a', 'SBS10b', 'SBS11', 'SBS12',
                         'SBS13', 'SBS14', 'SBS15', 'SBS16', 'SBS17a', 'SBS17b', 'SBS18',
                         'SBS19', 'SBS20', 'SBS21', 'SBS22', 'SBS24', 'SBS26', 'SBS28', 'SBS30',
                         'SBS31', 'SBS32', 'SBS33', 'SBS34', 'SBS35', 'SBS36', 'SBS37', 'SBS38',
                         'SBS39', 'SBS40', 'SBS41', 'SBS44', 'SBS84', 'SBS85'];


    $scope.pollUC6 = function(filename) {
        // Start polling
        // Call the API
        $http({method: 'GET', url: API_R04+ $scope.uc6_files[filename].jobID
              }).then(
            function success(response) {
                if( response.data.ready == true) {
                    $scope.uc6_files[filename].ready = true;
                    console.log("result for "+ $scope.uc6_files[filename].jobID+" is ready");

                    // Add the new file to the local list of files together with the answer
                    $scope.uc6_files[filename].result = response.data.result;
                    //$rootScope.someAreReady=true;

                    // Persist
                    //$rootScope.persistData();

                    $scope.load($scope.uc6_files[filename].result);
                } else {

                    // schedule another call
                    $timeout($scope.pollUC6, POLLING_TIMEOUT, true, filename);

                }
            }, 
            function error(response) {
                //window.alert("Error. File "+file.name+" will be removed.");
                //index =  $rootScope.files.indexOf(file);
                //$rootScope.files.splice(index, 1);

                // Attempt another computation
                console.log("error  poll uc6.");


            }
        );
    }

    $scope.loadFile = function(filename) {
        console.log($rootScope.repository)

        console.log("loading file "+filename);

        if(false){
            data = {"ready": true, "result": {"BLCA": [{"count": 229470, "donor_id": 229470, "mutation": "C>T"}, {"count": 229459, "donor_id": 229459, "mutation": "C>T"}]}}
            $scope.load(data.result);
            return
        }



        if( filename in $scope.uc6_files && "result" in $scope.uc6_files[filename] ) 
            $scope.load( $scope.uc6_files[filename].result)
        else {

            request_body = {
                repoId: filename,
                regions: "",
                regionsFormat: ""
            }

            // Call the API
            $http({
                method: 'POST',
                data: $.param(request_body),
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                url: API_R04
            }).then(
                function success(response) {

                    file = {}

                    file.name = filename;

                    file.jobID = response.data.jobID;
                    file.parsed_lines =  response.data.correct_region_size;
                    if(response.data.error && response.data.error.length>0)
                        file.errors = response.data.error;
                    else
                        file.errors = [];

                    if(file.parsed_lines==0){
                        file.valid = false;
                    } else {

                        //$rootScope.someAreValid = true;
                        file.valid = true;

                        $scope.uc6_files[file.name] = file;

                        $scope.pollUC6(file.name)


                    }

                    // Persist
                    $rootScope.persistData();

                }, 
                function error(response) {
                    console.error("error");
                }
            );


        }

    }

    // Load data for the provided tumor type ( the plot is (re)-initialized )
    $scope.load = function(data) {

        $("svg").css("height", 100+145);
        
        console.log(data);

        plot_data =   $scope.signatures.map(function(s){return {signature:s, value:1}});

        if($rootScope.tumorTypes.current.identifier in data) {
            selected_data = data[$rootScope.tumorTypes.current.identifier];
            plot_data = $scope.signatures.map(function(s){return {signature:s, value:selected_data[$scope.signatures.indexOf(s)]}  })
        } 

        $scope.loaded = true;

        // Plot area size
        width = 600;
        height = 400;
        if($("#uc6").width()>width)
            width = $("#uc6").width();
        if(window.innerHeight-250>height)
            height=window.innerHeight-260;
        $("svg").css("height", window.innerHeight);

        $("#uc6 svg").css("height", (data.length*150)+"px");
        // $rootScope.tumorTypes.current
        $scope.plot.d3graph = uc6(plot_data, width, height);

    }

    // Update the plot
    $scope.updatePlot = function(file) {

        $scope.load(file.name);

        // update function is defined in uc6.js.
        /*uc6_update($scope.getData(file),
                   $scope.plot.d3graph,
                   $scope.plot.binSize,
                   $scope.getSelectedTypes());*/
    } 


    // Update the plot according to the new bin size
    $scope.changeMutationType  =  function() {

        $scope.updatePlot($scope.files_fake_selector.file);
    };


    // Add a new empty condition for mutation types
    $scope.addCondition = function(t) {
        console.log(t);
        $scope.selectedTypes.push(t);
        $scope.updatePlot($scope.files_fake_selector.file);
    }

    // Remove a condition on the mutation types
    $scope.removeCondition = function(condition) {
        $scope.selectedTypes = $scope.selectedTypes.filter(function(o){
            return o!=condition;
        });
        $scope.changeMutationType();
    }

    // Load Melanoma and select mutations C>T and G>A
    $scope.runExample = function(){               
        $scope.mutationTypes.selectedTypes = [ {from: "C", to: "T"}, {from: "G", to: "A"} ];
        $scope.load($scope.files_fake_selector.name)
    }

    //todo:remove


});