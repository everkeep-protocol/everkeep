"use client";

import { INACTIVITY_PRESETS } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEverKeepApp } from "@/providers/everkeep-app-provider";
import { cn } from "@/lib/utils";

export function StepRules() {
  const { wizardDraft, setWizardDraft } = useEverKeepApp();
  const custom = wizardDraft.customThresholdDays !== undefined;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Rules & inactivity threshold</h3>
        <p className="text-sm text-muted-foreground">
          If you don&apos;t check in within this period, the beneficiary may
          claim vault assets.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {INACTIVITY_PRESETS.map((days) => (
          <button
            key={days}
            type="button"
            onClick={() =>
              setWizardDraft({
                inactivityThresholdDays: days,
                customThresholdDays: undefined,
              })
            }
            className={cn(
              "rounded-lg border px-3 py-3 text-sm font-medium transition-colors",
              !custom &&
                wizardDraft.inactivityThresholdDays === days &&
                "border-everkeep-emerald/50 bg-everkeep-emerald/10 text-everkeep-emerald",
              (custom || wizardDraft.inactivityThresholdDays !== days) &&
                "border-white/10 hover:border-white/20",
            )}
          >
            {days} days
          </button>
        ))}
      </div>
      <div className="space-y-2">
        <Label htmlFor="custom-days">Custom (days)</Label>
        <Input
          id="custom-days"
          type="number"
          min={1}
          placeholder="e.g. 45"
          value={wizardDraft.customThresholdDays ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) {
              setWizardDraft({ customThresholdDays: undefined });
              return;
            }
            setWizardDraft({
              customThresholdDays: Math.max(1, parseInt(v, 10) || 1),
            });
          }}
        />
      </div>
    </div>
  );
}
