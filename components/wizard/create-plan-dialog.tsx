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
import { useToast } from "@/hooks/use-toast";
import { useEverKeepApp } from "@/providers/everkeep-app-provider";
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

const titles: Record<string, string> = {
  create: "Create inheritance plan",
  update: "Update inheritance plan",
  "deposit-only": "Deposit to vault",
};

export function CreatePlanDialog() {
  const {
    wizardOpen,
    wizardMode,
    wizardDraft,
    closeWizard,
    completeCreatePlan,
    completeUpdatePlan,
    completeDeposit,
  } = useEverKeepApp();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (wizardOpen) setStep(1);
  }, [wizardOpen, wizardMode]);

  const maxStep = wizardMode === "deposit-only" ? 2 : 4;
  const effectiveStep =
    wizardMode === "deposit-only"
      ? step === 1
        ? 3
        : 4
      : step;

  const resetAndClose = () => {
    setStep(1);
    closeWizard();
  };

  const canNext = () => {
    if (wizardMode === "deposit-only") {
      if (step === 1) return isStepDepositValid(wizardDraft.depositSol, wizardMode);
      return true;
    }
    if (step === 1) return isStepBeneficiaryValid(wizardDraft.beneficiary);
    if (step === 2) return true;
    if (step === 3)
      return isStepDepositValid(wizardDraft.depositSol, wizardMode);
    return true;
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      if (wizardMode === "create") await completeCreatePlan();
      else if (wizardMode === "update") await completeUpdatePlan();
      else await completeDeposit();
      setStep(1);
      toast({
        title: "Transaction confirmed",
        description: "On-chain execution simulated successfully.",
      });
      if (wizardMode === "create" && pathname !== ROUTES.dashboard) {
        router.push(ROUTES.dashboard);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onOpenChange = (open: boolean) => {
    if (!open) resetAndClose();
  };

  return (
    <Dialog open={wizardOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titles[wizardMode]}</DialogTitle>
          <DialogDescription>
            {wizardMode === "create"
              ? "Define beneficiary, rules, and initial deposit."
              : wizardMode === "update"
                ? "Update permitted plan parameters."
                : "Add assets to your active vault."}
          </DialogDescription>
        </DialogHeader>

        <WizardStepper currentStep={effectiveStep} />

        {wizardMode === "deposit-only" ? (
          <>
            {step === 1 && <StepDeposit />}
            {step === 2 && <StepSummary />}
          </>
        ) : (
          <>
            {step === 1 && <StepBeneficiary />}
            {step === 2 && <StepRules />}
            {step === 3 && <StepDeposit />}
            {step === 4 && <StepSummary />}
          </>
        )}

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
