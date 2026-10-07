import type { VaultViewModel } from "@/types/vault";

export const MOCK_VAULT_ACTIVE: VaultViewModel = {
  planId: "plan_devnet_001",
  vaultPda: "8FvaultPDAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxK29",
  owner: "8FOwnerxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxK29",
  beneficiary: "7xKBeneficiaryxxxxxxxxxxxxxxxxxxxxxxxxxx92A",
  inactivityThresholdDays: 30,
  lastCheckInAt: "2026-09-22T14:00:00.000Z",
  createdAt: "2026-08-01T10:00:00.000Z",
  status: "active",
  assets: {
    solLamports: 10_000_000_000,
    spl: [],
  },
  conditionStatus: "active",
  nextCheckInDeadlineAt: "2026-10-22T14:00:00.000Z",
  claimEligibleAt: "2026-10-22T14:00:00.000Z",
  totalProtectedDisplay: "10 SOL",
};
