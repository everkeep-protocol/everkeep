import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  PublicKey,
  type Connection,
  type ParsedAccountData,
} from "@solana/web3.js";
import { SOLANA_CLUSTER } from "./config";
import { findKnownToken } from "./known-tokens";

export interface OwnerTokenAccount {
  address: PublicKey;
  mint: PublicKey;
  programId: PublicKey;
  decimals: number;
  /** Wallet balance; tokens never leave the wallet until a claim. */
  amount: bigint;
  /** Current SPL delegate (one per account) — the vault PDA or anyone else. */
  delegate: PublicKey | null;
  delegatedAmount: bigint;
  frozen: boolean;
  /** Symbol for well-known mints on the configured cluster, else null. */
  symbol: string | null;
  /** Why the vault cannot claim this token, or null when it is supported. */
  unsupportedReason: string | null;
}

interface ParsedTokenAccountInfo {
  mint: string;
  state: string;
  tokenAmount: { amount: string; decimals: number };
  delegate?: string;
  delegatedAmount?: { amount: string };
}

interface ParsedMintExtension {
  extension: string;
  state?: { programId?: string | null };
}

const MINT_BATCH = 100;

/**
 * Mirrors the program's validate_mint_extensions: Token-2022 mints with an
 * active transfer hook or the non-transferable extension cannot be claimed.
 */
async function fetchUnsupportedMints(
  connection: Connection,
  mints: PublicKey[],
): Promise<Map<string, string>> {
  const reasons = new Map<string, string>();
  for (let i = 0; i < mints.length; i += MINT_BATCH) {
    const batch = mints.slice(i, i + MINT_BATCH);
    const infos = await connection.getMultipleParsedAccounts(batch, { commitment: "confirmed" });
    infos.value.forEach((info, j) => {
      const data = info?.data as ParsedAccountData | undefined;
      const extensions = (data?.parsed?.info?.extensions ?? []) as ParsedMintExtension[];
      for (const ext of extensions) {
        if (ext.extension === "nonTransferable") {
          reasons.set(batch[j].toBase58(), "Non-transferable token");
        } else if (ext.extension === "transferHook" && ext.state?.programId) {
          reasons.set(batch[j].toBase58(), "Transfer-hook tokens are not supported by the vault");
        }
      }
    });
  }
  return reasons;
}

/** All SPL Token and Token-2022 accounts owned by `owner`. Throws if either query fails. */
export async function fetchOwnerTokenAccounts(
  connection: Connection,
  owner: PublicKey,
): Promise<OwnerTokenAccount[]> {
  const perProgram = await Promise.all(
    [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID].map(async (programId) => {
      const { value } = await connection.getParsedTokenAccountsByOwner(
        owner,
        { programId },
        "confirmed",
      );
      return value.map(({ pubkey, account }) => {
        const info = (account.data as ParsedAccountData).parsed
          .info as ParsedTokenAccountInfo;
        const mint = new PublicKey(info.mint);
        const frozen = info.state === "frozen";
        return {
          address: pubkey,
          mint,
          programId,
          decimals: info.tokenAmount.decimals,
          amount: BigInt(info.tokenAmount.amount),
          delegate: info.delegate ? new PublicKey(info.delegate) : null,
          delegatedAmount: BigInt(info.delegatedAmount?.amount ?? "0"),
          frozen,
          symbol: findKnownToken(SOLANA_CLUSTER, mint)?.symbol ?? null,
          unsupportedReason: frozen ? "Token account is frozen" : null,
        };
      });
    }),
  );
  const accounts = perProgram.flat();

  const token2022Mints = [
    ...new Set(
      accounts
        .filter((a) => a.programId.equals(TOKEN_2022_PROGRAM_ID))
        .map((a) => a.mint.toBase58()),
    ),
  ].map((m) => new PublicKey(m));
  if (token2022Mints.length > 0) {
    const reasons = await fetchUnsupportedMints(connection, token2022Mints);
    for (const a of accounts) {
      a.unsupportedReason ??= reasons.get(a.mint.toBase58()) ?? null;
    }
  }
  return accounts;
}

export function isDelegatedTo(account: OwnerTokenAccount, vault: PublicKey) {
  return account.delegate?.equals(vault) ?? false;
}

export function tokenProgramLabel(programId: PublicKey | string): string {
  return TOKEN_2022_PROGRAM_ID.equals(new PublicKey(programId)) ? "Token-2022" : "SPL Token";
}

export function formatTokenAmount(raw: bigint, decimals: number): string {
  const base = BigInt(10) ** BigInt(decimals);
  const whole = (raw / base).toLocaleString("en-US");
  if (decimals === 0) return whole;
  const frac = (raw % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

/** Parses a UI amount like "12.5" into base units; null if invalid or too precise. */
export function parseTokenAmount(input: string, decimals: number): bigint | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d*)?$/.test(trimmed)) return null;
  const [whole, frac = ""] = trimmed.split(".");
  if (frac.length > decimals) return null;
  return BigInt(whole + frac.padEnd(decimals, "0"));
}
