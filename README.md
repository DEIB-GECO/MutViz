# MutViz - Analysis and Visualization of Mutation Enrichments for Selected Genomic Regions and Cancer Types"


Try MutViz: http://gmql.eu/mutviz/

# Introuction

This tool is designed to help analysts visualize the mutation activity in the surroundings of user-provided DNA regions or in the surroundings of regions contained in one of the datasets available in our repository, with the possibility of selecting among:
- Several **tumors types**: we use a big database with mutations from more than 30 different tumor tyoes
- Specific **mutation types**: consider only subsets of all the possible mutations. The following are three examples of the notation used for denoting a mutation:
  - A mutation from A to C is denoted by "A > C".
  - A generic mutation of A (either mutation to another nucleobase or deletion) is denoted by "A > *".
  - A generic mutation into A (either mutation of another nucleobase or insertion of A) is denoted by "* > A".

# Data and Workspace
Before using the tool, the user must add at least one dataset to the workspace:

- Either uploading a custom file (BED or narrowpeak). E.g. of BED file:
```javascript
chr10	102639623	102639642	*
chr10	102639678	102639697	*
```
- Or choosing a dataset from our public repository.

```javascript
distance	A->G	G->A	C->T	T->C	A->C	A->T	C->A	C->G	G->C	G->T	T->A	T->G	total
0	2	0	2	0	0	0	1	0	0	0	0	0	5 10
1	0	0	2	0	0	0	2	0	0	0	0	0	4 8
2	0	0	0	3	0	0	0	0	2	0	0	0	5 10
3	0	0	0	0	0	0	0	0	0	1	0	0	1 2
```
where the first column represents the distance from a region in the dataset, the following 12 columns represent the number of mutations found at that distance for one of the 12 possible types of mutation, and the last column represents the total number of mutations at that distance (i.e. the sum of the previous 12 cells).

## Horizontal axis and interaction
In all the plots the horizontal axis represents the distance of a mutation w.r.t. the center of a region. The domain can be enlarged or shrinked by using the availble range-selector component.

## Binning and interaction
Data binning is used in all the plots. The bin size, in base pairs, can be changed by using the form available on the left side of each plot. Bins are centered on the motif (i.e. on 0). 

## Mutation Set selector
The tooldbar on the left of every plot allows to restrict the set of mutations to consider. Mutations in the defined set must be independed (e.g. you cannot choose "A > *" and "A > C"). If the set contains conditions that are not independed an error message will popup and the plot will not be updated until the defined set is fixed.


## View 1: Mutations
The first interactive plot is an histogram that aims to provide an insight on the class of mutations that are mostly affecting the area surrounding a motif. The interactive toolbar on the left side allows the selection of:

- A specific tumor type
- The position of motifs to consider (whether they fall within a junction or not)
- A class of mutations

<img src="https://raw.githubusercontent.com/andreagulino/mutviz/master/static/img/view1.png" width="450">

## View 2: Regions Comparison
The second interactive plot helps comparing the mutation activity for two different datasets given a tumor type and a set of mutation types.

In each row of the heatmap (independently), normalization is performed by dividing the number of elements in each bin by the maximum number of element contained in a bin in that row. Note that the same color on different rows does not denote the same amount of mutations; the objective is to compare densities.

<img src="https://raw.githubusercontent.com/andreagulino/mutviz/master/static/img/example2.png" width="450">

## View 3: Tumors
The third interactive plot is a heatmap can be used to compare the effect of a selected set of mutations from different tumor types, provided a datasets from the workspace. For instance, considering only "C > T" and "G > A", we can see how they are mostly affecting motifs in patients with Melanoma and Skin Tumor, since those mutations are most likely caused by sun rays.

Each row of the heatmap shows the mutation density of the selected class of mutations for a specific tumor type.

In each row (independently), normalization is performed by dividing the number of elements in each bin by the maximum number of element contained in a bin in that row.

<img src="https://raw.githubusercontent.com/andreagulino/mutviz/master/static/img/example3.png" width="450">
