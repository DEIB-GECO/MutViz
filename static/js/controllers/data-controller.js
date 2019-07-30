/* ####################
   Data Controller
   #################### */
app.controller('data_ctrl', function($scope, $rootScope, $routeParams, $http, $interval) {

    /* # Initialization # */
    window.scroll(0, 0);
    bs_input_file();
    $rootScope.active_menu = "data";

    // File prototype
    $scope.empty_file = {id:null, name: "", type:"bed", file_txt:"", distances:null,
                         maxDistance: $rootScope.maxDistance, count:0, source:null, ready:false, jobID:null};
    $scope.adding_file = clone($scope.empty_file);

    $scope.downloader = {file:null, tumorType:null}

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

                // Take only chromosome and center (compress_regions is in support.js)
                res = compress_regions(content, $scope.adding_file.type=="narrowpeak");
                console.log("res is ")
                console.log(res);

                if( res.error_count > 0) {
                    $("#modal_title").text("File: "+file.name);
                    $("#modal_description").text("Parsing error:");

                    $("#modal_rows").text(res.log);
                    $('#modale').modal();
                    return;
                }

                $scope.adding_file.count = res.total_count;

                // Add file's text to the prototype
                $scope.adding_file.file_txt = res.output;
                $scope.adding_file.source = "custom";

                file_clone = clone($scope.adding_file);
                $rootScope.files.push(file_clone);

                $rootScope.computeDistances(file_clone);

            }).catch(error => console.log(error))
        }

    }

    // Add from repository
    $scope.submitRepo = function(repoEl) {

        // Build the POST request body
        request_body = {
            repoId: repoEl.identifier,
            maxDistance: $scope.empty_file.maxDistance
        }

        file = clone($scope.empty_file)
        file.identifier = repoEl.identifier;
        file.name = repoEl.name;
        file.source = "repo";
        file.repoId = repoEl.identifier;

        $rootScope.files.push(file);

        $rootScope.computeDistances(file);
    }

    $scope.viewErrors = function(file) {
        $("#modal_title").text("File: "+file.name);
        $("#modal_description").text("Some lines were ignored due to the following parsing errors:");

        err_string = ""
        for (i=0; i<file.errors.length; i++){
            err_string+="line "+file.errors[i][1]+" :'"+file.errors[i][2]+"' ("+file.errors[i][0]+").\n"
        }


        $("#modal_rows").text(err_string);
        $('#modale').modal();
    }


    $scope.removeFile = function(index) {
        if(!confirm("This file will be removed from the workspace. Do you want to proceede?"))
            return;
        $rootScope.files.splice(index,1);
        $rootScope.someAreReady = $rootScope.files.every(function(x){return x.ready}, false);
        $rootScope.someAreValid = $rootScope.files.every(function(x){return x.valid}, false);
        $rootScope.persistData();
    }

    function download(filename, text) {
        var element = document.createElement('a');
        var createAText = document.createTextNode("click");
        element.appendChild(createAText);
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);
        element.setAttribute('id', "download_element");

        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();

        document.body.removeChild(element);
    }

    function groupBy(xs, key) {
        return xs.reduce(function(rv, x) {
            (rv[x[key]] = rv[x[key]] || []).push(x);
            return rv;
        }, {});
    };

    $scope.download = function(index) {
        $scope.downloader.file = $rootScope.files[index];
        $('#download_modal').modal();
    }

    $scope.downloadResults = function(file, tumorType) {

        console.log(file);

        if(file==null ||tumorType==null)
            return;

        codes = ["A->G","G->A","C->T","T->C","A->C","A->T","C->A","C->G","G->C","G->T","T->A","T->G"];

        csv ="distance\tA->G\tG->A\tC->T\tT->C\tA->C\tA->T\tC->A\tC->G\tG->C\tG->T\tT->A\tT->G\ttotal\n";
        name = file.name;

        console.log("downloading file "+name+" ct "+tumorType.identifier);

        distances = file.distances.filter(function(d){return d.tumorType==tumorType.identifier})[0].distances;

        console.log(distances);
        gp_ds = groupBy(distances, 0);



        for( distance in gp_ds) {

            mutations = gp_ds[distance];

            

            counts = codes.map( function(c) {
                ex_f = function(m){mcode = m[1]+"->"+m[2]; return mcode==c;}
                if( mutations.filter(ex_f).length>0 )
                    return mutations.filter(ex_f)[0][3];
                else return 0;
            });




            code_string = counts.reduce(function(x,y){return x+"\t"+y;});
            total = counts.reduce(function(x,y){return x+y;});
            csv=csv+distance+"\t"+code_string+"\t"+total+"\n";

        }




        console.log(csv);

        download(name+"_"+tumorType.identifier+".csv", csv);
    }

});