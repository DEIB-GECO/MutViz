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
    $scope.empty_file = {name: "", type:"bed", file_txt:"", distances:null};
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

                // Add the file text to the prototype
                $scope.adding_file.file_txt = content;

                // Call the API

                // Add the new file to the local list of files together with the answer
                $rootScope.files.push(clone($scope.adding_file));
                $scope.adding_file = clone($scope.empty_file);

                $scope.$apply()
                $scope.persistData();

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