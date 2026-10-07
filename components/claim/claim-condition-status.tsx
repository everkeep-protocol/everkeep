"use client";

import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import type { VaultViewModel } from "@/types/vault";
import { CheckInCountdown } from "@/components/dashboard/check-in-countdown";

export function ClaimConditionStatus({ vault }: { vault: VaultViewModel }) {
  const claimable = vault.conditionStatus === "claimable";
  const claimed = vault.status === "claimed";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={claimable ? "claimable" : "outline"}>
          {claimed
            ? "CLAIMED"
            : claimable
              ? "CONDITION MET"
              : "PENDING INACTIVITY"}
        </Badge>
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Inactivity threshold</dt>
          <dd className="font-medium">{vault.inactivityThresholdDays} days</dd>
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
          <dt className="text-muted-foreground">Protected assets</dt>
          <dd className="font-medium">{vault.totalProtectedDisplay}</dd>
        </div>
      </dl>
      {!claimable && !claimed && (
        <CheckInCountdown
          deadlineIso={vault.claimEligibleAt}
          conditionStatus={vault.conditionStatus}
        />
      )}
    </div>
  );
}
