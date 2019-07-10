The following is a description of the project developed for the course of **Data Results and Visualization** (2018).

The main objective of this interactive tool is the visualization of the mutations that happen in particular areas of the DNA in patients affected by different types of cancer.

The tool is available at http://genomic.elet.polimi.it/drviz/, where the description that follows can be found in the home page with some extra feature (directly loading of the examples) and better rendering.



# Introduction

Every cell in the human body contains a chemical substance called deoxyribonucleic acid (DNA). DNA is packaged into structures called chromosomes. Each human cell contains exactly 23 pairs, or a total of 46 chromosomes. Chromosomes come in pairs because one set of 23 chromosomes comes from the mother and the other set comes from the father.

Looking at a single chromosome, DNA is arranged in units called genes. Genes direct the growth, development and function of the human body; everything from eye colour, to height, to how often cells divide. We have approximately 30,000 different genes, each in a specific place on a specific chromosome.

<img src="https://raw.githubusercontent.com/andreagulino/drviz/master/img/dna.jpg" width="400"/>


## DNA
A DNA strand is sequence of four constituent nucleobase (guanine [**G**], adenine [**A**], thymine [**T**], and cytosine [**C**]). In every chromosome, two long DNA strands form a double helix. The double helix further folds on itself, giving the molecule the typical shape of a chromosome ("X" shape). In a DNA double helix, each type of nucleobase on one strand bonds with just one type of nucleobase on the other strand. This is called complementary base pairing. 
The distance between two nucleobases is measured in **base pairs (bp)**.

## Genes and Cancer
Each gene has a specific function in the body. Some genes control cell division. When **mutations** occur in these genes, a cell may begin to divide without control. Cells that divide when they are not supposed to may eventually become a cancer. Therefore, cancer is the result of gene mutations.

Mutations may be caused by aging, exposure to chemicals, radiation, hormones or other factors in the body and the environment. Over time, a number of mutations may occur in a single cell, allowing it to divide and grow in a way that becomes a cancer. This usually takes many years, and explains why most cancers occur at a later age in life.

## Topologically associating domain (TADS)
TADs are particular three-dimensional structures that can be found in chromosomes. The structure resembles a loop in the DNA, "closed" by what is called a **junction**. The functions of TADs are not fully understood, but in some cases, disrupting TADs leads to disease because changing the 3D organization of the chromosome may alterate the expression level of a gene (e.g. oncogenes, that are genes that have potential to cause cancer).

<img src="https://raw.githubusercontent.com/andreagulino/drviz/master/img/tad.png" width="400"/>

## CTCF motifs
CTCF motifs are fixed-length sequences (19 bp) of the DNA involved in many cellular processes. The primary role of CTCF is thought to be in regulating the 3D structures of the DNA, e.g. binding together the strands of DNA forming a TAD. This kind of motifs can therefore be found within the junction of a TAD.

**Mutations that affect a CTCF motif within the junction of a TAD are thought to break the TAD loop, increasing, as a side effect, the expression level of some oncogenes, therefore causing cancer.**

# Visualization Tool
This tool is designed to help analysts visualize the mutation activity of DNA in the surroundings of CTCF motifs, providing the possibility to explore three different dimensions:

Motif Position: whether the motif falls within the junction of a TAD or not
- Cancer Type: consider mutations from patients with different cancer types. Available cancer types are:
  - Breast Cancer
  - Colorectal Cancer
  - Melanoma
  - Skin Cancer
  - Liver Cancer
  - Esophageal Adenocarcinoma
- Mutation Type: consider only subsets of all the possible mutations. The following are three examples of the notation used for denoting a mutation:
  - A mutation from A to C is denoted by "A > C".
  - An addition of C is denoted by "- > C".
  - An deletion of C is denoted by "C > -".
  - A generic mutation of A (either mutation to another nucleobase or deletion) is denoted by "A > *".
  - A generic mutation into A (either mutation of another nucleobase or insertion of A) is denoted by "* > A".
  
 The interface is a single-page web application developed with Angular JS. Data is dynamically loaded depending on the choices of the user. Plots are built with pure D3.js (v4).

## Data
The datasets used in all the views available in this tool are csv files of this kind:
```javascript
dist,from,to
-814.0,G,A
9113.0,G,A
-8582.0,G,A
```
All rows within such dataset represent mutations found in multiple patients having the same type of cancer. The columns have the following meaning:
- **dist**: distance, in base pairs (bp), of the mutated nucleobase w.r.t. the center of a motif.
- **from**: nucleobase that mutates (can be "-", indicating an addition )
- **to**: nucleobase that replaces the mutated one (can be "-", indicating a deletion)

## Horizontal axis and interaction
In all the plots the horizontal axis represents the distance of a mutation w.r.t. the center of a motif. The domain can be enlarged or shrinked by using the availble range-selector component.

## Binning and interaction
Data binning is used in all the plots. The **bin size**, in base pairs, can be changed by using the form available on the left side of each plot. Bins are centered on the motif (i.e. on 0). When the bin size is set to 19, the central bin will completely overlap with the motif. The interval of coordinates corresponding to the motif is highlghted by a black thick line on the x-axis. 

## Mutation Set selector
The tooldbar on the left of every plot allows to restrict the set of mutations to consider. Mutations in the defined set must be independed (e.g. you cannot choose "A > *" and "A > C"). If the set contains conditions that are not independed an error message will popup and the plot will not be updated until the defined set is fixed.

## View 1: Mutations
The first interactive plot is an histogram that aims to provide an insight on the class of mutations that are mostly affecting the area surrounding a motif. The interactive toolbar on the left side allows the selection of:

- A specific cancer type
- The position of motifs to consider (whether they fall within a junction or not)
- A class of mutations
It is known that specific cancer types are associated to specific classes of mutations. For instance, Melanoma and Skin Cancer are generally associated to mutations of type "C > T" and "G > A", that are supposed to be caused by sun rays.

Independently on the selected class of mutations, grey bars on the background will always represent the total amount of mutations, of any kind, contained in their respective bin.

The mutation types defined in the mutation set will be displayed as stacked bars of different color (or as a single bar if the "stacked" option is unselected).

This visualization can help determine the set of mutations that should be considered in the remaining interactive visualizations described in the next sections.

The palette used for the bars derives from this article / tool and guarantees accessibility for 95% of the general population.

<img src="https://raw.githubusercontent.com/andreagulino/drviz/master/img/example1.png" width="450">

<img src="https://raw.githubusercontent.com/andreagulino/drviz/master/img/palette.png" width="300" style="margin-left:150px"/>

## View 2: Junctions
The second interactive plot is a heat-map that aims to highlight how mutations affecting motifs that fall within a junction - in contrast to those located at generic positions within a chromosome - are most likely the ones that caused the development of a given cancer.

The first row of the heat-map shows the mutation density around generic motifs, the second row is displaying the density for motifs falling within a junction.

In each row (independently), normalization is performed by dividing the number of elements in each bin by the maximum number of element contained in a bin. Note that the same color on different rows does not denote the same amount of mutations; the objective is to compare densities.

<img src="https://raw.githubusercontent.com/andreagulino/drviz/master/img/example2.png" width="450">

## View 3: Tumors
The third interactive plot is a heat-map that aims to compare the effect of a selected set of mutations on different cancer types. For instance, considering only "C > T" and "G > A", we can see how they are mostly affecting motifs in patients with Melanoma and Skin Cancer, since those mutations are most likely caused by sun rays.

Each row of the heat-map shows the mutation density of the selected class of mutations for a specific cancer type.

In each row (independently), normalization is performed by dividing the number of elements in each bin by the maximum number of element contained in a bin of that row.

<img src="https://raw.githubusercontent.com/andreagulino/drviz/master/img/example3.png" width="450">
