/* ##########################################################
   Main Controller - Always active independently on the view
   ########################################################## */
app.controller('main_ctrl', function($scope, $http, $location, $rootScope, $interval) {

    // Mutations (- is used for deletions or insertions)
    $rootScope.mutationTypes = {
        fromList: ["A","C","T","G","*","-"],
        toList: ["A","C","T","G","*","-"],
        selectedTypes : [ {from: "A", to: "C"} ],
        invalidSelection: false, // to check whether conditions are mutually exclusive
        stacked: true // whether to use different colors for different mutation types or plot them with a single color
    }


    $rootScope.persistData = function() {
        localStorage['STFNCR-Data'] = JSON.stringify($rootScope.files);
    }

    // Tumor Types
    $rootScope.tumorTypes = {
        current: null,
        available: []
    }

    // Repository
    $rootScope.repository = [];

    // Array of files objects
    $rootScope.files = [];



    // Extract the svg of the plot and download it
    $scope.downloadPlot = function() {

        $('#dwn').attr('href', 'data:application/octet-stream;base64,' + btoa($("#uc1").html())); 
        $('#dwn').attr('download', 'plot.svg');
        $('#dwn').click();

        document.getElementById("dwn").click();
    }


    // Polling for API R01
    $rootScope.pollR01 = function(file) {

        console.log(file);

        return $interval( function(file) {

            console.log("polling for file: "+file.name+" with jobId"+file.jobID);

            // Call the API
            $http({method: 'GET', url: API_R01+file.jobID
                  }).then(
                function success(response) {
                    if( response.data.ready == true) {
                        file.ready = true;
                        console.log("result for "+file.jobID+" is ready");

                        // Add the new file to the local list of files together with the answer
                        file.distances = response.data.result;

                        // Stop timer
                        $interval.cancel(file.timer);

                        // Persist
                        $rootScope.persistData();
                    }
                }, 
                function error(response) {
                    $interval.cancel(file.timer);
                    window.alert("Error. File "+file.name+" will be removed.");
                    index =  $rootScope.files.indexOf(file);
                    $rootScope.files.splice(index, 1);

                    $rootScope.persistData();
                });


        }, POLLING_TIMEOUT, 0, true, file);
    }

    // Restore Files Stored in Local Storage
    if( $rootScope.files.length == 0) {
        var stored = localStorage['STFNCR-Data'];
        if (stored) $rootScope.files = JSON.parse(stored);

        // Restart folling
        $rootScope.files.forEach(function(f){
            if(!f.ready)
                f.timer = $rootScope.pollR01(f);
        });
    }

    // ########### //


    // Retrieve the list of available tumor types
    $http({method: 'GET', url:  API_L01})
        .then(
        function success (response) {
            $rootScope.tumorTypes.available = response.data;
            console.log("loaded tumor types");

        }).catch(
        // ERROR
        function error (response) {
            console.log(response);
            console.error("Error while retrieving the list of tumor types.")
        }
    );

    // Retrieve the list of available tumor types
    $http({method: 'GET', url:  API_L02})
        .then(
        function success (response) {
            $rootScope.repository = response.data;
            console.log( $rootScope.repository);
            if($rootScope.repository.length>0)
                $rootScope.repoEl = $rootScope.repository[0];
            console.log("loaded repository");

        }).catch(
        // ERROR
        function error (response) {
            console.log(response);
            console.error("Error while retrieving the repository.")
        }
    );



});

/* ####################
   Home Controller
   #################### */
app.controller('home_ctrl', function($scope, $location, $http, $rootScope) {

    /* # Initialization # */
    $rootScope.active_menu = "home";

    // Get the name of the current view
    view = $location.path(); 

});