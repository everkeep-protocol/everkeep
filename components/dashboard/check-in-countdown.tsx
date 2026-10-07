"use client";

import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCountdown, useCountdown } from "@/hooks/use-countdown";
import type { VaultConditionStatus } from "@/types/vault";
import { cn } from "@/lib/utils";

interface CheckInCountdownProps {
  deadlineIso: string;
  conditionStatus: VaultConditionStatus;
}

export function CheckInCountdown({
  deadlineIso,
  conditionStatus,
}: CheckInCountdownProps) {
  const parts = useCountdown(deadlineIso);
  const label = formatCountdown(parts);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-900/30 p-4">
      <div className="flex items-center gap-2">
        <Clock
          className={cn(
            "h-4 w-4",
            conditionStatus === "warning"
              ? "text-amber-400"
              : "text-everkeep-cyan",
          )}
        />
        <span className="text-sm text-muted-foreground">
          Next check-in deadline
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "font-mono text-lg font-semibold",
            conditionStatus === "warning" && "text-amber-300",
            conditionStatus === "active" && "text-everkeep-emerald",
            conditionStatus === "claimable" && "text-muted-foreground",
          )}
        >
          {conditionStatus === "claimable" ? "Threshold exceeded" : label}
        </span>
        {conditionStatus === "warning" && (
          <Badge variant="warning">Check in soon</Badge>
        )}
      </div>
    </div>
  );
}
