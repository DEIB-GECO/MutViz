/* ####################
   Data Controller
   #################### */
app.controller('data_ctrl', function($scope, $rootScope, $routeParams, $http, $interval) {

    /* # Initialization # */
    window.scroll(0, 0);
    bs_input_file();
    $rootScope.active_menu = "data";

    // Function that creates a copy of a generic object
    function clone(object) { return JSON.parse(JSON.stringify(object))}

    // File prototype
    $scope.empty_file = {id:null, name: "", type:"bed", file_txt:"", distances:null, maxDistance:300, count:0, source:null, ready:false, jobID:null};
    $scope.adding_file = clone($scope.empty_file);

    // On form submitted
    $scope.submit = function() {

        input = document.getElementById("newFile");
        if ('files' in input && input.files.length > 0) {
            file = input.files[0];

            reader = new FileReader();

            new Promise((resolve, reject) => {
                reader.onload = event => resolve(event.target.result)
                reader.onerror = error => reject(error)
                reader.readAsText(file);
            }).then(content => {

                // Take only chromosome and center (compress_regions is in support.js)
                res = compress_regions(content, $scope.adding_file.type=="narrowpeak");

                if( res.parsed_count < res.total_count) {
                    $("#modal_title").text("File: "+file.name);
                    $("#modal_description").text("Parsing error:");

                    $("#modal_rows").text(res.log);
                    $('#modale').modal();
                    return;
                }

                $scope.adding_file.count = res.total_count;

                // Add file's text to the prototype
                $scope.adding_file.file_txt = res.output;


                // Build the POST request body
                request_body = {
                    regions: $scope.adding_file.file_txt,
                    regionsFormat: $scope.adding_file.type,
                    maxDistance: $scope.adding_file.maxDistance
                }


                // Call the API
                $http({
                    method: 'POST',
                    data: $.param(request_body),
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    url: API_R01
                }).then(
                    function success(response) {

                        $scope.adding_file.jobID = response.data.jobID;
                        $scope.adding_file.source = "custom";

                        file_clone = clone($scope.adding_file);
                        $scope.adding_file = clone($scope.empty_file);

                        // Start timer
                        file_clone.timer =  $interval( function(file){

                            console.log("polling for file: "+file.name+" with jobId"+file.jobID);
                            
                            // Call the API
                            $http({method: 'GET', url: API_R01+file.jobID
                            }).then(
                                function success(response) {
                                    if( response.data.ready == true) {
                                        console.log("result for "+file.jobID+" is ready");

                                        // Add the new file to the local list of files together with the answer
                                        file.distances = response.data.result;
                                        file.ready = true;
                                        
                                        // Stop timer
                                        $interval.cancel(file.timer);

                                        // Persist
                                        $scope.persistData();
                                    }
                                }, 
                                function error(response) {
                                     console.log("error");
                                });


                        }, POLLING_TIMEOUT, 0, true, file_clone);

                        // Persist
                        $rootScope.files.push(file_clone);
                        $scope.persistData();

                    }, 
                    function error(response) {
                        window.alert("error");
                    });


            }).catch(error => console.log(error))
        }

    }

    // Add from repository
    $scope.submitRepo = function(repoEl) {

        // Build the POST request body
        request_body = {
            repoId: repoEl.identifier,
            maxDistance: $scope.empty_file.maxDistance
        }

        // Call the API
        $http({
            method: 'POST',
            data: $.param(request_body),
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            url: API_R01
        }).then(
            function success(response) {
                // Add the new file to the local list of files together with the answer
                file = clone($scope.empty_file)
                file.identifier = repoEl.identifier;
                file.name = repoEl.name;
                file.source = "repo";
                file.distances = response.data;
                $rootScope.files.push(file);

                // Persistxe
                $scope.persistData();
            }, 
            function error(response) {
                window.alert("error");
            });


    }

    $scope.viewRegions = function(file) {
        $("#modal_title").text("File: "+file.name);
        $("#modal_description").text("This "+file.type+" file contains the following "+file.count+" regions (chromosome, center):");

        $("#modal_rows").text(file.file_txt);
        $('#modale').modal();
    }


    $scope.persistData = function() {
        localStorage['STFNCR-Data'] = JSON.stringify($rootScope.files);
    }

    $scope.removeFile = function(index) {
        $rootScope.files.splice(index,1);
        $scope.persistData();
    }

});