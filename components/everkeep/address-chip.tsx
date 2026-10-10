"use client";

import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { truncateAddress } from "@/lib/validators";
import { useClipboard } from "@/hooks/use-clipboard";
import { cn } from "@/lib/utils";

interface AddressChipProps {
  address: string;
  label?: string;
  className?: string;
}

export function AddressChip({ address, label, className }: AddressChipProps) {
  const { copied, copy } = useClipboard();

  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      {label && (
        <span className="text-xs text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
      )}
      <div className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-slate-900/40 px-3 py-2">
        <code className="min-w-0 truncate font-mono text-sm text-everkeep-cyan" title={address}>
          {truncateAddress(address, 4)}
        </code>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => copy(address)}
          aria-label="Copy address"
        >
          {copied ? (
            <Check className="h-4 w-4 text-everkeep-emerald" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
