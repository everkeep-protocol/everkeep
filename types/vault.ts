export type PlanStatus = "none" | "active" | "cancelled" | "claimed";

export type VaultConditionStatus = "active" | "warning" | "claimable";

export interface SplAssetMock {
  mint: string;
  symbol: string;
  name: string;
  amount: string;
  decimals: number;
  iconUrl?: string;
}

export interface InheritancePlanMock {
  planId: string;
  vaultPda: string;
  owner: string;
  beneficiary: string;
  inactivityThresholdDays: number;
  lastCheckInAt: string;
  createdAt: string;
  status: Exclude<PlanStatus, "none">;
  assets: {
    solLamports: number;
    spl: SplAssetMock[];
  };
}

export interface VaultViewModel extends InheritancePlanMock {
  conditionStatus: VaultConditionStatus;
  nextCheckInDeadlineAt: string;
  claimEligibleAt: string;
  totalProtectedDisplay: string;
}
