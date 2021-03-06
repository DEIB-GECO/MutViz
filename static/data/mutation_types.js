var MUTATION_TYPES = [
    { displayed: "A > C", from: "A", to: "C", filter: function(d) {return d.from == "A" && d.to == "C"} },
    { displayed: "A > G", from: "A", to: "G", filter: function(d) {return d.from == "A" && d.to == "G"} },
    { displayed: "A > T", from: "A", to: "T", filter: function(d) {return d.from == "A" && d.to == "T"} },
    { displayed: "A > *", from: "A", filter: function(d) {return d.from == "A"} },
    { displayed: "C > A", from: "C", to: "A", filter: function(d) {return d.from == "C" && d.to == "A"} },
    { displayed: "C > G", from: "C", to: "G", filter: function(d) {return d.from == "C" && d.to == "G"} },
    { displayed: "C > T", from: "C", to: "T", filter: function(d) {return d.from == "C" && d.to == "T"} },
    { displayed: "C > *", from: "C", filter: function(d) {return d.from == "C"} },
    { displayed: "G > A", from: "G", to: "A", filter: function(d) {return d.from == "G" && d.to == "A"} },
    { displayed: "G > C", from: "G", to: "C", filter: function(d) {return d.from == "G" && d.to == "C"} },
    { displayed: "G > T", from: "G", to: "T", filter: function(d) {return d.from == "G" && d.to == "T"} },
    { displayed: "G > *", from: "G", filter: function(d) {return d.from == "G"} },
    { displayed: "T > A", from: "T", to: "A", filter: function(d) {return d.from == "T" && d.to == "A"} },
    { displayed: "T > C", from: "T", to: "C", filter: function(d) {return d.from == "T" && d.to == "C"} },
    { displayed: "T > G", from: "T", to: "G", filter: function(d) {return d.from == "T" && d.to == "G"} },
    { displayed: "T > *", from: "T", filter: function(d) {return d.from == "T"} },
    //{ displayed: "insertion", from: "-", to: "*", filter: function(d) {return d.from == "-" } },
    //{ displayed: "deletion", from: "*", to: "-", filter: function(d) {return d.to == "-"} }
]