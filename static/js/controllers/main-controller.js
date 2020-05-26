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

    // Filter
    $rootScope.filter = {

        conditions : {},
        keys : ["age", "sex", "stage", "cell-line"],
        values : ["1","2","4", "5"],
        undefined_count: null,
        newCondition: { key: null, values: []}
    }

    $rootScope.isObjectEmpty = function(card){
        return Object.keys(card).length === 0;
    }

    $rootScope.removeFilterCond = function(key) {
        delete $rootScope.filter.conditions[key];
    }
    

    $rootScope.addFilterCond = function(key, values) {
        if(key!=null && values.length>0)
            $rootScope.filter.conditions[key] = values.slice(0);
        $rootScope.filter.newCondition =   { key: null, values: null};
        $rootScope.filter.values = [];
        $rootScope.filter.searchKey = "";
        $rootScope.filter.searchValue = "";

    }
    
    $rootScope.resetFilter = function(){
        $rootScope.filter.conditions = {}
        $rootScope.filter.keys = []
        $rootScope.filter.values = []
        $rootScope.filter.newCondition = { key: null, values: []}
    }

    $rootScope.getKeys = function() {
        if($rootScope.tumorTypes.current.attributes)
            return $rootScope.tumorTypes.current.attributes.split(",");
        else
            return [];
    }

    $rootScope.getValues = function(key) {

        // Call the API
        $http({method: 'GET', url: API_L03+$rootScope.tumorTypes.current.identifier +"/"+key
              }).then(
            function success(response) {
                $rootScope.filter.values = response.data.values;
                $rootScope.filter.undefined_count = $rootScope.tumorTypes.current.donor_count - response.data.values_count;
                //[{value:.., count...}]
            }, 
            function error(response) {
                console.error("error retrieving values.")
            });

    }

    $rootScope.setNewKey = function(key) {
        $rootScope.filter.newCondition.key = key;
        $rootScope.filter.newCondition.values = [];

        // Retrieve new values
        $rootScope.getValues(key);

    }

    $rootScope.toggleNewValue = function(value) {

        var idx = $rootScope.filter.newCondition.values.indexOf(value);

        // Is currently selected
        if (idx > -1) {
            $rootScope.filter.newCondition.values.splice(idx, 1);
        }

        // Is newly selected
        else {
            $rootScope.filter.newCondition.values.push(value);
        }

    }


    // Maximum distance from center
    $rootScope.maxDistance = 1000;

    // Cache for distance API
    $rootScope.dist_files = {}

    // Tumor Types
    $rootScope.tumorTypes = {
        current: null,
        available: []
    }
    $rootScope.selectedTumorTypes = [];

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
            if(files[i].source!="repo")
                files[i].ready=false;
            localStorage['file-'+i] = JSON.stringify(files[i]); 
        }

    }

    $rootScope.getSelectedFile = function(fileName) {
        return $rootScope.files.filter(function(f){return f.name == fileName})[0];
    }

    // returns res with .distances
    $rootScope.filterDistances = function(data, tumorType) {
        // Extract distances for the proper tumorType
        res = data.filter(
            function(x){return x.tumorType==tumorType
                       })[0]


        res.distances = res.distances.filter(function(x){return x[1].length==1 && x[2].length==1})

        return res;
    }


    // Polling for API R01
    $rootScope.pollR01 = function getDist(file) {

        console.log("Polling for file: "+file.name+" with jobId"+file.jobID);

        // Call the API
        $http({method: 'GET', url: API_JOBS+file.jobID
              }).then(
            function success(response) {
                if( response.data.ready == true) {
                    file.ready = true;
                    console.log("result for "+file.jobID+" is ready");

                    // Add the new file to the local list of files together with the answer
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

                file.ready = true;
                file.valid = false;
                window.alert("An error occurred.")

                $rootScope.persistData();
            });

    }

    $rootScope.checkExists = function checkExists(file) {

        console.log("Checking if file: "+file.name+" exists");

        // Call the API
        $http({method: 'GET', url: API_REGIONS+file.identifier
              }).then(
            function success(response) {
                file.ready = true;
                file.valid = true;
            }, 
            function error(response) {
                //window.alert("Error. File "+file.name+" will be removed.");
                //index =  $rootScope.files.indexOf(file);
                //$rootScope.files.splice(index, 1);

                file.ready = true;
                file.valid = false;

                $rootScope.persistData();
            });

    }

    //http://bl.ocks.org/Rokotyan/0556f8facbaf344507cdc45dc3622177

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
                if(f.source!="repo") {
                    $rootScope.someAreValid = true;
                    f.ready = false;
                    $rootScope.checkExists(f);
                } else {
                    $rootScope.someAreValid = true;
                }
            });
        }
    }

    $rootScope.recoverData();


    // Extract the svg of the plot and download it
    $scope.downloadPlot = function() {

        $('#dwn').attr('href', 'data:application/octet-stream;base64,' + btoa($(".plot-container").first().html())); 
        $('#dwn').attr('download', 'plot.svg');
        $('#dwn').click();

        document.getElementById("dwn").click();
    }

    // Download last json
    $scope.downloadPlotData = function() {

        $('#dwn_data').attr('href', 'data:application/octet-stream;base64,' + btoa($rootScope.lastResult)); 
        $('#dwn_data').attr('download', 'result.json');
        $('#dwn_data').click();

        document.getElementById("dwn_data").click();
    }


    // ########### //


    // Retrieve the list of available tumor types
    $http({method: 'GET', url:  API_L01})
        .then(
        function success (response) {
            $rootScope.tumorTypes.available = response.data;
            $rootScope.tumorTypes.current = response.data[0];
            $rootScope.selectedTumorTypes.push(response.data[0]);
            console.log("loaded tumor types");

        }).catch(
        // ERROR
        function error (response) {
            console.log(response);
            console.error("Error while retrieving the list of tumor types.")
        }
    );

    // Retrieve the list of available repository
    $http({method: 'GET', url:  API_L02})
        .then(
        function success (response) {
            $rootScope.repository = response.data;

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