/* ####################
   uc5 Controller
   #################### */
app.controller('uc5_ctrl', function($scope, $rootScope, $routeParams, $timeout, $http) {

    /* # Initialization # */
    window.scroll(0, 0);
    $rootScope.active_menu = "uc5";

    $scope.defaultMutationTypes = [ {from: "C", to: "A"},  {from: "C", to: "G"},  {from: "C", to: "T"},  {from: "T", to: "A"},  {from: "T", to: "C"},  {from: "T", to: "G"}];

    $scope.selectedTypes =  $scope.defaultMutationTypes.map(function(x){return x;});
    $scope.addingType = {};

    $scope.plot = { d3graph: null}
    $scope.loaded = false;
    
    $scope.show_percentage = false;

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

        console.log("file");
        console.log(file);


        average_length = 13;


        // Slider
        if($scope.slider == null) {

            $scope.slider = document.getElementById("slider");

            dataRange = {
                min : -average_length/2-2*average_length,
                max : +average_length/2+2*average_length
            };

            selectedRange = {
                min:-average_length/2,
                max: +average_length/2,
                minY: $scope.plot.minY
            }

            noUiSlider.create($scope.slider, {
                start: [selectedRange.min, selectedRange.max],
                connect: true,
                range: {
                    'min': dataRange.min,
                    'max': dataRange.max
                },
                // Show a scale with the slider
                pips: {
                    mode: 'positions',
                    values: [0, 25, 50, 75, 100],
                    density: 4
                },

                tooltips: true,

                format: wNumb({
                    decimals: 0
                })
            });

        } else {
            selectedRange = {
                min: $scope.slider.noUiSlider.get()[0],
                max: $scope.slider.noUiSlider.get()[1],
                minY: $scope.plot.minY
            }
        }


        // Generate the plot
        data = file.distances.filter(function(x){
            return x.tumorType==$rootScope.tumorTypes.current.identifier
        })[0].distances.map(function(e){
            pos = e[0];
            from = e[1];
            to = e[2];
            count = e[3];

            if(from=="G" && to=="T") {
                from="C"; to="A";
            } else if(from=="G" && to=="C") {
                from="C"; to="G";  
            } else if(from=="G" && to=="A") {
                from="C"; to="T";  
            } else if(from=="A" && to=="T") {
                from="T"; to="A";  
            } else if(from=="A" && to=="G") {
                from="T"; to="C";  
            } else if(from=="A" && to=="C") {
                from="T"; to="G";  
            } 


            return {pos:pos, mutation:from+">"+to, count:count};
        }).filter(function(el){
            return el.pos >= $scope.slider.noUiSlider.get()[0] && el.pos <= $scope.slider.noUiSlider.get()[1] && $scope.selectedTypes.map(function(x){return x.from+">"+x.to}).includes(el.mutation);
        });



        data_tt = data.map(function(e){

            mutation_tt = "Tv"

            if(e.mutation=="T>C" || e.mutation=="C>T") {
                mutation_tt = "Ti";
            } 

            return {pos:e.pos, mutation:mutation_tt, count:e.count};
        });



        var helper = {};
        var data = data.reduce(function(r, o) {
            var key = o.pos + '-' + o.mutation_tt;

            if(!helper[key]) {
                helper[key] = Object.assign({}, o); // create a copy of o
                r.push(helper[key]);
            } else {
                helper[key].count += o.count;
            }

            return r;
        }, []);


        var helper_tt = {};
        var data_tt = data_tt.reduce(function(r, o) {
            var key = o.pos + '-' + o.mutation;

            if(!helper[key]) {
                helper[key] = Object.assign({}, o); // create a copy of o
                r.push(helper[key]);
            } else {
                helper[key].count += o.count;
            }

            return r;
        }, []);


        // Divid by the total count
        if($scope.show_percentage) {
            total_count = data.map(function(e){return e.count}).reduce(function(l,r){return l + r});
            console.log("total_count: "+total_count);
            data = data.map(function(d){d.count = d.count/total_count; return d;});
            data_tt = data_tt.map(function(d){d.count = d.count/total_count; return d;});
        }



        // Plot area size
        width = 600;
        height = 400;
        if($("#uc5").width()>width)
            width = $("#uc5").width();
        if(window.innerHeight-230>height)
            height=window.innerHeight-230;
        $("svg").css("height", window.innerHeight);

        wiidth_left = width*(3/4);
        wifth_tt = width*(1/4);


        $("#uc5 svg").css("height", (data.length*150)+"px");
        $scope.plot.d3graph = uc5(data, $scope.selectedTypes.map(function(x){return x.from+">"+x.to}),  $rootScope.tumorTypes.current, wiidth_left, height);
        uc5_tt(data_tt, ["Ti", "Tv"],  $rootScope.tumorTypes.current, wifth_tt, height, wiidth_left);


        // Set callback on slider change
        $scope.slider.noUiSlider.on('change', $scope.updatePlot);

    }

    // Update the plot
    $scope.updatePlot = function(file) {

        console.log("CALLBACK");

        file=$scope.files_selector.file;


        $scope.load(file.name);

        // update function is defined in uc5.js.
        /*uc5_update($scope.getData(file),
                   $scope.plot.d3graph,
                   $scope.plot.binSize,
                   $scope.getSelectedTypes());*/
    } 


    // Update the plot according to the new bin size
    $scope.changeMutationType  =  function() {
        $scope.updatePlot($scope.files_selector.file);
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


        return [{tumorType: "BLCA", data: data}];


    }

    //todo: remove
    /*$rootScope.files=
        [{"id":null, "name":"ctcf_h1","type":"bed","file_txt":"","data":$scope.getData(this),"source":"repo","ready":false,"jobID":"457319ce_74c7_11ea_91dd_246e964be724_29","identifier":"fake", "valid": true, "ready":true}];
    $rootScope.someAreValid = true;
    $rootScope.someAreReady = true;*/

    // Add a new empty condition for mutation types
    $scope.addCondition = function(t) {
        $scope.selectedTypes.push(t);
        $scope.updatePlot($scope.files_selector.file);
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
        $scope.load($scope.files_selector.name)
    }

    //todo:remove


});