"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { MOCK_VAULT_ACTIVE } from "@/data/mocks/vault-active";
import { MOCK_VAULT_CLAIMABLE } from "@/data/mocks/vault-claimable";
import {
  MOCK_WALLET_CONNECTED_BENEFICIARY,
  MOCK_WALLET_CONNECTED_OWNER,
  MOCK_WALLET_DISCONNECTED,
} from "@/data/mocks/wallet";
import type { DemoScenarioId } from "@/lib/constants";
import { deriveVaultViewModel } from "@/lib/vault-derive";
import type {
  InheritancePlanMock,
  SplAssetMock,
  VaultViewModel,
} from "@/types/vault";
import type { WalletMockState, WalletRole } from "@/types/wallet";
import type { CreatePlanDraft, WizardMode } from "@/types/wizard";
import { MOCK_SPL_CATALOG } from "@/data/mocks/spl-tokens";

interface EverKeepAppContextValue {
  wallet: WalletMockState;
  vault: VaultViewModel | null;
  claimLookupVault: VaultViewModel | null;
  wizardOpen: boolean;
  wizardMode: WizardMode;
  wizardDraft: CreatePlanDraft;
  demoScenario: DemoScenarioId;
  setDemoScenario: (id: DemoScenarioId) => void;
  connectWallet: (role?: WalletRole) => void;
  disconnectWallet: () => void;
  toggleCluster: () => void;
  openWizard: (mode?: WizardMode) => void;
  closeWizard: () => void;
  setWizardDraft: (patch: Partial<CreatePlanDraft>) => void;
  completeCreatePlan: () => Promise<void>;
  completeUpdatePlan: () => Promise<void>;
  completeDeposit: () => Promise<void>;
  checkIn: () => Promise<void>;
  cancelPlan: () => Promise<void>;
  claimAssets: () => Promise<void>;
  lookupVaultForClaim: (pda: string) => boolean;
  setClaimLookupVault: (v: VaultViewModel | null) => void;
}

const defaultDraft: CreatePlanDraft = {
  beneficiary: "",
  inactivityThresholdDays: 30,
  depositSol: 1,
  depositSplMints: [],
};

const EverKeepAppContext = createContext<EverKeepAppContextValue | null>(null);

const MS_PER_DAY = 86_400_000;
const LAMPORTS_PER_SOL = 1_000_000_000;

/** Fixtures carry fixed dates; demos re-anchor them to "now" so states stay stable over time. */
function withCheckInDaysAgo(
  plan: InheritancePlanMock,
  daysAgo: number,
): VaultViewModel {
  return deriveVaultViewModel({
    ...plan,
    lastCheckInAt: new Date(Date.now() - daysAgo * MS_PER_DAY).toISOString(),
  });
}

function mergeSpl(
  existing: SplAssetMock[],
  mints: string[],
): SplAssetMock[] {
  const added = MOCK_SPL_CATALOG.filter(
    (t) => mints.includes(t.mint) && !existing.some((e) => e.mint === t.mint),
  );
  return [...existing, ...added];
}

function applyScenario(id: DemoScenarioId): {
  wallet: WalletMockState;
  vault: VaultViewModel | null;
  claimVault: VaultViewModel | null;
} {
  switch (id) {
    case "landing":
      return {
        wallet: MOCK_WALLET_DISCONNECTED,
        vault: null,
        claimVault: null,
      };
    case "owner-active":
      return {
        wallet: MOCK_WALLET_CONNECTED_OWNER,
        vault: withCheckInDaysAgo(MOCK_VAULT_ACTIVE, 15),
        claimVault: null,
      };
    case "owner-warning":
      return {
        wallet: MOCK_WALLET_CONNECTED_OWNER,
        vault: withCheckInDaysAgo(MOCK_VAULT_ACTIVE, 27),
        claimVault: null,
      };
    case "beneficiary-claim":
      return {
        wallet: MOCK_WALLET_CONNECTED_BENEFICIARY,
        vault: null,
        claimVault: withCheckInDaysAgo(MOCK_VAULT_CLAIMABLE, 45),
      };
    default:
      return {
        wallet: MOCK_WALLET_DISCONNECTED,
        vault: null,
        claimVault: null,
      };
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function EverKeepAppProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [demoScenario, setDemoScenarioState] =
    useState<DemoScenarioId>("landing");
  const initial = applyScenario("landing");
  const [wallet, setWallet] = useState<WalletMockState>(initial.wallet);
  const [vault, setVault] = useState<VaultViewModel | null>(initial.vault);
  const [claimLookupVault, setClaimLookupVault] =
    useState<VaultViewModel | null>(initial.claimVault);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<WizardMode>("create");
  const [wizardDraft, setWizardDraftState] =
    useState<CreatePlanDraft>(defaultDraft);

  const setDemoScenario = useCallback((id: DemoScenarioId) => {
    const next = applyScenario(id);
    setDemoScenarioState(id);
    setWallet(next.wallet);
    setVault(next.vault);
    setClaimLookupVault(next.claimVault);
  }, []);

  const connectWallet = useCallback(
    (role: WalletRole = "owner") => {
      if (wallet.status !== "disconnected") return;
      const target =
        role === "beneficiary"
          ? MOCK_WALLET_CONNECTED_BENEFICIARY
          : MOCK_WALLET_CONNECTED_OWNER;
      setWallet((w) => ({ ...w, status: "connecting" }));
      setTimeout(() => {
        setWallet((w) => ({ ...target, cluster: w.cluster }));
      }, 1200);
    },
    [wallet.status],
  );

  const disconnectWallet = useCallback(() => {
    setWallet((w) => ({
      ...MOCK_WALLET_DISCONNECTED,
      cluster: w.cluster,
    }));
    setVault(null);
  }, []);

  const toggleCluster = useCallback(() => {
    setWallet((w) => ({
      ...w,
      cluster: w.cluster === "devnet" ? "mainnet" : "devnet",
    }));
  }, []);

  const openWizard = useCallback(
    (mode: WizardMode = "create") => {
      setWizardMode(mode);
      if (mode === "update" && vault) {
        setWizardDraftState({
          beneficiary: vault.beneficiary,
          inactivityThresholdDays: vault.inactivityThresholdDays,
          depositSol: 0,
          depositSplMints: [],
        });
      } else if (mode === "deposit-only") {
        setWizardDraftState({
          beneficiary: vault?.beneficiary ?? "",
          inactivityThresholdDays: vault?.inactivityThresholdDays ?? 30,
          depositSol: 1,
          depositSplMints: [],
        });
      } else {
        setWizardDraftState(defaultDraft);
      }
      setWizardOpen(true);
    },
    [vault],
  );

  const closeWizard = useCallback(() => setWizardOpen(false), []);

  const setWizardDraft = useCallback((patch: Partial<CreatePlanDraft>) => {
    setWizardDraftState((d) => ({ ...d, ...patch }));
  }, []);

  const buildPlanFromDraft = useCallback(
    (draft: CreatePlanDraft): VaultViewModel => {
      const owner = wallet.publicKey ?? MOCK_WALLET_CONNECTED_OWNER.publicKey!;
      const spl = mergeSpl([], draft.depositSplMints);
      const lamports = Math.round(draft.depositSol * LAMPORTS_PER_SOL);
      const plan = {
        planId: `plan_${Date.now()}`,
        vaultPda: MOCK_VAULT_ACTIVE.vaultPda,
        owner,
        beneficiary: draft.beneficiary.trim(),
        inactivityThresholdDays:
          draft.customThresholdDays ?? draft.inactivityThresholdDays,
        lastCheckInAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        status: "active" as const,
        assets: { solLamports: lamports, spl },
      };
      return deriveVaultViewModel(plan);
    },
    [wallet.publicKey],
  );

  const completeCreatePlan = useCallback(async () => {
    await delay(2000);
    setVault(buildPlanFromDraft(wizardDraft));
    setWizardOpen(false);
  }, [buildPlanFromDraft, wizardDraft]);

  const completeUpdatePlan = useCallback(async () => {
    await delay(1800);
    if (!vault) return;
    const addLamports = Math.round(wizardDraft.depositSol * LAMPORTS_PER_SOL);
    const updated = deriveVaultViewModel({
      ...vault,
      beneficiary: wizardDraft.beneficiary.trim(),
      inactivityThresholdDays:
        wizardDraft.customThresholdDays ?? wizardDraft.inactivityThresholdDays,
      assets: {
        solLamports: vault.assets.solLamports + addLamports,
        spl: mergeSpl(vault.assets.spl, wizardDraft.depositSplMints),
      },
    });
    setVault(updated);
    setWizardOpen(false);
  }, [vault, wizardDraft]);

  const completeDeposit = useCallback(async () => {
    await delay(1500);
    if (!vault) return;
    const addLamports = Math.round(wizardDraft.depositSol * LAMPORTS_PER_SOL);
    const updated = deriveVaultViewModel({
      ...vault,
      assets: {
        solLamports: vault.assets.solLamports + addLamports,
        spl: mergeSpl(vault.assets.spl, wizardDraft.depositSplMints),
      },
    });
    setVault(updated);
    setWizardOpen(false);
  }, [vault, wizardDraft]);

  const checkIn = useCallback(async () => {
    await delay(1200);
    if (!vault) return;
    setVault(
      deriveVaultViewModel({
        ...vault,
        lastCheckInAt: new Date().toISOString(),
      }),
    );
  }, [vault]);

  const cancelPlan = useCallback(async () => {
    await delay(1500);
    setVault(null);
  }, []);

  const claimAssets = useCallback(async () => {
    await delay(2000);
    if (claimLookupVault) {
      setClaimLookupVault({
        ...claimLookupVault,
        status: "claimed",
        conditionStatus: "claimable",
      });
    }
  }, [claimLookupVault]);

  const lookupVaultForClaim = useCallback(
    (pda: string) => {
      const trimmed = pda.trim();
      if (!trimmed) return false;
      if (vault && trimmed === vault.vaultPda) {
        setClaimLookupVault(deriveVaultViewModel(vault));
        return true;
      }
      if (trimmed === MOCK_VAULT_ACTIVE.vaultPda) {
        setClaimLookupVault(withCheckInDaysAgo(MOCK_VAULT_ACTIVE, 15));
        return true;
      }
      if (trimmed === MOCK_VAULT_CLAIMABLE.vaultPda) {
        setClaimLookupVault(withCheckInDaysAgo(MOCK_VAULT_CLAIMABLE, 45));
        return true;
      }
      return false;
    },
    [vault],
  );

  const value = useMemo(
    () => ({
      wallet,
      vault,
      claimLookupVault,
      wizardOpen,
      wizardMode,
      wizardDraft,
      demoScenario,
      setDemoScenario,
      connectWallet,
      disconnectWallet,
      toggleCluster,
      openWizard,
      closeWizard,
      setWizardDraft,
      completeCreatePlan,
      completeUpdatePlan,
      completeDeposit,
      checkIn,
      cancelPlan,
      claimAssets,
      lookupVaultForClaim,
      setClaimLookupVault,
    }),
    [
      wallet,
      vault,
      claimLookupVault,
      wizardOpen,
      wizardMode,
      wizardDraft,
      demoScenario,
      setDemoScenario,
      connectWallet,
      disconnectWallet,
      toggleCluster,
      openWizard,
      closeWizard,
      setWizardDraft,
      completeCreatePlan,
      completeUpdatePlan,
      completeDeposit,
      checkIn,
      cancelPlan,
      claimAssets,
      lookupVaultForClaim,
    ],
  );

  return (
    <EverKeepAppContext.Provider value={value}>
      {children}
    </EverKeepAppContext.Provider>
  );
}

export function useEverKeepApp() {
  const ctx = useContext(EverKeepAppContext);
  if (!ctx) {
    throw new Error("useEverKeepApp must be used within EverKeepAppProvider");
  }
  return ctx;
}
