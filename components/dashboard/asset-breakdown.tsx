import { Coins } from "lucide-react";
import { formatTokenAmount, tokenProgramLabel } from "@/lib/everkeep/tokens";
import { tokenLabel } from "@/lib/everkeep/vault";
import type { VaultViewModel } from "@/types/vault";
import { cn } from "@/lib/utils";

export function AssetBreakdown({ vault }: { vault: VaultViewModel }) {
  const count = vault.delegations.length;

  return (
    <div className="min-w-0">
      <p className="text-sm text-muted-foreground">
        Protected assets (delegated allowances)
      </p>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-everkeep-emerald/30 to-everkeep-cyan/20">
          <Coins className="h-4 w-4 text-everkeep-emerald" />
        </div>
        <span className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {count} token account{count === 1 ? "" : "s"}
        </span>
      </div>
      {count > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {vault.delegations.map((d) => (
            <li
              key={d.tokenAccount}
              className={cn(
                "max-w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs",
                d.unsupportedReason && "border-amber-500/30",
              )}
            >
              <span className="font-mono text-sm font-medium">
                {formatTokenAmount(d.claimable, d.decimals)} {tokenLabel(d)}
              </span>
              <span className="ml-2 text-muted-foreground">
                {tokenProgramLabel(d.programId)}
              </span>
              <span className="block text-muted-foreground">
                Allowance {formatTokenAmount(d.delegatedAmount, d.decimals)} · Wallet balance{" "}
                {formatTokenAmount(d.balance, d.decimals)}
              </span>
              {d.unsupportedReason && (
                <span className="block text-amber-300">{d.unsupportedReason}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {count === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Nothing is approved yet. Use Approve SPL Tokens to add allowances.
        </p>
      )}
    </div>
  );
}
