/* ####################
   uc5 Controller
   #################### */
app.controller('uc5_ctrl', function($scope, $rootScope, $routeParams, $timeout, $http) {

    /* # Initialization # */
    window.scroll(0, 0);
    $rootScope.active_menu = "uc5";

    $scope.defaultMutationTypes = [ {from: "C", to: "A"},  {from: "C", to: "G"},  {from: "C", to: "T"},  {from: "T", to: "A"},  {from: "T", to: "C"},  {from: "T", to: "G"}];

    $scope.selectedTypes =  $scope.defaultMutationTypes.map(function(x){return x;});
    $scope.addingType = {};

    $scope.plot = { d3graph: null}
    $scope.loaded = false;

    $scope.show_percentage = false;

    // cache
    $scope.uc5_files = {}
    
    // outliers
    $scope.outliers = {show:true}

    // Selected File
    $scope.files_selector = {name : null, file: null};

    $scope.pollUC5 = function(filename) {
        // Start polling
        // Call the API
        $http({method: 'GET', url: API_R03+ $scope.uc5_files[filename].jobID
              }).then(
            function success(response) {
                if( response.data.ready == true) {
                    $scope.uc5_files[filename].ready = true;
                    console.log("result for "+ $scope.uc5_files[filename].jobID+" is ready");

                    // Add the new file to the local list of files together with the answer
                    $scope.uc5_files[filename].result = response.data.result;
                    //$rootScope.someAreReady=true;

                    // Persist
                    //$rootScope.persistData();

                    $scope.load($scope.uc5_files[filename].result);
                } else {

                    // schedule another call
                    $timeout($scope.pollUC5, POLLING_TIMEOUT, true, filename);

                }
            }, 
            function error(response) {
                //window.alert("Error. File "+file.name+" will be removed.");
                //index =  $rootScope.files.indexOf(file);
                //$rootScope.files.splice(index, 1);

                // Attempt another computation
                console.log("error  poll uc5.");


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



        if( filename in $scope.uc5_files && "result" in $scope.uc5_files[filename] ) 
            $scope.load( $scope.uc5_files[filename].result)
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
                url: API_R03
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

                        $scope.uc5_files[file.name] = file;

                        $scope.pollUC5(file.name)


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

        console.log("data");
        console.log(data);

        plot_data = []

        if($rootScope.tumorTypes.current.identifier in data) 
            plot_data = data[$rootScope.tumorTypes.current.identifier];


        console.log("plot_data")
        console.log(plot_data)


        $scope.loaded = true;


        data_tt = {}

        data_tt = plot_data.map(function(e){

            if( e["mutation"]=="T<C" || e["mutation"]=="C>T" )
                return {"mutation" : "Ti", donor_id:e["donor_id"], count:e["count"]};
            else
                return {"mutation" : "Tv", donor_id:e["donor_id"], count:e["count"]};
                
        });

        // Plot area size
        width = 600;
        height = 400;
        if($("#uc5").width()>width)
            width = $("#uc5").width();
        if(window.innerHeight-230>height)
            height=window.innerHeight-230;
        $("svg").css("height", window.innerHeight);

        wiidth_left = width*(3/4);
        wifth_tt = width*(1/4);


        $("#uc5 svg").css("height", (data.length*150)+"px");
        uc5(plot_data, $scope.outliers.show, $scope.selectedTypes.map(function(x){return x.from+">"+x.to}),wiidth_left, height);
        uc5_tt(data_tt, $scope.outliers.show, ["Ti", "Tv"],  wifth_tt, height, wiidth_left);

    }

    // Update the plot
    $scope.updatePlot = function(file) {

        console.log("CALLBACK");

        file=$scope.files_selector.file;


        $scope.load(file.name);

        // update function is defined in uc5.js.
        /*uc5_update($scope.getData(file),
                   $scope.plot.d3graph,
                   $scope.plot.binSize,
                   $scope.getSelectedTypes());*/
    } 


    // Update the plot according to the new bin size
    $scope.changeMutationType  =  function() {
        $scope.updatePlot($scope.files_selector.file);
    };

    $scope.getTemplate = function(){

        res = {}
        $scope.defaultMutationTypes.forEach(function(m){ 
            res[m.from+">"+m.to] = [];
        });
        return res;

    }


    //todo: remove
    /*$rootScope.files=
        [{"id":null, "name":"ctcf_h1","type":"bed","file_txt":"","data":$scope.getData(this),"source":"repo","ready":false,"jobID":"457319ce_74c7_11ea_91dd_246e964be724_29","identifier":"fake", "valid": true, "ready":true}];
    $rootScope.someAreValid = true;
    $rootScope.someAreReady = true;*/

    // Add a new empty condition for mutation types
    $scope.addCondition = function(t) {
        $scope.selectedTypes.push(t);
        $scope.updatePlot($scope.files_selector.file);
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
        $scope.load($scope.files_selector.name)
    }

    //todo:remove


});