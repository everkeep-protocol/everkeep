import { Coins } from "lucide-react";
import { lamportsToSol } from "@/lib/format";
import type { VaultViewModel } from "@/types/vault";

export function AssetBreakdown({ vault }: { vault: VaultViewModel }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">Total protected assets</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-everkeep-emerald/30 to-everkeep-cyan/20">
            <Coins className="h-4 w-4 text-everkeep-emerald" />
          </div>
          <span className="text-3xl font-semibold tracking-tight">
            {lamportsToSol(vault.assets.solLamports)}
          </span>
        </div>
        {vault.assets.spl.map((token) => (
          <div
            key={token.mint}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium"
          >
            {token.symbol}
          </div>
        ))}
      </div>
    </div>
  );
}
