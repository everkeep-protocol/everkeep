import type { AnchorWallet } from "@solana/wallet-adapter-react";
import type { Connection, Transaction } from "@solana/web3.js";

const COMMITMENT = "confirmed" as const;

/**
 * Signs all transactions with one wallet prompt, then sends and confirms them
 * in order. `minContextSlot` keeps load-balanced RPCs (e.g. public Devnet)
 * from simulating on a node that has not yet seen the blockhash.
 */
export async function sendTransactions(
  connection: Connection,
  wallet: AnchorWallet,
  txs: Transaction[],
): Promise<string[]> {
  const {
    context: { slot: minContextSlot },
    value: { blockhash, lastValidBlockHeight },
  } = await connection.getLatestBlockhashAndContext(COMMITMENT);

  for (const tx of txs) {
    tx.feePayer = wallet.publicKey;
    tx.recentBlockhash = blockhash;
  }
  const signed =
    txs.length === 1 ? [await wallet.signTransaction(txs[0])] : await wallet.signAllTransactions(txs);

  const signatures: string[] = [];
  for (const tx of signed) {
    const signature = await connection.sendRawTransaction(tx.serialize(), {
      preflightCommitment: COMMITMENT,
      minContextSlot,
      maxRetries: 5,
    });
    const { value } = await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight, minContextSlot },
      COMMITMENT,
    );
    if (value.err) {
      throw new Error(`Transaction ${signature} failed: ${JSON.stringify(value.err)}`);
    }
    signatures.push(signature);
  }
  return signatures;
}
