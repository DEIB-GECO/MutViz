import pandas as pd
import quadprog, numpy as np
from sklearn.utils import check_array
import os

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

def get_refitting( mut_df ):

    dirname = os.path.dirname(__file__)

    #load the mutations
    categories = list(mut_df.columns)
    M = mut_df.values

    filename = os.path.join(dirname, "signatures.csv")

    # Load the signatures
    sigs_df = pd.read_csv(filename, sep='\t', index_col=2).drop(["Type","SubType","trinucleotide_id"], axis=1).transpose()[categories]
    assert(list(sigs_df.columns) == categories)
    sigs = sigs_df.values


    print(sigs_df.shape)

    active_signatures = sigs_df.index

    # Compute the exposures and output to file
    # SignatureEstimation gives the proportion of mutations per signature,
    # so we renormalize by multiplying by the number of mutations per sample

    n_muts = M.sum(axis=1)

    exposures = signature_estimation_qp(M, sigs)
    exp_df = pd.DataFrame(index=mut_df.index, columns=active_signatures,
                          data=exposures*n_muts[:, None])

    print(exp_df)
    print(exp_df.columns)
    return exp_df
    #exp_df.to_csv('exposures_signatures_brca_all.txt', sep='\t')