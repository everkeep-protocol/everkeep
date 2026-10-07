"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddressChip } from "@/components/everkeep/address-chip";
import { useToast } from "@/hooks/use-toast";
import { useEverKeepApp } from "@/providers/everkeep-app-provider";
import { ClaimActionPanel } from "./claim-action-panel";
import { ClaimConditionStatus } from "./claim-condition-status";
import { VaultLookupForm } from "./vault-lookup-form";

export function BeneficiaryClaimPortal() {
  const { claimLookupVault, lookupVaultForClaim, setClaimLookupVault } =
    useEverKeepApp();
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Beneficiary Claim Portal
        </h1>
        <p className="text-muted-foreground">
          Inspect vault conditions and claim assets when the inactivity
          threshold has been reached.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Find vault</CardTitle>
        </CardHeader>
        <CardContent>
          <VaultLookupForm
            onLookup={lookupVaultForClaim}
            onError={() =>
              toast({
                variant: "destructive",
                title: "Vault not found",
                description: "No matching vault for that PDA (demo lookup).",
              })
            }
          />
        </CardContent>
      </Card>

      {claimLookupVault && (
        <Card className="glass-card-active">
          <CardHeader>
            <CardTitle>Vault inspection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <AddressChip address={claimLookupVault.vaultPda} label="Vault PDA" />
            <AddressChip
              address={claimLookupVault.beneficiary}
              label="Beneficiary"
            />
            <ClaimConditionStatus vault={claimLookupVault} />
            <ClaimActionPanel vault={claimLookupVault} />
            <button
              type="button"
              className="text-xs text-muted-foreground underline"
              onClick={() => setClaimLookupVault(null)}
            >
              Clear inspection
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
