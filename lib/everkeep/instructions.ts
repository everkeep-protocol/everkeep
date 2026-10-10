import { BN } from "@anchor-lang/core";
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createApproveCheckedInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import { findRegistryPda } from "./pda";
import type { EverkeepProgram } from "./program";
import type { OwnerTokenAccount } from "./tokens";

/** Keeps every transaction comfortably under the 1232-byte packet limit. */
export const MAX_TOKEN_IXS_PER_TX = 4;

export function chunkIntoTransactions(
  leading: TransactionInstruction[],
  perItem: TransactionInstruction[][],
): Transaction[] {
  const txs: Transaction[] = [];
  // Transaction.add() throws on an empty argument list.
  let current = leading.length > 0 ? new Transaction().add(...leading) : new Transaction();
  let count = 0;
  for (const group of perItem) {
    if (count === MAX_TOKEN_IXS_PER_TX) {
      txs.push(current);
      current = new Transaction();
      count = 0;
    }
    current.add(...group);
    count += 1;
  }
  if (current.instructions.length > 0) txs.push(current);
  return txs;
}

export function initializeVaultIx(
  program: EverkeepProgram,
  params: {
    owner: PublicKey;
    registry: PublicKey;
    vault: PublicKey;
    beneficiary: PublicKey;
    inactivityPeriodSeconds: number;
  },
): Promise<TransactionInstruction> {
  return program.methods
    .initializeVault(new BN(params.inactivityPeriodSeconds), params.beneficiary)
    .accountsPartial({
      owner: params.owner,
      registry: params.registry,
      vault: params.vault,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

/** SPL Token `ApproveChecked`: makes the vault PDA delegate for `amount` base units. */
export function approveVaultIx(
  account: OwnerTokenAccount,
  vault: PublicKey,
  owner: PublicKey,
  amount: bigint,
): TransactionInstruction {
  return createApproveCheckedInstruction(
    account.address,
    account.mint,
    vault,
    owner,
    amount,
    account.decimals,
    [],
    account.programId,
  );
}

export function checkInIx(
  program: EverkeepProgram,
  owner: PublicKey,
  vault: PublicKey,
): Promise<TransactionInstruction> {
  return program.methods.checkIn().accountsPartial({ owner, vault }).instruction();
}

/** Revokes every delegation passed in, then closes the vault (rent back to owner). */
export function cancelVaultIx(
  program: EverkeepProgram,
  owner: PublicKey,
  vault: PublicKey,
  delegatedAccounts: OwnerTokenAccount[],
): Promise<TransactionInstruction> {
  const usesToken = delegatedAccounts.some((a) => a.programId.equals(TOKEN_PROGRAM_ID));
  const usesToken2022 = delegatedAccounts.some((a) =>
    a.programId.equals(TOKEN_2022_PROGRAM_ID),
  );
  return program.methods
    .cancelVault()
    .accountsPartial({
      owner,
      vault,
      registry: findRegistryPda(owner),
      tokenProgram: usesToken ? TOKEN_PROGRAM_ID : null,
      token2022Program: usesToken2022 ? TOKEN_2022_PROGRAM_ID : null,
    })
    .remainingAccounts(
      delegatedAccounts.map((a) => ({
        pubkey: a.address,
        isWritable: true,
        isSigner: false,
      })),
    )
    .instruction();
}

/** Creates the beneficiary ATA if needed, then pulls `amount` through the vault delegate. */
export async function claimDelegatedTokensIxs(
  program: EverkeepProgram,
  beneficiary: PublicKey,
  vault: PublicKey,
  account: OwnerTokenAccount,
  amount: bigint,
): Promise<TransactionInstruction[]> {
  const beneficiaryAta = getAssociatedTokenAddressSync(
    account.mint,
    beneficiary,
    false,
    account.programId,
  );
  const createAta = createAssociatedTokenAccountIdempotentInstruction(
    beneficiary,
    beneficiaryAta,
    beneficiary,
    account.mint,
    account.programId,
  );
  const claim = await program.methods
    .claimDelegatedTokens(new BN(amount.toString()))
    .accountsPartial({
      beneficiary,
      vault,
      mint: account.mint,
      ownerTokenAccount: account.address,
      beneficiaryTokenAccount: beneficiaryAta,
      tokenProgram: account.programId,
    })
    .instruction();
  return [createAta, claim];
}
