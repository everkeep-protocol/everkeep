"use client";

import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatDuration } from "@/lib/format";
import type { VaultViewModel } from "@/types/vault";
import { CheckInCountdown } from "@/components/dashboard/check-in-countdown";

export function ClaimConditionStatus({ vault }: { vault: VaultViewModel }) {
  const claimable = vault.conditionStatus === "claimable";
  const drained = claimable && !vault.hasClaimableTokens;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={claimable ? "claimable" : "outline"}>
          {drained
            ? "NOTHING LEFT TO CLAIM"
            : claimable
              ? "CONDITION MET"
              : "PENDING INACTIVITY"}
        </Badge>
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Inactivity threshold</dt>
          <dd className="font-medium">
            {formatDuration(vault.inactivityPeriodSeconds)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Last owner check-in</dt>
          <dd className="font-medium">{formatDateTime(vault.lastCheckInAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Claim eligible after</dt>
          <dd className="font-medium">{formatDateTime(vault.claimEligibleAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Claimable now</dt>
          <dd className="font-mono text-xs font-medium [overflow-wrap:anywhere]">
            {vault.totalProtectedDisplay}
          </dd>
        </div>
      </dl>
      {!claimable && (
        <CheckInCountdown
          deadlineIso={vault.claimEligibleAt}
          conditionStatus={vault.conditionStatus}
        />
      )}
    </div>
  );
}
