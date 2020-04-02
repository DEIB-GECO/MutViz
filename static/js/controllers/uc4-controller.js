/* ####################
   UC4 Controller
   #################### */
app.controller('uc4_ctrl', function($scope, $rootScope, $routeParams, $timeout, $http) {

    /* # Initialization # */
    window.scroll(0, 0);
    $rootScope.active_menu = "uc4";



    $scope.plot = { d3graph: null}
    $scope.loaded = false;

    // Selected File
    $scope.files_selector = {name : null, file: null};


    // Load data for the provided tumor type ( the plot is (re)-initialized )
    $scope.load = function(filename) {

        $("svg").css("height", 100+145);


        console.log("loading file "+filename);

        $scope.loaded = true;

        file = $rootScope.getSelectedFile(filename);
        $scope.files_selector.file = file;


        if(file==null)
            return;


        // Generate the plot
        data = $scope.getData(file);
    
        
        $("#uc1 svg").css("height", (data.length*150)+"px");
        $scope.plot.d3graph = uc4(data,  $rootScope.mutationTypes.selectedTypes);
        

        // Set callback on slider change
        $scope.slider.noUiSlider.on('set.one', function () { 

            $scope.test.pvalue = null;
            $scope.$apply();

            selectedRange = {
                min: $scope.slider.noUiSlider.get()[0],
                max: $scope.slider.noUiSlider.get()[1]
            };

            // Rescale the plot according to the new coordinate range. 
            // rescaleX function is defined in uc4.js.
            uc4_rescaleX($scope.getData(file, selectedTumorTypes),
                         $scope.plot.d3graph,
                         $scope.plot.binSize, 
                         selectedRange, $scope.getSelectedTypes());

        });


    }

    // Update the plot
    $scope.updatePlot = function(file, selectedTumorTypes) {

        $scope.test.pvalue = null;

        // update function is defined in uc4.js.
        uc4_update($scope.getData(file, selectedTumorTypes),
                   $scope.plot.d3graph,
                   $scope.plot.binSize,
                   $scope.getSelectedTypes());
    } 


    // Update the plot according to the new bin size
    $scope.changeMutationType  =  function() {

        $scope.test.pvalue = null;

        types = $scope.mutationTypes.selectedTypes.filter(function(t){return t.from !=null && t.to!=null});

        // Make conditions exclusive
        exclusive = types.map( function(t){ 

            others = types.filter(function(o){return o!=t});

            // exists the same condition than once
            if(types.filter(function(t1){return t1.from==t.from && t1.to==t.to}).length>1)
                return false;

            if( t.to == "*") {
                return !others.map(function(t1){return t1.from}).includes(t.from) &&
                    !others.map(function(t1){return t1.from}).includes("*")  
            } else if(t.from == "*") {
                return !others.map(function(t1){return t1.to}).includes(t.to) &&
                    !others.map(function(t1){return t1.to}).includes("*");
            } else {
                return true; 
            }
        });


        exclusive = exclusive.reduce(function(a,b){return a&&b});

        if(!exclusive) {
            $scope.mutationTypes.invalidSelection = true;
        } else {
            $scope.mutationTypes.invalidSelection = false;
            $scope.updatePlot($scope.files_selector.file, $scope.selectedTumorTypes);
        }
    };


    $scope.getData = function(file, tumorType){

        console.log("GET DATA");
        


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
    $rootScope.files=
        [{"id":null, "name":"ctcf_h1","type":"bed","file_txt":"","data":$scope.getData(this),"source":"repo","ready":false,"jobID":"457319ce_74c7_11ea_91dd_246e964be724_29","identifier":"fake", "valid": true, "ready":true}];
       $rootScope.someAreValid = true;
       $rootScope.someAreReady = true;

    // Add a new empty condition for mutation types
    $scope.addCondition = function() {
        $scope.mutationTypes.selectedTypes.push({from: null, to: null});
    }

    // Remove a condition on the mutation types
    $scope.removeCondition = function(condition) {
        $scope.mutationTypes.selectedTypes = $scope.mutationTypes.selectedTypes.filter(function(o){
            return o!=condition;
        });
        $scope.changeMutationType();
    }

    // Load Melanoma and select mutations C>T and G>A
    $scope.runExample = function(){               
        $scope.mutationTypes.selectedTypes = [ {from: "C", to: "T"}, {from: "G", to: "A"} ];
        $scope.load($scope.files_selector.name)
    }

    //todo:remove


});