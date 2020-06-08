/* ####################
   UC4 Controller
   #################### */
app.controller('uc4_ctrl', function($scope, $rootScope, $routeParams, $timeout, $http) {

    /* # Initialization # */
    window.scroll(0, 0);
    $rootScope.active_menu = "uc4";

    $scope.defaultMutationTypes = [ {from: "C", to: "A"},  {from: "C", to: "G"},  {from: "C", to: "T"},  {from: "T", to: "A"},  {from: "T", to: "C"},  {from: "T", to: "G"}];

    $scope.selectedTypes =  $scope.defaultMutationTypes.map(function(x){return x;});
    $scope.addingType = {};

    $scope.plot = { d3graph: null}
    $scope.loaded = false;

    // cache
    $scope.uc4_files = {}

    // status
    $scope.execution = {running:false};


    $scope.pollUC4 = function(filename, jobID) {

        console.log("Polling "+filename+ " "+jobID);


        $http({method: 'GET', url: API_JOBS+ jobID}).then(
            function success(response) {
                if( response.data.ready == true) {

                    console.log("result for "+ jobID+" is ready");

                    // Add the new file to the local list of files together with the answer
                    if( Object.keys($rootScope.filter.conditions).length==0 )
                        $scope.uc4_files[filename].result = response.data.result;

                    $scope.load(response.data.result, true);
                    $scope.execution.running = false;

                } else {

                    // schedule another call
                    $timeout($scope.pollUC4, POLLING_TIMEOUT, true, filename, jobID);

                }
            }, 
            function error(response) {

                // Attempt another computation
                console.error("Error polling for uc4.");
                $scope.execution.running = false;
                window.alert("An error occurred.");

            }
        );
    }

    $scope.loadFile = function(file) {

        filename = file.identifier;
        console.log("Load "+filename);

        $("#uc4").html("<svg></svg>")

        $scope.execution.running = true;
        $scope.loaded = false;

        if( Object.keys($rootScope.filter.conditions).length==0 && filename in $scope.uc4_files && "result" in $scope.uc4_files[filename] 
           && $rootScope.tumorTypes.current.identifier in $scope.uc4_files[filename].result){ 
            $scope.load( $scope.uc4_files[filename].result, true);
            $scope.execution.running = false;
        } else {

            request_body = {
                file_name: filename
            }
            
            if( Object.keys($rootScope.filter.conditions).length > 0 ) {
                request_body.filter = JSON.stringify($rootScope.filter.conditions);
                request_body.tumorType = $rootScope.tumorTypes.current.identifier;
            }
            

            // Call the API
            $http({
                method: 'POST',
                data: $.param(request_body),
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                url: API_R02
            }).then(
                function success(response) {
                    $scope.uc4_files[filename] = file;
                    $scope.pollUC4(filename, response.data.jobID);
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
    $scope.load = function(data, animate) {

        plot_data = $scope.getTemplate();

        if($rootScope.tumorTypes.current.identifier in data) {

            selected_data = data[$rootScope.tumorTypes.current.identifier];

            plot_data = plot_data.map(function(el) {
                res = el;
                if( el["trinucleotide"] in selected_data ) {
                    res["count"] = selected_data[el["trinucleotide"]]["count"]
                } 
                return res;
            })
        } 

        $("svg").css("height", 100+145);

        $scope.loaded = true;


        if(data==null)
            return;

        // Plot area size
        width = 600;
        height = 400;
        if($("#uc4").width()>width)
            width = $("#uc4").width();
        if(window.innerHeight-250>height)
            height=window.innerHeight-260;
        $("svg").css("height", window.innerHeight);


        // Save last result
        $rootScope.lastResult = JSON.stringify(plot_data);

        //$("#uc4 svg").css("height", (data.length*150)+"px");
        $scope.plot.d3graph = uc4(plot_data, $scope.selectedTypes, width, height, animate);

        // Set-up the export button
        svg = d3.select('svg');
        console.log(svg);
        console.log(d3.select('#saveButton'));
    }


    $scope.getTemplate = function(){

        alleles = ["A", "C", "G", "T"];
        data = [];

        // Generate template:
        alleles.forEach(function(from){
            alleles.forEach(function(to){
                alleles.forEach(function(before){
                    alleles.forEach(function(after){
                        if(from!=to && from!="A" && from!="G") {
                            entry = {"trinucleotide": before+"["+from+">"+to+"]"+after, "mutation":from+">"+to, "count":0};
                            data.push(entry)
                        }
                    });
                });
            });
        });

        return data;


    }

    // Add a new empty condition for mutation types
    $scope.addCondition = function(t) {
        if(t.from==null) return;
        $scope.selectedTypes.push(t);
        $scope.loadFile($scope.file_selector.name);
    }

    // Remove a condition on the mutation types
    $scope.removeCondition = function(condition) {
        $scope.selectedTypes = $scope.selectedTypes.filter(function(o){
            return o!=condition;
        });
        $scope.loadFile($scope.file_selector.name);
    }


});