function chiTest( o, e) {
    
    k = o.length;
    chi2 = 0;
    
    for( i=0; i<k; i++) {
        chi2 += Math.pow(o[i]-e[i],2)/e[i];
    }
    
    return chi2;
    
}