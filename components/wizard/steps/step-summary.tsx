"use client";

import { useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { truncateAddress } from "@/lib/validators";
import { formatDuration } from "@/lib/format";
import { effectivePeriodSeconds, resolveApprovals } from "@/lib/everkeep/draft";
import { MAX_TOKEN_IXS_PER_TX } from "@/lib/everkeep/instructions";
import { formatTokenAmount, tokenProgramLabel } from "@/lib/everkeep/tokens";
import { useEverKeepApp } from "@/providers/everkeep-app-provider";
import { TxReviewPanel } from "../tx-review-panel";
import type { PlannedInstruction } from "@/types/wizard";

/** 8-byte discriminator + InitSpace of `Vault` / `OwnerRegistry` in the program. */
const VAULT_ACCOUNT_SIZE = 8 + 32 + 32 + 8 + 8 + 1 + 8 + 1;
const REGISTRY_ACCOUNT_SIZE = 8 + 32 + 8 + (1 + 32) + 1;

export function StepSummary() {
  const { wizardDraft, wizardMode, ownerTokenAccounts, vault } = useEverKeepApp();
  const { connection } = useConnection();
  const [rentSol, setRentSol] = useState(0);

  const period = effectivePeriodSeconds(wizardDraft);
  const approvals = resolveApprovals(wizardDraft, ownerTokenAccounts) ?? [];

  useEffect(() => {
    if (wizardMode !== "create") return;
    let cancelled = false;
    // Registry is created only on the owner's first vault; show the upper bound.
    Promise.all([
      connection.getMinimumBalanceForRentExemption(VAULT_ACCOUNT_SIZE),
      connection.getMinimumBalanceForRentExemption(REGISTRY_ACCOUNT_SIZE),
    ])
      .then(([v, r]) => !cancelled && setRentSol((v + r) / LAMPORTS_PER_SOL))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [connection, wizardMode]);

  const instructions: PlannedInstruction[] = [
    ...(wizardMode === "create"
      ? [
          {
            name: "initialize_vault" as const,
            accountsSummary: ["Owner", "Registry PDA", "Vault PDA", "System Program"],
            estCostSol: rentSol,
          },
        ]
      : []),
    ...approvals.map((a) => ({
      name: "approve_checked" as const,
      accountsSummary: [
        `Token account ${truncateAddress(a.account.address.toBase58(), 4)}`,
        `Mint ${a.account.symbol ?? truncateAddress(a.account.mint.toBase58(), 4)} (${tokenProgramLabel(a.account.programId)})`,
        "Delegate: Vault PDA",
        "Owner",
      ],
      estCostSol: 0,
    })),
  ];
  const transactions = Math.max(
    1,
    Math.ceil(approvals.length / MAX_TOKEN_IXS_PER_TX),
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Summary & confirm</h3>
        <p className="text-sm text-muted-foreground">
          Review the plan before signing with your wallet.
        </p>
      </div>
      <dl className="grid gap-3 rounded-lg border border-white/10 p-4 text-sm">
        {wizardMode === "create" ? (
          <>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Beneficiary</dt>
              <dd className="font-mono">
                {truncateAddress(wizardDraft.beneficiary.trim(), 4)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Inactivity</dt>
              <dd>{formatDuration(period)}</dd>
            </div>
          </>
        ) : (
          vault && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Vault PDA</dt>
              <dd className="font-mono">{truncateAddress(vault.vaultPda, 4)}</dd>
            </div>
          )
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Allowances</dt>
          <dd className="text-right">
            {approvals.length === 0
              ? "None"
              : approvals.map((a) => (
                  <span key={a.account.address.toBase58()} className="block font-mono text-xs">
                    {formatTokenAmount(a.amount, a.account.decimals)}{" "}
                    {a.account.symbol ?? truncateAddress(a.account.mint.toBase58(), 4)}
                  </span>
                ))}
          </dd>
        </div>
      </dl>
      <TxReviewPanel instructions={instructions} transactions={transactions} />
    </div>
  );
}
