/* ####################
   Data Controller
   #################### */
app.controller('data_ctrl', function($scope, $rootScope, $routeParams, $http) {

    /* # Initialization # */
    window.scroll(0, 0);
    $rootScope.active_menu = "data";

    // Function that creates a copy of a generic object
    function clone(object) { return JSON.parse(JSON.stringify(object))}

    // File prototype
    $scope.empty_file = {name: "", type:"bed", file_txt:"", distances:null, maxDistance:300};
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

                // Add file's text to the prototype
                $scope.adding_file.file_txt = content;

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


    $scope.persistData = function() {
        localStorage['STFNCR-Data'] = JSON.stringify($rootScope.files);
    }

    $scope.removeFile = function(index) {
        $rootScope.files.splice(index,1);
        $scope.persistData();
    }


});