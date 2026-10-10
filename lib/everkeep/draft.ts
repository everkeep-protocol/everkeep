import { PublicKey } from "@solana/web3.js";
import type { CreatePlanDraft } from "@/types/wizard";
import { parseTokenAmount, type OwnerTokenAccount } from "./tokens";

const SECONDS_PER_DAY = 86_400;

/** Mirrors MAX_INACTIVITY_PERIOD in the program. */
export const MAX_INACTIVITY_PERIOD_SECONDS = 3_153_600_000;

export function effectivePeriodSeconds(draft: CreatePlanDraft): number {
  return draft.customThresholdDays !== undefined
    ? draft.customThresholdDays * SECONDS_PER_DAY
    : draft.inactivityPeriodSeconds;
}

export function isValidPeriod(seconds: number): boolean {
  return Number.isInteger(seconds) && seconds > 0 && seconds <= MAX_INACTIVITY_PERIOD_SECONDS;
}

/** Mirrors the program's InvalidBeneficiary check that the UI can evaluate up front. */
export function beneficiaryError(input: string, owner: string | null): string | null {
  let key: PublicKey;
  try {
    key = new PublicKey(input.trim());
  } catch {
    return "Enter a valid base58 Solana address.";
  }
  if (key.equals(PublicKey.default)) return "The default (all-zero) key cannot be a beneficiary.";
  if (owner && key.toBase58() === owner) return "The beneficiary must be a different wallet than the owner.";
  return null;
}

export interface ResolvedApproval {
  account: OwnerTokenAccount;
  amount: bigint;
}

/** Selected approvals as base units; null if any selected amount is invalid or exceeds the balance. */
export function resolveApprovals(
  draft: CreatePlanDraft,
  accounts: OwnerTokenAccount[],
): ResolvedApproval[] | null {
  const resolved: ResolvedApproval[] = [];
  for (const [address, ui] of Object.entries(draft.approvals)) {
    const account = accounts.find((a) => a.address.toBase58() === address);
    if (!account || account.unsupportedReason) return null;
    const amount = parseTokenAmount(ui, account.decimals);
    if (amount === null || amount <= BigInt(0) || amount > account.amount) return null;
    resolved.push({ account, amount });
  }
  return resolved;
}
