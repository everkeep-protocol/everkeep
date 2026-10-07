"use client";

import { truncateAddress } from "@/lib/validators";
import { useEverKeepApp } from "@/providers/everkeep-app-provider";
import { TxReviewPanel } from "../tx-review-panel";
import { MOCK_SPL_CATALOG } from "@/data/mocks/spl-tokens";
import {
  MOCK_TX_CREATE_PLAN,
  MOCK_TX_DEPOSIT_ONLY,
  MOCK_TX_UPDATE_PLAN,
} from "@/data/mocks/transactions";
import type { CreatePlanDraft, WizardMode } from "@/types/wizard";

function instructionsForMode(mode: WizardMode, draft: CreatePlanDraft) {
  switch (mode) {
    case "update": {
      const topUp = draft.depositSol > 0 || draft.depositSplMints.length > 0;
      return topUp
        ? [...MOCK_TX_UPDATE_PLAN, ...MOCK_TX_DEPOSIT_ONLY]
        : MOCK_TX_UPDATE_PLAN;
    }
    case "deposit-only":
      return MOCK_TX_DEPOSIT_ONLY;
    default:
      return MOCK_TX_CREATE_PLAN;
  }
}

export function StepSummary() {
  const { wizardDraft, wizardMode } = useEverKeepApp();
  const days =
    wizardDraft.customThresholdDays ?? wizardDraft.inactivityThresholdDays;
  const splSymbols = MOCK_SPL_CATALOG.filter((t) =>
    wizardDraft.depositSplMints.includes(t.mint),
  ).map((t) => t.symbol);
  const showDeposit = wizardMode !== "update" || wizardDraft.depositSol > 0;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Summary & confirm</h3>
        <p className="text-sm text-muted-foreground">
          Review plan parameters before signing the simulated on-chain
          transaction.
        </p>
      </div>
      <dl className="grid gap-3 rounded-lg border border-white/10 p-4 text-sm">
        {wizardMode !== "deposit-only" && (
          <>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Beneficiary</dt>
              <dd className="font-mono">
                {truncateAddress(wizardDraft.beneficiary.trim(), 4)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Inactivity</dt>
              <dd>{days} days</dd>
            </div>
          </>
        )}
        {showDeposit && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Deposit</dt>
            <dd>{wizardDraft.depositSol} SOL</dd>
          </div>
        )}
        {splSymbols.length > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">SPL</dt>
            <dd>{splSymbols.join(", ")}</dd>
          </div>
        )}
      </dl>
      <TxReviewPanel
        instructions={instructionsForMode(wizardMode, wizardDraft)}
      />
    </div>
  );
}
