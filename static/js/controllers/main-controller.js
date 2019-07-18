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

    // Tumor Types
    $rootScope.tumorTypes = {
        current: null,
        available: []
    }

    // Repository
    $rootScope.repository = [];

    // Array of files objects
    $rootScope.files = [];

    // Persist Files in local storage
    $rootScope.persistData = function() {
        files = clone($rootScope.files);
        console.log("persisting "+files.length+" files");

        for (i=0; i<files.length; i++) {
            files[i].distances=[]; // don't save the computation result
            localStorage['file-'+i] = JSON.stringify(files[i]); 
        }
 
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
                    //window.alert("Error. File "+file.name+" will be removed.");
                    //index =  $rootScope.files.indexOf(file);
                    //$rootScope.files.splice(index, 1);

                    // Attempt another computation
                    console.log("Attempting another computation.");
                    $rootScope.computeDistances(file);

                    $rootScope.persistData();
                });


        }, POLLING_TIMEOUT, 0, true, file);
    }

    // Recover files from local storage
    $rootScope.recoverData = function() {
        // Restore Files Stored in Local Storage
        if( $rootScope.files.length == 0) {

            for (el in localStorage)
                if(el.startsWith("file-")) {
                    file = JSON.parse(localStorage[el]);
                    console.log("Restoring file "+file.name+" from local storage");
                    $rootScope.files.push(file);
                }

            // Restart polling
            $rootScope.files.forEach(function(f){
                f.ready = false;
                f.timer = $rootScope.pollR01(f);
            });
        }
    }

    $rootScope.recoverData();


    // Extract the svg of the plot and download it
    $scope.downloadPlot = function() {

        $('#dwn').attr('href', 'data:application/octet-stream;base64,' + btoa($("#uc1").html())); 
        $('#dwn').attr('download', 'plot.svg');
        $('#dwn').click();

        document.getElementById("dwn").click();
    }

    // Compute Distances
    $rootScope.computeDistances = function(file) {

        // Build the POST request body
        request_body = {
            repoId: file.repoId,
            regions: file.file_txt,
            regionsFormat: file.type,
            maxDistance: file.maxDistance
        }

        // Call the API
        $http({
            method: 'POST',
            data: $.param(request_body),
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            url: API_R01
        }).then(
            function success(response) {

                file.jobID = response.data.jobID;

                // Start polling
                file.timer = $rootScope.pollR01(file);

                // Persist
                $rootScope.persistData();

            }, 
            function error(response) {
                window.alert("error");
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