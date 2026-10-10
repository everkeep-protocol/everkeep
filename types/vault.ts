export type VaultConditionStatus = "active" | "warning" | "claimable";

/** An owner token account whose SPL delegate is the vault PDA. */
export interface TokenDelegation {
  tokenAccount: string;
  mint: string;
  /** Known symbol (e.g. PYUSD) on the configured cluster, else null. */
  symbol: string | null;
  programId: string;
  decimals: number;
  balance: bigint;
  delegatedAmount: bigint;
  /** min(balance, delegatedAmount): what claim_delegated_tokens can move now. */
  claimable: bigint;
  /** Set when the vault cannot move this token (frozen, transfer hook, ...). */
  unsupportedReason: string | null;
}

export interface VaultViewModel {
  vaultPda: string;
  owner: string;
  beneficiary: string;
  nonce: string;
  isActive: boolean;
  inactivityPeriodSeconds: number;
  lastCheckInAt: string;
  nextCheckInDeadlineAt: string;
  claimEligibleAt: string;
  conditionStatus: VaultConditionStatus;
  delegations: TokenDelegation[];
  hasClaimableTokens: boolean;
  totalProtectedDisplay: string;
}
