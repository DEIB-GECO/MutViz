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

    L = (v.filter(function(x){return x>=x_selected}).length / TIMES)//.toFixed(3);
    H = (v.filter(function(x){return x<=x_selected}).length / TIMES)//.toFixed(3);

    console.log("L: "+L+" H: "+H)


    return {L: L, H:H}

}

//
function uc23_test(arr1, arr2) {

    TIMES = 10000;

    D = 0;
    v = [];

    for(i=0; i<arr1.length; i++) {
        D += Math.abs(arr1[i]-arr2[i]);
    }

    for(i=0; i<TIMES; i++) {
        m1 = getRandomSubarray(arr1, arr1.length); //shuffle
        m2 = getRandomSubarray(arr2, arr2.length); //shuffle
        v[i] = 0;

        for(j=0; j<m1.length; j++) {
            v[i] += Math.abs(m1[j]-m2[j]);
        }
    }

    p = (v.filter(function(x){return x<=D}).length / TIMES)//.toFixed(3);

    return p;

}