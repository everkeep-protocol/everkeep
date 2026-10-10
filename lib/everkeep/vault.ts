import type { IdlAccounts } from "@anchor-lang/core";
import { PublicKey } from "@solana/web3.js";
import type { EverkeepContract } from "./idl/everkeep_contract";
import { truncateAddress } from "@/lib/validators";
import type { TokenDelegation, VaultViewModel } from "@/types/vault";
import { findRegistryPda, findVaultPda } from "./pda";
import { EVERKEEP_IDL, type EverkeepProgram } from "./program";
import {
  fetchOwnerTokenAccounts,
  formatTokenAmount,
  isDelegatedTo,
  type OwnerTokenAccount,
} from "./tokens";

const WARNING_WINDOW_SECONDS = 7 * 86_400;

const VAULT_DISCRIMINATOR = Uint8Array.from(
  EVERKEEP_IDL.accounts.find((a) => a.name === "Vault")!.discriminator,
);

function hasDiscriminator(data: Uint8Array, discriminator: Uint8Array) {
  return data.length >= discriminator.length && discriminator.every((b, i) => data[i] === b);
}

export interface ChainVault {
  address: PublicKey;
  owner: PublicKey;
  beneficiary: PublicKey;
  inactivityPeriod: number;
  lastCheckIn: number;
  isActive: boolean;
  nonce: bigint;
}

/** On-chain vault plus the owner's token accounts that delegate to it. */
export interface VaultSnapshot {
  vault: ChainVault;
  delegatedAccounts: OwnerTokenAccount[];
}

export async function fetchVault(
  program: EverkeepProgram,
  address: PublicKey,
): Promise<ChainVault | null> {
  const info = await program.provider.connection.getAccountInfo(address, "confirmed");
  // Wallets, token accounts, registries etc. are "not a vault" rather than errors.
  if (!info || !info.owner.equals(program.programId) || !hasDiscriminator(info.data, VAULT_DISCRIMINATOR)) {
    return null;
  }
  const account: IdlAccounts<EverkeepContract>["vault"] = program.coder.accounts.decode(
    "vault",
    info.data,
  );
  const nonce = BigInt(account.nonce.toString());
  if (!findVaultPda(account.owner, nonce).equals(address)) {
    throw new Error("Vault account does not match its PDA seeds");
  }
  return {
    address,
    owner: account.owner,
    beneficiary: account.beneficiary,
    inactivityPeriod: account.inactivityPeriod.toNumber(),
    lastCheckIn: account.lastCheckIn.toNumber(),
    isActive: account.isActive,
    nonce,
  };
}

export async function fetchActiveVaultAddress(
  program: EverkeepProgram,
  owner: PublicKey,
): Promise<PublicKey | null> {
  const registry = await program.account.ownerRegistry.fetchNullable(
    findRegistryPda(owner),
    "confirmed",
  );
  return registry?.activeVault ?? null;
}

/** The vault PDA that the next initialize_vault for `owner` will create. */
export async function fetchNextVaultAddress(
  program: EverkeepProgram,
  owner: PublicKey,
): Promise<{ registry: PublicKey; vault: PublicKey; registryExists: boolean }> {
  const registry = findRegistryPda(owner);
  const account = await program.account.ownerRegistry.fetchNullable(registry, "confirmed");
  const nonce = account ? BigInt(account.nextVaultNonce.toString()) : BigInt(0);
  return { registry, vault: findVaultPda(owner, nonce), registryExists: account !== null };
}

export async function fetchVaultSnapshot(
  program: EverkeepProgram,
  address: PublicKey,
): Promise<VaultSnapshot | null> {
  const vault = await fetchVault(program, address);
  if (!vault) return null;
  const tokenAccounts = await fetchOwnerTokenAccounts(
    program.provider.connection,
    vault.owner,
  );
  return {
    vault,
    delegatedAccounts: tokenAccounts.filter((a) => isDelegatedTo(a, address)),
  };
}

/** Accepts either a vault PDA or an owner wallet (resolved through its registry). */
export async function resolveVaultSnapshot(
  program: EverkeepProgram,
  input: PublicKey,
): Promise<VaultSnapshot | null> {
  const direct = await fetchVaultSnapshot(program, input);
  if (direct) return direct;
  const active = await fetchActiveVaultAddress(program, input);
  return active ? fetchVaultSnapshot(program, active) : null;
}

export function tokenLabel(token: { symbol: string | null; mint: string }): string {
  return token.symbol ?? truncateAddress(token.mint, 4);
}

function toDelegation(account: OwnerTokenAccount): TokenDelegation {
  const claimable = account.unsupportedReason
    ? BigInt(0)
    : account.amount < account.delegatedAmount
      ? account.amount
      : account.delegatedAmount;
  return {
    tokenAccount: account.address.toBase58(),
    mint: account.mint.toBase58(),
    symbol: account.symbol,
    programId: account.programId.toBase58(),
    decimals: account.decimals,
    balance: account.amount,
    delegatedAmount: account.delegatedAmount,
    claimable,
    unsupportedReason: account.unsupportedReason,
  };
}

export function deriveVaultViewModel(
  snapshot: VaultSnapshot,
  nowMs: number,
): VaultViewModel {
  const { vault } = snapshot;
  const unlocksAtSec = vault.lastCheckIn + vault.inactivityPeriod;
  const remainingSec = unlocksAtSec - nowMs / 1000;
  const warningWindow = Math.min(WARNING_WINDOW_SECONDS, vault.inactivityPeriod / 4);

  const conditionStatus: VaultViewModel["conditionStatus"] =
    remainingSec <= 0 ? "claimable" : remainingSec <= warningWindow ? "warning" : "active";

  const delegations = snapshot.delegatedAccounts.map(toDelegation);
  const deadlineIso = new Date(unlocksAtSec * 1000).toISOString();

  return {
    vaultPda: vault.address.toBase58(),
    owner: vault.owner.toBase58(),
    beneficiary: vault.beneficiary.toBase58(),
    nonce: vault.nonce.toString(),
    isActive: vault.isActive,
    inactivityPeriodSeconds: vault.inactivityPeriod,
    lastCheckInAt: new Date(vault.lastCheckIn * 1000).toISOString(),
    nextCheckInDeadlineAt: deadlineIso,
    claimEligibleAt: deadlineIso,
    conditionStatus,
    delegations,
    hasClaimableTokens: delegations.some((d) => d.claimable > BigInt(0)),
    totalProtectedDisplay:
      delegations.length === 0
        ? "No token allowances"
        : delegations
            .map((d) => `${formatTokenAmount(d.claimable, d.decimals)} ${tokenLabel(d)}`)
            .join(" + "),
  };
}
