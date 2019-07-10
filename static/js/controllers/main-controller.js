/* ##########################################################
   Main Controller - Always active independently on the view
   ########################################################## */
app.controller('main_ctrl', function($scope, $http, $location, $rootScope) {

    $rootScope.files = [];

    // Extract the svg of the plot and download it
    $scope.downloadPlot = function() {

        $('#dwn').attr('href', 'data:application/octet-stream;base64,' + btoa($("#uc1").html())); 
        $('#dwn').attr('download', 'plot.svg');
        $('#dwn').click();

        document.getElementById("dwn").click();
    }
    
    // Restore Files Stored in Local Storage
    if( $rootScope.files.length == 0) {
        var stored = localStorage['STFNCR-Data'];
        if (stored) $rootScope.files = JSON.parse(stored);
    }
    
    // Manage different kinds of tumor type
    $rootScope.tumorTypes = {
        current: null,
        available: []
    }

    // Retrieve the list of available tumor types
    $http({method: 'GET', url:  API_L01})
        .then(
        // SUCCESS
        function(response) {
            $rootScope.tumorTypes.available = response.data;

        }).catch(
        // ERROR
        function(response) {
            console.log(response);
            console.error("Error while retrieving the list of tumor types.")
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