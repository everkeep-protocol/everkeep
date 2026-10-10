"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEverKeepApp } from "@/providers/everkeep-app-provider";
import type { WizardMode } from "@/types/wizard";
import { WizardStepper } from "./wizard-stepper";
import {
  isStepBeneficiaryValid,
  StepBeneficiary,
} from "./steps/step-beneficiary";
import { StepRules } from "./steps/step-rules";
import {
  isStepDepositValid,
  StepDeposit,
} from "./steps/step-deposit";
import { StepSummary } from "./steps/step-summary";

const titles: Record<WizardMode, string> = {
  create: "Create inheritance plan",
  approve: "Approve SPL tokens",
};

export function CreatePlanDialog() {
  const {
    wizardOpen,
    wizardMode,
    wizardDraft,
    wallet,
    ownerTokenAccounts,
    closeWizard,
    completeCreatePlan,
    completeApprove,
  } = useEverKeepApp();
  const router = useRouter();
  const pathname = usePathname();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (wizardOpen) setStep(1);
  }, [wizardOpen, wizardMode]);

  const maxStep = wizardMode === "approve" ? 2 : 4;
  const effectiveStep = wizardMode === "approve" ? step + 2 : step;

  const resetAndClose = () => {
    setStep(1);
    closeWizard();
  };

  const canNext = () => {
    switch (effectiveStep) {
      case 1:
        return isStepBeneficiaryValid(wizardDraft.beneficiary, wallet.publicKey);
      case 3:
        return isStepDepositValid(wizardDraft, wizardMode, ownerTokenAccounts);
      default:
        return true;
    }
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const signature =
        wizardMode === "create"
          ? await completeCreatePlan()
          : await completeApprove();
      if (!signature) return;
      setStep(1);
      if (wizardMode === "create" && pathname !== ROUTES.dashboard) {
        router.push(ROUTES.dashboard);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onOpenChange = (open: boolean) => {
    if (!open && !submitting) resetAndClose();
  };

  return (
    <Dialog open={wizardOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titles[wizardMode]}</DialogTitle>
          <DialogDescription>
            {wizardMode === "create"
              ? "Define beneficiary, rules, and token allowances."
              : "Set the vault PDA as delegate on your token accounts."}
          </DialogDescription>
        </DialogHeader>

        <WizardStepper currentStep={effectiveStep} />

        {effectiveStep === 1 && <StepBeneficiary />}
        {effectiveStep === 2 && <StepRules />}
        {effectiveStep === 3 && <StepDeposit />}
        {effectiveStep === 4 && <StepSummary />}

        <DialogFooter className="gap-2 sm:gap-0">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              disabled={submitting}
            >
              Back
            </Button>
          )}
          {step < maxStep ? (
            <Button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext()}
            >
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={submitting || !canNext()}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing…
                </>
              ) : (
                "Confirm & Sign"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
