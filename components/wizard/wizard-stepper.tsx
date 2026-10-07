import { cn } from "@/lib/utils";

const stepLabels = [
  "Beneficiary",
  "Rules",
  "Deposit",
  "Confirm",
];

export function WizardStepper({ currentStep }: { currentStep: number }) {
  return (
    <ol className="mb-6 flex items-center justify-between gap-2">
      {stepLabels.map((label, i) => {
        const step = i + 1;
        const active = step === currentStep;
        const done = step < currentStep;
        return (
          <li key={label} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                active &&
                  "border-everkeep-emerald bg-everkeep-emerald/20 text-everkeep-emerald shadow-glow-sm",
                done && "border-everkeep-emerald/50 bg-everkeep-emerald/10 text-everkeep-emerald",
                !active && !done && "border-white/15 text-muted-foreground",
              )}
            >
              {step}
            </div>
            <span
              className={cn(
                "hidden text-[10px] uppercase tracking-wide sm:block",
                active ? "text-everkeep-emerald" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
