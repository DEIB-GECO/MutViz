/* ####################
   Data Controller
   #################### */
app.controller('data_ctrl', function($scope, $rootScope, $routeParams, $http) {

    /* # Initialization # */
    window.scroll(0, 0);
    bs_input_file();
    $rootScope.active_menu = "data";

    // Function that creates a copy of a generic object
    function clone(object) { return JSON.parse(JSON.stringify(object))}

    // File prototype
    $scope.empty_file = {id:null, name: "", type:"bed", file_txt:"", distances:null, maxDistance:300, count:0, source:null};
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

                        // Add the new file to the local list of files together with the answer
                        $scope.adding_file.distances = response.data;
                        $scope.adding_file.source = "custom";
                        $rootScope.files.push(clone($scope.adding_file));
                        $scope.adding_file = clone($scope.empty_file);

                        // Persist
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

                // Persist
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