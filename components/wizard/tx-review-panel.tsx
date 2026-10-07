import { InstructionChip } from "@/components/everkeep/instruction-chip";
import type { SimulatedInstruction } from "@/types/wizard";

export function TxReviewPanel({
  instructions,
}: {
  instructions: SimulatedInstruction[];
}) {
  const totalFee = instructions.reduce((s, i) => s + i.estFeeSol, 0);

  return (
    <div className="space-y-4 rounded-lg border border-white/10 bg-slate-900/50 p-4">
      <p className="text-sm font-medium">Simulated transaction review</p>
      <ul className="space-y-3">
        {instructions.map((ix) => (
          <li
            key={ix.name}
            className="rounded-md border border-white/5 p-3 text-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <InstructionChip name={ix.name} />
              <span className="font-mono text-xs text-muted-foreground">
                ~{ix.estFeeSol} SOL
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Accounts: {ix.accountsSummary.join(" · ")}
            </p>
          </li>
        ))}
      </ul>
      <div className="flex justify-between border-t border-white/10 pt-3 text-sm">
        <span className="text-muted-foreground">Estimated network fee</span>
        <span className="font-mono">{totalFee.toFixed(5)} SOL</span>
      </div>
    </div>
  );
}
