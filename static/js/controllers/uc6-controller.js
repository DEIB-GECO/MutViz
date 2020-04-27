/* ####################
   uc6 Controller
   #################### */
app.controller('uc6_ctrl', function($scope, $rootScope, $routeParams, $timeout, $http) {

    /* # Initialization # */
    window.scroll(0, 0);
    $rootScope.active_menu = "uc6";
    
    $scope.defaultMutationTypes = [];

    $scope.selectedTypes =  $scope.defaultMutationTypes.map(function(x){return x;});
    $scope.addingType = {};

    $scope.plot = { d3graph: null}
    $scope.loaded = false;

    // Selected File
    $scope.files_fake_selector = {name : null, file: null};
    
    $scope.files_fake = [];
    $scope.getSelectedFile = function(fileName) {
        return $scope.files_fake.filter(function(f){return f.name == fileName})[0];
    }

    $scope.signatures = [
        "SBS1",
        "SBS10a",
        "SBS10b",
        "SBS11",
        "SBS12",
        "SBS13",
        "SBS14",
        "SBS15",
        "SBS16",
        "SBS17a",
        "SBS17b",
        "SBS18",
        "SBS19",
        "SBS20",
        "SBS21",
        "SBS22",
        "SBS24",
        "SBS25",
        "SBS26",
        "SBS28",
        "SBS29",
        "SBS30",
        "SBS31",
        "SBS32",
        "SBS33",
        "SBS35",
        "SBS36",
        "SBS37",
        "SBS38",
        "SBS39",
        "SBS39",
        "SBS4",
        "SBS40",
        "SBS41",
        "SBS43",
        "SBS44",
        "SBS5",
        "SBS6",
        "SBS7a",
        "SBS7b",
        "SBS7c",
        "SBS7d",
        "SBS8",
        "SBS84",
        "SBS85",
        "SBS9"
    ];

    // Load data for the provided tumor type ( the plot is (re)-initialized )
    $scope.load = function(filename) {

        $("svg").css("height", 100+145);


        console.log("loading file "+filename);

        $scope.loaded = true;

        file = $scope.getSelectedFile(filename);

        $scope.files_fake_selector.file = file;


        if(file==null)
            return;


        // Generate the plot
        data = $scope.getData(file);
        
         // Plot area size
        width = 600;
        height = 400;
        if($("#uc6").width()>width)
            width = $("#uc6").width();
        if(window.innerHeight-250>height)
            height=window.innerHeight-260;
        $("svg").css("height", window.innerHeight);

        data = $scope.signatures.map(function(d){return {signature:d, value: Math.random()*0.2}})

        $("#uc6 svg").css("height", (data.length*150)+"px");
        // $rootScope.tumorTypes.current
        $scope.plot.d3graph = uc6(data, width, height);

    }

    // Update the plot
    $scope.updatePlot = function(file) {
        
        $scope.load(file.name);

        // update function is defined in uc6.js.
        /*uc6_update($scope.getData(file),
                   $scope.plot.d3graph,
                   $scope.plot.binSize,
                   $scope.getSelectedTypes());*/
    } 


    // Update the plot according to the new bin size
    $scope.changeMutationType  =  function() {

        $scope.updatePlot($scope.files_fake_selector.file);
    };


    $scope.getData = function(file, tumorType){

        // reference allele, alternate (mutant) allele, allele_before, allele_after, value
        alleles = ["A", "C", "G", "T"];
        data = [];
        MAX_VAL = 0.25;

        // Generate fake data:
        alleles.forEach(function(ref){
            alleles.forEach(function(alternate){
                alleles.forEach(function(before){
                    alleles.forEach(function(after){
                        if(ref!=alternate) {
                            entry = [ref, alternate, before, after, Math.random()*MAX_VAL];
                            data.push(entry)
                        }
                    });
                });
            });
        });

        console.log(data);

        return [{tumorType: "BLCA", data: data}];


    }

    //todo: remove
    $scope.files_fake=
        [{"id":null, "name":"fake","type":"bed","file_txt":"","data":$scope.getData(this),"source":"repo","ready":false,"jobID":"457319ce_74c7_11ea_91dd_246e964be724_29","identifier":"fake", "valid": true, "ready":true}];
    $scope.someAreValid = true;
    $scope.someAreReady = true;

    // Add a new empty condition for mutation types
    $scope.addCondition = function(t) {
        console.log(t);
        $scope.selectedTypes.push(t);
        $scope.updatePlot($scope.files_fake_selector.file);
    }

    // Remove a condition on the mutation types
    $scope.removeCondition = function(condition) {
        $scope.selectedTypes = $scope.selectedTypes.filter(function(o){
            return o!=condition;
        });
        $scope.changeMutationType();
    }

    // Load Melanoma and select mutations C>T and G>A
    $scope.runExample = function(){               
        $scope.mutationTypes.selectedTypes = [ {from: "C", to: "T"}, {from: "G", to: "A"} ];
        $scope.load($scope.files_fake_selector.name)
    }

    //todo:remove


});