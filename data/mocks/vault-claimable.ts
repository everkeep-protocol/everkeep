import type { VaultViewModel } from "@/types/vault";
import { MOCK_SPL_CATALOG } from "./spl-tokens";
import { MOCK_VAULT_ACTIVE } from "./vault-active";

export const MOCK_VAULT_CLAIMABLE: VaultViewModel = {
  ...MOCK_VAULT_ACTIVE,
  planId: "plan_devnet_claim_001",
  vaultPda: "9QvaultC1aimxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxC7m",
  owner: "5TOwnerDormantxxxxxxxxxxxxxxxxxxxxxxxxxxxR4d",
  lastCheckInAt: "2026-06-01T12:00:00.000Z",
  assets: {
    solLamports: 25_000_000_000,
    spl: [{ ...MOCK_SPL_CATALOG[0], amount: "1,200.00" }],
  },
  nextCheckInDeadlineAt: "2026-07-01T12:00:00.000Z",
  claimEligibleAt: "2026-07-01T12:00:00.000Z",
  conditionStatus: "claimable",
  totalProtectedDisplay: "25 SOL + USDC",
};
