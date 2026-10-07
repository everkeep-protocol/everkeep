"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidSolanaAddress } from "@/lib/validators";
import { useEverKeepApp } from "@/providers/everkeep-app-provider";

export function StepBeneficiary() {
  const { wizardDraft, setWizardDraft } = useEverKeepApp();
  const valid = isValidSolanaAddress(wizardDraft.beneficiary);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Beneficiary setup</h3>
        <p className="text-sm text-muted-foreground">
          Enter the Solana public key that will be allowed to claim when
          inactivity conditions are met.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="beneficiary">Beneficiary public key</Label>
        <Input
          id="beneficiary"
          placeholder="7xK...92A"
          value={wizardDraft.beneficiary}
          onChange={(e) => setWizardDraft({ beneficiary: e.target.value })}
        />
        {wizardDraft.beneficiary && !valid && (
          <p className="text-xs text-destructive">
            Enter a valid base58 Solana address (32–44 characters).
          </p>
        )}
      </div>
    </div>
  );
}

export function isStepBeneficiaryValid(beneficiary: string) {
  return isValidSolanaAddress(beneficiary);
}
