"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddressChip } from "@/components/everkeep/address-chip";
import { formatDate } from "@/lib/format";
import type { VaultViewModel } from "@/types/vault";
import { AssetBreakdown } from "./asset-breakdown";
import { CheckInCountdown } from "./check-in-countdown";
import { cn } from "@/lib/utils";

export function VaultOverviewCard({ vault }: { vault: VaultViewModel }) {
  const statusBadge =
    vault.conditionStatus === "claimable"
      ? "claimable"
      : vault.conditionStatus === "warning"
        ? "warning"
        : "default";

  return (
    <Card
      className={cn(
        vault.conditionStatus === "active" && "glass-card-active",
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            Active Vault
            <Badge variant={statusBadge}>
              {vault.conditionStatus === "active"
                ? "PLAN ACTIVE"
                : vault.conditionStatus === "warning"
                  ? "DEADLINE SOON"
                  : "CONDITION MET"}
            </Badge>
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Program-enforced inheritance vault on {vault.planId}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <AssetBreakdown vault={vault} />
        <div className="grid gap-4 sm:grid-cols-2">
          <AddressChip address={vault.vaultPda} label="Vault PDA" />
          <AddressChip address={vault.beneficiary} label="Beneficiary" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["Inactivity threshold", `${vault.inactivityThresholdDays} days`],
            ["Last check-in", formatDate(vault.lastCheckInAt)],
            ["Next check-in", formatDate(vault.nextCheckInDeadlineAt)],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 text-lg font-medium">{value}</p>
            </div>
          ))}
        </div>
        <CheckInCountdown
          deadlineIso={vault.nextCheckInDeadlineAt}
          conditionStatus={vault.conditionStatus}
        />
      </CardContent>
    </Card>
  );
}
