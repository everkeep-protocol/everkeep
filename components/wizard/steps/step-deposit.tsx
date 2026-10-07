"use client";

import { MOCK_SPL_CATALOG } from "@/data/mocks/spl-tokens";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEverKeepApp } from "@/providers/everkeep-app-provider";
import { cn } from "@/lib/utils";

export function StepDeposit() {
  const { wizardDraft, wizardMode, setWizardDraft } = useEverKeepApp();

  const toggleSpl = (mint: string) => {
    const set = new Set(wizardDraft.depositSplMints);
    if (set.has(mint)) set.delete(mint);
    else set.add(mint);
    setWizardDraft({ depositSplMints: [...set] });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Deposit assets</h3>
        <p className="text-sm text-muted-foreground">
          {wizardMode === "update"
            ? "Optionally top up the vault while updating the plan. Leave at 0 to skip."
            : "Choose SOL and optional SPL tokens to fund the vault (simulated)."}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="deposit-sol">SOL amount</Label>
        <Input
          id="deposit-sol"
          type="number"
          min={0}
          step={0.01}
          value={wizardDraft.depositSol || ""}
          onChange={(e) =>
            setWizardDraft({
              depositSol: parseFloat(e.target.value) || 0,
            })
          }
        />
      </div>
      <div className="space-y-2">
        <Label>SPL tokens (optional)</Label>
        <div className="space-y-2">
          {MOCK_SPL_CATALOG.map((token) => {
            const selected = wizardDraft.depositSplMints.includes(token.mint);
            return (
              <button
                key={token.mint}
                type="button"
                onClick={() => toggleSpl(token.mint)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm",
                  selected
                    ? "border-everkeep-emerald/40 bg-everkeep-emerald/10"
                    : "border-white/10 hover:border-white/20",
                )}
              >
                <span>
                  {token.symbol}{" "}
                  <span className="text-muted-foreground">· {token.name}</span>
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  Bal: {token.amount}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function isStepDepositValid(depositSol: number, mode: string) {
  if (mode === "update") return depositSol >= 0;
  return depositSol > 0;
}
