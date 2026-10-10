import { InstructionChip } from "@/components/everkeep/instruction-chip";
import { CLUSTER_LABEL, SOLANA_CLUSTER } from "@/lib/everkeep/config";
import type { PlannedInstruction } from "@/types/wizard";

const SIGNATURE_FEE_SOL = 0.000005;

export function TxReviewPanel({
  instructions,
  transactions = 1,
}: {
  instructions: PlannedInstruction[];
  transactions?: number;
}) {
  const totalCost =
    instructions.reduce((s, i) => s + i.estCostSol, 0) +
    transactions * SIGNATURE_FEE_SOL;

  return (
    <div className="space-y-4 rounded-lg border border-white/10 bg-slate-900/50 p-4">
      <p className="text-sm font-medium">
        Transaction review{" "}
        {transactions > 1 && (
          <span className="text-xs text-muted-foreground">
            ({transactions} transactions, one wallet approval)
          </span>
        )}
      </p>
      <ul className="space-y-3">
        {instructions.map((ix, i) => (
          <li
            key={`${ix.name}-${i}`}
            className="rounded-md border border-white/5 p-3 text-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <InstructionChip name={ix.name} />
              {ix.estCostSol > 0 && (
                <span className="font-mono text-xs text-muted-foreground">
                  ~{ix.estCostSol.toFixed(6)} SOL
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground [overflow-wrap:anywhere]">
              Accounts: {ix.accountsSummary.join(" · ")}
            </p>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-white/10 pt-3 text-sm">
        <span className="text-muted-foreground">Estimated cost (fees + rent)</span>
        <span className="font-mono">{totalCost.toFixed(6)} SOL</span>
      </div>
      {SOLANA_CLUSTER !== "mainnet" && (
        <p className="text-xs text-muted-foreground">
          Sent to {CLUSTER_LABEL}. Set Phantom to Solana {CLUSTER_LABEL} (Settings →
          Developer Settings → Testnet Mode) so its preview matches; otherwise
          Phantom may warn that the transaction will fail.
        </p>
      )}
    </div>
  );
}
