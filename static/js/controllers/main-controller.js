/* ##########################################################
   Main Controller - Always active independently on the view
   ########################################################## */
app.controller('main_ctrl', function($scope, $http, $location, $rootScope, $timeout) {

    // Mutations
    $rootScope.mutationTypes = {
        fromList: ["A","C","T","G","*"],
        toList: ["A","C","T","G","*"],
        selectedTypes : [ {from: "A", to: "C"} ],
        invalidSelection: false, // to check whether conditions are mutually exclusive
        stacked: true // whether to use different colors for different mutation types or plot them with a single color
    }

    // Maximum distance from center
    $rootScope.maxDistance = 1000;

    // Tumor Types
    $rootScope.tumorTypes = {
        current: null,
        available: []
    }

    // Repository
    $rootScope.repository = [];

    // Array of files objects
    $rootScope.files = [];
    $rootScope.someAreReady = false;
    $rootScope.someAreValid = false;

    // Persist Files in local storage
    $rootScope.persistData = function() {

        // Remove any previously stored data
        for (el in localStorage)
            if(el.startsWith("file-")) 
                delete localStorage[el];


        files = clone($rootScope.files);
        console.log("persisting "+files.length+" files");

        for (i=0; i<files.length; i++) {
            files[i].distances=[]; // don't save the computation result
            files[i].ready=false;
            localStorage['file-'+i] = JSON.stringify(files[i]); 
        }

    }

    $rootScope.getSelectedFile = function(fileName) {
        return $rootScope.files.filter(function(f){return f.name == fileName})[0];
    }

    $rootScope.getDistances = function(file, tumorType) {
        // Extract distances for the proper tumorType
        distances = file.distances.filter(
            function(x){return x.tumorType==tumorType.identifier
                       })[0].distances


        distances = distances.filter(function(x){return x[1].length==1 && x[2].length==1})

        return distances;
    }


    // Polling for API R01
    $rootScope.pollR01 = function getDist(file) {

        console.log("Polling for file: "+file.name+" with jobId"+file.jobID);

        // Call the API
        $http({method: 'GET', url: API_R01+file.jobID
              }).then(
            function success(response) {
                if( response.data.ready == true) {
                    file.ready = true;
                    console.log("result for "+file.jobID+" is ready");

                    // Add the new file to the local list of files together with the answer
                    file.distances = response.data.result;
                    $rootScope.someAreReady=true;

                    // Persist
                    $rootScope.persistData();
                } else {

                    // schedule another call
                    $timeout($rootScope.pollR01, POLLING_TIMEOUT, true, file);

                }
            }, 
            function error(response) {
                //window.alert("Error. File "+file.name+" will be removed.");
                //index =  $rootScope.files.indexOf(file);
                //$rootScope.files.splice(index, 1);

                // Attempt another computation
                console.log("Attempting another computation.");
                $rootScope.computeDistances(file);

                $rootScope.persistData();
            });

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
                if(f.valid) {
                    $rootScope.someAreValid = true;
                    f.ready = false;
                    $rootScope.pollR01(f);
                }
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
                file.parsed_lines =  response.data.correct_region_size;
                if(response.data.error && response.data.error.length>0)
                    file.errors = response.data.error;
                else
                    file.errors = [];

                if(file.parsed_lines==0){
                    file.valid = false;
                } else {

                    $rootScope.someAreValid = true;
                    file.valid = true;

                    // Start polling
                    $rootScope.pollR01(file);
                }

                // Persist
                $rootScope.persistData();

            }, 
            function error(response) {
                console.error("error");
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