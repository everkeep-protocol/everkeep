"use client";

import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CLUSTER_LABEL, SOLANA_CLUSTER } from "@/lib/everkeep/config";
import { resolveApprovals } from "@/lib/everkeep/draft";
import { KNOWN_TOKENS } from "@/lib/everkeep/known-tokens";
import {
  formatTokenAmount,
  parseTokenAmount,
  tokenProgramLabel,
  type OwnerTokenAccount,
} from "@/lib/everkeep/tokens";
import { truncateAddress } from "@/lib/validators";
import { useEverKeepApp } from "@/providers/everkeep-app-provider";
import type { CreatePlanDraft, WizardMode } from "@/types/wizard";
import { cn } from "@/lib/utils";

const FAUCETS: Record<string, string> = {
  PYUSD: "https://faucet.paxos.com",
  USDC: "https://faucet.circle.com",
};

function rawToInput(raw: bigint, decimals: number) {
  return formatTokenAmount(raw, decimals).replace(/,/g, "");
}

function DelegationNote({
  account,
  vaultPda,
}: {
  account: OwnerTokenAccount;
  vaultPda: string | null;
}) {
  if (!account.delegate || account.delegatedAmount === BigInt(0)) return null;
  const amount = formatTokenAmount(account.delegatedAmount, account.decimals);
  const toVault = vaultPda !== null && account.delegate.toBase58() === vaultPda;
  return (
    <p
      className={cn(
        "text-xs",
        toVault ? "text-everkeep-emerald" : "text-amber-300",
      )}
    >
      {toVault
        ? `Currently delegated to this vault: ${amount}`
        : `Delegated ${amount} to ${truncateAddress(account.delegate.toBase58(), 4)} — approving replaces that delegate.`}
    </p>
  );
}

export function StepDeposit() {
  const {
    wizardDraft,
    wizardMode,
    setWizardDraft,
    ownerTokenAccounts,
    tokenAccountsError,
    vaultLoading,
    refreshVault,
    vault,
  } = useEverKeepApp();
  const vaultPda = wizardMode === "approve" ? (vault?.vaultPda ?? null) : null;
  const accounts = ownerTokenAccounts.filter((a) => a.amount > BigInt(0));
  const emptyKnown = KNOWN_TOKENS[SOLANA_CLUSTER].filter(
    (t) => !accounts.some((a) => a.mint.equals(t.mint)),
  );

  const toggle = (account: OwnerTokenAccount) => {
    if (account.unsupportedReason) return;
    const key = account.address.toBase58();
    const next = { ...wizardDraft.approvals };
    if (key in next) delete next[key];
    else next[key] = rawToInput(account.amount, account.decimals);
    setWizardDraft({ approvals: next });
  };

  const setAmount = (key: string, value: string) =>
    setWizardDraft({ approvals: { ...wizardDraft.approvals, [key]: value } });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Approve SPL tokens</h3>
        <p className="text-sm text-muted-foreground">
          Tokens stay in your wallet. Each approval makes the vault PDA the
          SPL delegate for an allowance the beneficiary can claim after
          inactivity. Approving again replaces the previous allowance.
          {wizardMode === "create" && " You can skip this and approve later."}
        </p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Label>Your {CLUSTER_LABEL} token accounts</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void refreshVault()}
          disabled={vaultLoading}
          className="gap-1.5"
        >
          {vaultLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </Button>
      </div>
      {tokenAccountsError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p className="min-w-0 [overflow-wrap:anywhere]">
            Could not load token balances: {tokenAccountsError}
          </p>
        </div>
      )}
      {accounts.length === 0 ? (
        <p className="rounded-lg border border-white/10 p-4 text-sm text-muted-foreground">
          {vaultLoading
            ? "Loading token accounts…"
            : tokenAccountsError
              ? "Balances are unavailable until the RPC responds. Use Refresh to retry."
              : `No SPL Token or Token-2022 balances found for this wallet on ${CLUSTER_LABEL}.`}
        </p>
      ) : (
        <div className="space-y-2">
          {accounts.map((account) => {
            const key = account.address.toBase58();
            const selected = key in wizardDraft.approvals;
            const value = wizardDraft.approvals[key] ?? "";
            const parsed = selected ? parseTokenAmount(value, account.decimals) : null;
            const invalid =
              selected &&
              (parsed === null || parsed <= BigInt(0) || parsed > account.amount);
            const unsupported = account.unsupportedReason;
            return (
              <div
                key={key}
                className={cn(
                  "space-y-1 rounded-lg border px-3 py-2 text-sm",
                  selected
                    ? "border-everkeep-emerald/40 bg-everkeep-emerald/10"
                    : "border-white/10",
                  unsupported && "opacity-60",
                )}
              >
                <button
                  type="button"
                  onClick={() => toggle(account)}
                  disabled={Boolean(unsupported)}
                  className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 text-left disabled:cursor-not-allowed"
                >
                  <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-medium">
                      {account.symbol ?? "Unknown token"}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {truncateAddress(account.mint.toBase58(), 4)}
                    </span>
                    <span className="rounded border border-white/10 px-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {tokenProgramLabel(account.programId)}
                    </span>
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    Wallet balance: {formatTokenAmount(account.amount, account.decimals)}
                  </span>
                </button>
                <DelegationNote account={account} vaultPda={vaultPda} />
                {unsupported && (
                  <p className="text-xs text-amber-300">Not supported: {unsupported}</p>
                )}
                {selected && (
                  <div className="space-y-1 pt-1">
                    <Input
                      aria-label="Allowance"
                      inputMode="decimal"
                      value={value}
                      onChange={(e) => setAmount(key, e.target.value)}
                      className="h-8 font-mono text-xs"
                    />
                    {invalid && (
                      <p className="text-xs text-destructive">
                        Enter an amount above 0 and at most your wallet balance.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {!vaultLoading && !tokenAccountsError && emptyKnown.length > 0 && (
        <p className="text-xs text-muted-foreground">
          No {emptyKnown.map((t) => t.symbol).join(" or ")} balance on {CLUSTER_LABEL}.
          {emptyKnown.map((t) =>
            FAUCETS[t.symbol] ? (
              <span key={t.symbol}>
                {" "}
                Get test {t.symbol} at{" "}
                <a
                  href={FAUCETS[t.symbol]}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  {FAUCETS[t.symbol].replace("https://", "")}
                </a>
                .
              </span>
            ) : null,
          )}
        </p>
      )}
    </div>
  );
}

export function isStepDepositValid(
  draft: CreatePlanDraft,
  mode: WizardMode,
  accounts: OwnerTokenAccount[],
) {
  const approvals = resolveApprovals(draft, accounts);
  if (!approvals) return false;
  return mode === "create" || approvals.length > 0;
}
