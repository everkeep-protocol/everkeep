"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnchorProvider } from "@anchor-lang/core";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { PhantomWalletName } from "@solana/wallet-adapter-phantom";
import { PublicKey, type Transaction } from "@solana/web3.js";
import { toast } from "@/hooks/use-toast";
import { SOLANA_CLUSTER, explorerTxUrl } from "@/lib/everkeep/config";
import {
  beneficiaryError,
  effectivePeriodSeconds,
  isValidPeriod,
  resolveApprovals,
} from "@/lib/everkeep/draft";
import { describeTxError } from "@/lib/everkeep/errors";
import { sendTransactions } from "@/lib/everkeep/send";
import {
  approveVaultIx,
  cancelVaultIx,
  checkInIx,
  chunkIntoTransactions,
  claimDelegatedTokensIxs,
  initializeVaultIx,
} from "@/lib/everkeep/instructions";
import {
  getEverkeepProgram,
  getReadonlyEverkeepProgram,
  type EverkeepProgram,
} from "@/lib/everkeep/program";
import {
  fetchOwnerTokenAccounts,
  type OwnerTokenAccount,
} from "@/lib/everkeep/tokens";
import {
  deriveVaultViewModel,
  fetchActiveVaultAddress,
  fetchNextVaultAddress,
  fetchVaultSnapshot,
  resolveVaultSnapshot,
  type VaultSnapshot,
} from "@/lib/everkeep/vault";
import { truncateAddress } from "@/lib/validators";
import type { VaultViewModel } from "@/types/vault";
import type { WalletState } from "@/types/wallet";
import type { CreatePlanDraft, WizardMode } from "@/types/wizard";

const STATUS_TICK_MS = 5_000;
const PHANTOM_DOWNLOAD_URL = "https://phantom.com/download";

interface EverKeepAppContextValue {
  wallet: WalletState;
  phantomInstalled: boolean;
  vault: VaultViewModel | null;
  vaultLoading: boolean;
  ownerTokenAccounts: OwnerTokenAccount[];
  /** Set when the last token balance fetch failed; balances shown may be stale. */
  tokenAccountsError: string | null;
  claimLookupVault: VaultViewModel | null;
  wizardOpen: boolean;
  wizardMode: WizardMode;
  wizardDraft: CreatePlanDraft;
  connectWallet: () => void;
  disconnectWallet: () => void;
  refreshVault: () => Promise<void>;
  openWizard: (mode?: WizardMode) => void;
  closeWizard: () => void;
  setWizardDraft: (patch: Partial<CreatePlanDraft>) => void;
  /** Each action resolves to its first signature, or null after reporting the failure. */
  completeCreatePlan: () => Promise<string | null>;
  completeApprove: () => Promise<string | null>;
  checkIn: () => Promise<string | null>;
  cancelPlan: () => Promise<string | null>;
  claimAssets: () => Promise<string | null>;
  /** true = found, false = no vault, null = lookup failed (already reported). */
  lookupVaultForClaim: (input: string) => Promise<boolean | null>;
  clearClaimLookup: () => void;
}

const defaultDraft: CreatePlanDraft = {
  beneficiary: "",
  inactivityPeriodSeconds: 30 * 86_400,
  approvals: {},
};

const EverKeepAppContext = createContext<EverKeepAppContextValue | null>(null);

function reportFailure(title: string, err: unknown) {
  // warn, not error: the failure is already shown to the user as a toast, and
  // console.error would also open the Next.js dev error overlay.
  console.warn(`[everkeep] ${title}`, err);
  toast({ variant: "destructive", title, description: describeTxError(err) });
}

function reportSuccess(title: string, signature: string) {
  toast({
    title,
    description: (
      <a
        href={explorerTxUrl(signature)}
        target="_blank"
        rel="noreferrer"
        className="font-mono underline underline-offset-2"
      >
        {truncateAddress(signature, 8)}
      </a>
    ),
  });
}

export function EverKeepAppProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { connection } = useConnection();
  const {
    wallets,
    wallet: selectedWallet,
    publicKey,
    connected,
    connecting,
    select,
    connect,
    disconnect,
  } = useWallet();
  const anchorWallet = useAnchorWallet();

  const [ownerSnapshot, setOwnerSnapshot] = useState<VaultSnapshot | null>(null);
  const [ownerTokenAccounts, setOwnerTokenAccounts] = useState<OwnerTokenAccount[]>([]);
  const [tokenAccountsError, setTokenAccountsError] = useState<string | null>(null);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [claimSnapshot, setClaimSnapshot] = useState<VaultSnapshot | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<WizardMode>("create");
  const [wizardDraft, setWizardDraftState] = useState<CreatePlanDraft>(defaultDraft);
  const ownerKeyRef = useRef<string | null>(null);

  const readonlyProgram = useMemo(
    () => getReadonlyEverkeepProgram(connection),
    [connection],
  );
  const signerProgram = useMemo(
    () =>
      anchorWallet
        ? getEverkeepProgram(
            new AnchorProvider(connection, anchorWallet, { commitment: "confirmed" }),
          )
        : null,
    [anchorWallet, connection],
  );

  // Extension detection only exists in the browser; assume "installed" until
  // hydration so server HTML and the first client render match.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const phantom = wallets.find((w) => w.adapter.name === PhantomWalletName);
  const phantomInstalled =
    !hydrated || phantom?.readyState === WalletReadyState.Installed;

  const wallet: WalletState = useMemo(
    () => ({
      status: connecting
        ? "connecting"
        : connected && publicKey
          ? "connected"
          : "disconnected",
      publicKey: connected && publicKey ? publicKey.toBase58() : null,
      cluster: SOLANA_CLUSTER,
    }),
    [connected, connecting, publicKey],
  );

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), STATUS_TICK_MS);
    return () => clearInterval(id);
  }, []);

  const refreshVault = useCallback(async () => {
    const owner = connected ? publicKey : null;
    const key = owner?.toBase58() ?? null;
    ownerKeyRef.current = key;
    if (!owner) {
      setOwnerSnapshot(null);
      setOwnerTokenAccounts([]);
      setTokenAccountsError(null);
      setVaultLoading(false);
      return;
    }
    setVaultLoading(true);
    const [vaultResult, tokensResult] = await Promise.allSettled([
      fetchActiveVaultAddress(readonlyProgram, owner).then((active) =>
        active ? fetchVaultSnapshot(readonlyProgram, active) : null,
      ),
      fetchOwnerTokenAccounts(connection, owner),
    ]);
    if (ownerKeyRef.current !== key) return;
    if (vaultResult.status === "fulfilled") {
      setOwnerSnapshot(vaultResult.value);
    } else {
      reportFailure("Could not load your vault", vaultResult.reason);
    }
    if (tokensResult.status === "fulfilled") {
      setOwnerTokenAccounts(tokensResult.value);
      setTokenAccountsError(null);
    } else {
      console.warn("[everkeep] token accounts", tokensResult.reason);
      setTokenAccountsError(describeTxError(tokensResult.reason));
    }
    setVaultLoading(false);
  }, [connected, publicKey, readonlyProgram, connection]);

  useEffect(() => {
    void refreshVault();
  }, [refreshVault]);

  const refreshClaimLookup = useCallback(
    async (address: PublicKey) => {
      setClaimSnapshot(await fetchVaultSnapshot(readonlyProgram, address));
    },
    [readonlyProgram],
  );

  const connectWallet = useCallback(() => {
    if (!phantomInstalled) {
      window.open(PHANTOM_DOWNLOAD_URL, "_blank", "noopener,noreferrer");
      return;
    }
    if (selectedWallet?.adapter.name !== PhantomWalletName) {
      // WalletProvider's autoConnect connects once the selection lands.
      select(PhantomWalletName);
      return;
    }
    // Failures are surfaced by SolanaProvider's onError.
    connect().catch(() => undefined);
  }, [phantomInstalled, selectedWallet, select, connect]);

  const disconnectWallet = useCallback(() => {
    disconnect().catch(() => undefined);
  }, [disconnect]);

  const openWizard = useCallback(
    (mode: WizardMode = "create") => {
      setWizardMode(mode);
      setWizardDraftState(defaultDraft);
      setWizardOpen(true);
      void refreshVault();
    },
    [refreshVault],
  );

  const closeWizard = useCallback(() => setWizardOpen(false), []);

  const setWizardDraft = useCallback((patch: Partial<CreatePlanDraft>) => {
    setWizardDraftState((d) => ({ ...d, ...patch }));
  }, []);

  const requireSigner = useCallback((): {
    program: EverkeepProgram;
    signer: PublicKey;
  } => {
    if (!signerProgram || !publicKey || !connected) {
      throw new Error("Connect your wallet first.");
    }
    return { program: signerProgram, signer: publicKey };
  }, [signerProgram, publicKey, connected]);

  const send = useCallback(
    async (txs: Transaction[]): Promise<string> => {
      if (!anchorWallet) throw new Error("Connect your wallet first.");
      const signatures = await sendTransactions(connection, anchorWallet, txs);
      return signatures[0];
    },
    [anchorWallet, connection],
  );

  const completeCreatePlan = useCallback(async () => {
    try {
      const { program, signer } = requireSigner();
      const invalidBeneficiary = beneficiaryError(wizardDraft.beneficiary, signer.toBase58());
      if (invalidBeneficiary) throw new Error(invalidBeneficiary);
      const period = effectivePeriodSeconds(wizardDraft);
      if (!isValidPeriod(period)) throw new Error("Inactivity period is out of range.");
      const approvals = resolveApprovals(wizardDraft, ownerTokenAccounts);
      if (!approvals) throw new Error("One of the approval amounts is invalid.");

      const { registry, vault } = await fetchNextVaultAddress(program, signer);
      const init = await initializeVaultIx(program, {
        owner: signer,
        registry,
        vault,
        beneficiary: new PublicKey(wizardDraft.beneficiary.trim()),
        inactivityPeriodSeconds: period,
      });
      const txs = chunkIntoTransactions(
        [init],
        approvals.map((a) => [approveVaultIx(a.account, vault, signer, a.amount)]),
      );
      const signature = await send(txs);
      setWizardOpen(false);
      reportSuccess("Vault created", signature);
      await refreshVault();
      return signature;
    } catch (err) {
      reportFailure("Create vault failed", err);
      void refreshVault();
      return null;
    }
  }, [requireSigner, wizardDraft, ownerTokenAccounts, send, refreshVault]);

  const completeApprove = useCallback(async () => {
    try {
      const { program, signer } = requireSigner();
      if (!ownerSnapshot) throw new Error("No active vault to approve tokens for.");
      const approvals = resolveApprovals(wizardDraft, ownerTokenAccounts);
      if (!approvals || approvals.length === 0) {
        throw new Error("Select at least one token account with a valid amount.");
      }
      const vault = ownerSnapshot.vault.address;
      const txs = chunkIntoTransactions(
        [],
        approvals.map((a) => [approveVaultIx(a.account, vault, signer, a.amount)]),
      );
      const signature = await send(txs);
      setWizardOpen(false);
      reportSuccess("Token allowances approved", signature);
      await refreshVault();
      return signature;
    } catch (err) {
      reportFailure("Approve failed", err);
      void refreshVault();
      return null;
    }
  }, [requireSigner, ownerSnapshot, wizardDraft, ownerTokenAccounts, send, refreshVault]);

  const checkIn = useCallback(async () => {
    try {
      const { program, signer } = requireSigner();
      if (!ownerSnapshot) throw new Error("No active vault to check in to.");
      const ix = await checkInIx(program, signer, ownerSnapshot.vault.address);
      const signature = await send(chunkIntoTransactions([ix], []));
      reportSuccess("Check-in recorded", signature);
      await refreshVault();
      return signature;
    } catch (err) {
      reportFailure("Check-in failed", err);
      void refreshVault();
      return null;
    }
  }, [requireSigner, ownerSnapshot, send, refreshVault]);

  const cancelPlan = useCallback(async () => {
    try {
      const { program, signer } = requireSigner();
      if (!ownerSnapshot) throw new Error("No active vault to cancel.");
      // Re-read delegations: cancel_vault aborts if any passed account is no longer delegated.
      const fresh = await fetchVaultSnapshot(program, ownerSnapshot.vault.address);
      if (!fresh) throw new Error("The vault no longer exists.");
      // Revoke fails on frozen accounts; their delegation is harmless once the vault PDA is closed.
      const revocable = fresh.delegatedAccounts.filter((a) => !a.frozen);
      const ix = await cancelVaultIx(program, signer, fresh.vault.address, revocable);
      const signature = await send(chunkIntoTransactions([ix], []));
      reportSuccess("Vault cancelled", signature);
      await refreshVault();
      return signature;
    } catch (err) {
      reportFailure("Cancel failed", err);
      void refreshVault();
      return null;
    }
  }, [requireSigner, ownerSnapshot, send, refreshVault]);

  const claimAssets = useCallback(async () => {
    try {
      const { program, signer } = requireSigner();
      if (!claimSnapshot) throw new Error("Look up a vault first.");
      const fresh = await fetchVaultSnapshot(program, claimSnapshot.vault.address);
      if (!fresh) throw new Error("The vault no longer exists.");
      if (!fresh.vault.beneficiary.equals(signer)) {
        throw new Error("The connected wallet is not this vault's beneficiary.");
      }
      const claimable = fresh.delegatedAccounts
        .filter((account) => !account.unsupportedReason)
        .map((account) => ({
          account,
          amount:
            account.amount < account.delegatedAmount ? account.amount : account.delegatedAmount,
        }))
        .filter((c) => c.amount > BigInt(0));
      if (claimable.length === 0) throw new Error("Nothing is claimable from this vault.");

      const groups = await Promise.all(
        claimable.map((c) =>
          claimDelegatedTokensIxs(program, signer, fresh.vault.address, c.account, c.amount),
        ),
      );
      const signature = await send(chunkIntoTransactions([], groups));
      reportSuccess("Inheritance claimed", signature);
      await refreshClaimLookup(fresh.vault.address);
      return signature;
    } catch (err) {
      reportFailure("Claim failed", err);
      if (claimSnapshot) {
        refreshClaimLookup(claimSnapshot.vault.address).catch(() => undefined);
      }
      return null;
    }
  }, [requireSigner, claimSnapshot, send, refreshClaimLookup]);

  const lookupVaultForClaim = useCallback(
    async (input: string) => {
      let key: PublicKey;
      try {
        key = new PublicKey(input.trim());
      } catch {
        return false;
      }
      try {
        const snapshot = await resolveVaultSnapshot(readonlyProgram, key);
        setClaimSnapshot(snapshot);
        return snapshot !== null;
      } catch (err) {
        reportFailure("Vault lookup failed", err);
        return null;
      }
    },
    [readonlyProgram],
  );

  const clearClaimLookup = useCallback(() => setClaimSnapshot(null), []);

  const vault = useMemo(
    () => (ownerSnapshot ? deriveVaultViewModel(ownerSnapshot, nowMs) : null),
    [ownerSnapshot, nowMs],
  );
  const claimLookupVault = useMemo(
    () => (claimSnapshot ? deriveVaultViewModel(claimSnapshot, nowMs) : null),
    [claimSnapshot, nowMs],
  );

  const value = useMemo(
    () => ({
      wallet,
      phantomInstalled,
      vault,
      vaultLoading,
      ownerTokenAccounts,
      tokenAccountsError,
      claimLookupVault,
      wizardOpen,
      wizardMode,
      wizardDraft,
      connectWallet,
      disconnectWallet,
      refreshVault,
      openWizard,
      closeWizard,
      setWizardDraft,
      completeCreatePlan,
      completeApprove,
      checkIn,
      cancelPlan,
      claimAssets,
      lookupVaultForClaim,
      clearClaimLookup,
    }),
    [
      wallet,
      phantomInstalled,
      vault,
      vaultLoading,
      ownerTokenAccounts,
      tokenAccountsError,
      claimLookupVault,
      wizardOpen,
      wizardMode,
      wizardDraft,
      connectWallet,
      disconnectWallet,
      refreshVault,
      openWizard,
      closeWizard,
      setWizardDraft,
      completeCreatePlan,
      completeApprove,
      checkIn,
      cancelPlan,
      claimAssets,
      lookupVaultForClaim,
      clearClaimLookup,
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
