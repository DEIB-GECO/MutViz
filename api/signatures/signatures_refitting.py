import time

import pandas as pd
import quadprog, numpy as np
from sklearn.utils import check_array
import os
import pysam
import dask.dataframe as ddf

def signature_estimation_qp(M, P):
    """
    Estimate exposures with quadratic programming.
    Inputs:
    - M: (N x L) mutation count matrix (N=# of samples, L=# of mutation categories)
    - P: (K x L) mutation signature matrix (K=# of signatures)
    Outputs:
    - E: (N x K) exposure matrix
    """
    # Do some checks
    P = check_array(P)
    M = check_array(M)

    # Normalize M and transpose
    M = M/M.sum(axis=1)[:, None]
    M = M.T
    # Normalize P and transpose (errors if unnormalized signatures)
    P = P/P.sum(axis=1)[:, None]
    P = P.T

    # K: number of signatures
    K = P.shape[1]
    # N: number of samples
    N = M.shape[1]
    # G: matrix appearing in the quatric programming objective function
    G = P.T.dot(P)
    # C: matrix constraints under which we want to minimize the quatric programming objective function.
    C = np.hstack((np.ones((K, 1), dtype=np.float64), np.eye(K, dtype=np.float64)))
    # b: vector containing the values of b_0.
    b = np.array([1.] + [0.] * K, dtype=np.float64)
    # d: vector appearing in the quadratic programming objective function as a^T
    D = M.T.dot(P)

    # Solve quadratic programming problems
    exposures = np.array([ quadprog.solve_qp(G, d, C, b, meq=1)[0] for d in D ])

    # Some exposure values may be negative due to numerical issues,
    # but very close to 0. Change these neagtive values to zero and renormalize.
    #as negative values not accepted
    exposures[exposures < 0] = 0
    exposures = exposures/exposures.sum(axis=1)[:, None]

    return exposures


def complement(n):
    if n == 'A':
        return 'T'
    elif n == 'C':
        return 'G'
    elif n == 'G':
        return 'C'
    else:
        return 'A'


def reverse_complement(t):
    rc = "".join([complement(x) for x in t[::-1]])
    return rc

def reverse_comp(sample):
    sample['sequence_r']= sample.apply(lambda row: reverse_complement(row['codon']) if (row['codon'][1]=='A') | (row['codon'][1]=='G') else row[0], axis=1)
    sample= sample.groupby('sequence_r')['freq'].sum().reset_index(name='frequencies')
    return sample

#########region file #########
#find the seuqunces of the regions

def seq(sample, genome):
    sample = sample[sample['chrom']<23]
    sample['sequence']= sample.apply(lambda row: genome.fetch('chr'+str(row['chrom']), row['start']-1, row['stop']).upper(), axis=1)
    sample['sequence'] = sample['sequence'].str.replace(r'[R,N,H,M,U,W,B,D,V,S,Y,K,-,>,1]','A')
    return sample

def frequencies(df):
    codon_freq = {}
    tot = 0

    start_time = time.time()

    def iteration(row):
        global tot,codon_freq
        len_reg = len(row['sequence'])
        for i in range(len_reg - 2):
            triplet = row['sequence'][i:i + 3]
            tot += 1
            if triplet in codon_freq:
                codon_freq[triplet] += 1
            else:
                codon_freq[triplet] = 1

    df_dask = ddf.from_pandas(df,npartitions=10)  # where the number of partitions is the number of cores you want to use
    df_dask.apply(lambda x: iteration(x), meta=('str')).compute(scheduler='multiprocessing')


    print("frequencies: for loop  took %s seconds ---" % (time.time() - start_time))

    for k in codon_freq.keys():
        codon_freq[k] = float(codon_freq[k]) / tot
    print("frequencies: second for loop  took %s seconds ---" % (time.time() - start_time))

    df_freq = pd.DataFrame([{"codon": key, "freq": value} for key, value in codon_freq.items()])
    print("frequencies: pd.DataFrame for loop  took %s seconds ---" % (time.time() - start_time))
    df_freq = reverse_comp(df_freq)

    print("reverse_comp: pd.DataFrame for loop  took %s seconds ---" % (time.time() - start_time))

    return df_freq

def replacer(s, newstring, index, nofail=False):
    # raise an error if index is outside of the string
    if not nofail and index not in range(len(s)):
        raise ValueError("index outside given string")

    # if not erroring, but the index is still not in the correct range..
    if index < 0:  # add it to the beginning
        return newstring + s
    if index > len(s):  # add it to the end
        return s + newstring

    # insert the new string between "slices" of the original
    return s[:index] + newstring + s[index + 1:]

def correction_factor(df_freq, codon_whole_genome):
    df_cor = df_freq.merge(codon_whole_genome, how='inner', on='sequence_r')
    df_cor['correction'] = df_cor['frequencies'] / df_cor['frequencies_whole']

    l_c = ['[C>T]', '[C>A]', '[C>G]']
    l_t = ['[T>A]', '[T>C]', '[T>G]']
    correction = []

    for ind, row in df_cor.iterrows():
        if row['sequence_r'][1] == 'C':
            for i in l_c:
                correction.append((replacer(row['sequence_r'], i, 1), row['correction']))
        else:
            for k in l_t:
                correction.append((replacer(row['sequence_r'], k, 1), row['correction']))

    df_correction = pd.DataFrame(correction, columns=['triplet', 'correction'])
    df_correction.set_index('triplet', inplace=True)
    return df_correction



def getPrevalence(exp_df):
    items = []
    sig_names = [s.split(' ')[-1] if type(s) == type('') else s for s in exp_df.columns]
    for patient, r in exp_df.iterrows():
        n_mutations = sum(r[sig] for sig in exp_df.columns)
        for i, sig in enumerate(exp_df.columns):
            items.append({
                "Patient": patient,
                "Signature": sig_names[i],
                "Exposure": r[sig],
                "Prevalence": r[sig] / n_mutations
            })


    prev = pd.DataFrame(items).pivot("Patient", "Signature", "Prevalence")

    return prev


def get_refitting( mut_df, user_file_df,  sigs_df_norm = None):

    start_time = time.time()

    dirname = os.path.dirname(__file__)

    #load the mutations
    categories = list(mut_df.columns)
    M = mut_df.values

    if  sigs_df_norm is None:

        filename = os.path.join(dirname, "signatures.csv")
        frequencies_wg_file = os.path.join(dirname, "frequencies_whole_genome.tsv")
        fasta_file = os.path.join(dirname, "hg19_ref_genome.fa")

        genome = pysam.Fastafile(fasta_file)

        print("Reading fasta took %s seconds ---" % (time.time() - start_time))

        codon_whole_genome = pd.read_csv(frequencies_wg_file, sep='\t')

        print("Reading frequencies_wg_file took %s seconds ---" % (time.time() - start_time))

        # Load the signatures
        sigs_df = pd.read_csv(filename, sep='\t', index_col=2).drop(["Type","SubType","trinucleotide_id"], axis=1).transpose()[categories]

        print("Reading signatures.csv took %s seconds ---" % (time.time() - start_time))

        assert(list(sigs_df.columns) == categories)
        sigs = sigs_df.values

        # freq_whole_gen / trinucleotide_freq_in_region
        ###### updated ########


        # user_file : chrom, start, stop
        df = seq(user_file_df, genome)
        df_freq = frequencies(df)

        print("frequencies(df) took %s seconds ---" % (time.time() - start_time))
        df_correction = correction_factor(df_freq, codon_whole_genome)
        print("correction_factor(..) took %s seconds ---" % (time.time() - start_time))


        # Load the signatures
        #sigs_df = pd.read_csv(signatures_file, sep='\t', index_col=0)[categories]
        assert(list(sigs_df.columns) == categories)
        sigs_df= sigs_df.T.merge(df_correction, left_index=True, right_index=True)
        sigs_df_mult= sigs_df.loc[:,'SBS1':'SBS85'].multiply(sigs_df['correction'], axis="index")
        sigs_df_norm=sigs_df_mult.div(sigs_df_mult.sum(axis=0), axis=1)

        print("other stuff took %s seconds ---" % (time.time() - start_time))

    sigs = sigs_df_norm.T.values
    active_signatures = sigs_df_norm.T.index


    # Compute the exposures and output to file
    # SignatureEstimation gives the proportion of mutations per signature,
    # so we renormalize by multiplying by the number of mutations per sample

    n_muts = M.sum(axis=1)

    exposures = signature_estimation_qp(M, sigs)
    exp_df = pd.DataFrame(index=mut_df.index, columns=active_signatures,
                          data=exposures*n_muts[:, None])

    prevalence =  getPrevalence(exp_df)

    return (prevalence, sigs_df_norm)