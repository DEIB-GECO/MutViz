//https://stackoverflow.com/questions/10359907/array-sum-and-average
function getRandomSubarray(arr, size) {
    var shuffled = arr.slice(0), i = arr.length, temp, index;
    while (i--) {
        index = Math.floor((i + 1) * Math.random());
        temp = shuffled[index];
        shuffled[index] = shuffled[i];
        shuffled[i] = temp;
    }
    return shuffled.slice(0, size);
}


// Permutation test todo, exclude smaller bins
function uc1_test(full, selected) {
    
    TIMES = 10000;
    
    N = selected.length;
    x_selected = selected.reduce(function(a,b){return a+b})/N;
    
    v = [];
    
    for(i=0; i<TIMES; i++) {
        sample = getRandomSubarray(full, N);
        v[i] = sample.reduce(function(a,b){return a+b})/N;
    }
    
    L = (v.filter(function(x){return x>=x_selected}).length / TIMES).toFixed(3);
    H = (v.filter(function(x){return x<=x_selected}).length / TIMES).toFixed(3);
    
    console.log("L: "+L+" H: "+H)
    
    
    return {L: L, H:H}

}

// Chi2 test
function uc2_test(file1, file2) {
    
    
}