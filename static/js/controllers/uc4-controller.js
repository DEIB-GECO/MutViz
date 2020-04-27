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

    // Selected File
    $scope.files_fake_selector = {name : null, file: null};

    $scope.files_fake = [];
    $scope.getSelectedFile = function(fileName) {
        return $scope.files_fake.filter(function(f){return f.name == fileName})[0];
    }


    $scope.pollUC4 = function(filename) {
        // Start polling
        // Call the API
        $http({method: 'GET', url: API_R02+ $scope.uc4_files[filename].jobID
              }).then(
            function success(response) {
                if( response.data.ready == true) {
                    $scope.uc4_files[filename].ready = true;
                    console.log("result for "+ $scope.uc4_files[filename].jobID+" is ready");

                    // Add the new file to the local list of files together with the answer
                    $scope.uc4_files[filename].result = response.data.result;
                    //$rootScope.someAreReady=true;

                    // Persist
                    //$rootScope.persistData();

                    $scope.load($scope.uc4_files[filename].result, true);
                } else {

                    // schedule another call
                    $timeout($scope.pollUC4, POLLING_TIMEOUT, true, filename);

                }
            }, 
            function error(response) {
                //window.alert("Error. File "+file.name+" will be removed.");
                //index =  $rootScope.files.indexOf(file);
                //$rootScope.files.splice(index, 1);

                // Attempt another computation
                console.log("error  poll uc4.");


            }
        );
    }

    $scope.loadFile = function(filename) {


        console.log("loading file "+filename);

        data = {"COCA": {"C[C>T]C": {"count": 1, "mutation": "C>T", "trinucleotide": "C[C>T]C"}}, "LUSC": {"C[C>T]A": {"count": 1, "mutation": "C>T", "trinucleotide": "C[C>T]A"}}, "MELA": {"C[C>T]C": {"count": 2, "mutation": "C>T", "trinucleotide": "C[C>T]C"}}, "OV": {"C[C>T]T": {"count": 1, "mutation": "C>T", "trinucleotide": "C[C>T]T"}}, "PACA": {"G[C>T]G": {"count": 1, "mutation": "C>T", "trinucleotide": "G[C>T]G"}}, "SKCA": {"C[C>T]C": {"count": 1, "mutation": "C>T", "trinucleotide": "C[C>T]C"}}}

        $scope.load(data);
        return



        if( filename in $scope.uc4_files && "result" in $scope.uc4_files[filename] ) 
        $scope.load( $scope.uc4_files[filename])
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
                url: API_R02
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

                        $scope.uc4_files[file.name] = file;

                        $scope.pollUC4(file.name)


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
        console.log(data);

        //$("#uc4 svg").css("height", (data.length*150)+"px");
        $scope.plot.d3graph = uc4(plot_data, $scope.selectedTypes, width, height, animate);

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
        console.log(t);
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

    // Load Melanoma and select mutations C>T and G>A
    $scope.runExample = function(){               
        $scope.mutationTypes.selectedTypes = [ {from: "C", to: "T"}, {from: "G", to: "A"} ];
        $scope.load($scope.files_fake_selector.name, false)
    }

    //todo:remove


});