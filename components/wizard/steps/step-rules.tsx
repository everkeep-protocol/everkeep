"use client";

import { INACTIVITY_PRESETS, LOCALNET_TEST_PRESET } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEverKeepApp } from "@/providers/everkeep-app-provider";
import { cn } from "@/lib/utils";

export function StepRules() {
  const { wizardDraft, setWizardDraft, wallet } = useEverKeepApp();
  const custom = wizardDraft.customThresholdDays !== undefined;
  const presets =
    wallet.cluster === "localnet"
      ? [LOCALNET_TEST_PRESET, ...INACTIVITY_PRESETS]
      : INACTIVITY_PRESETS;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Rules & inactivity threshold</h3>
        <p className="text-sm text-muted-foreground">
          If you don&apos;t check in within this period, the beneficiary may
          claim the approved token allowances.
        </p>
      </div>
      <div
        className={cn(
          "grid gap-2",
          presets.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3",
        )}
      >
        {presets.map((preset) => {
          const selected =
            !custom && wizardDraft.inactivityPeriodSeconds === preset.seconds;
          return (
            <button
              key={preset.seconds}
              type="button"
              onClick={() =>
                setWizardDraft({
                  inactivityPeriodSeconds: preset.seconds,
                  customThresholdDays: undefined,
                })
              }
              className={cn(
                "rounded-lg border px-3 py-3 text-sm font-medium transition-colors",
                selected
                  ? "border-everkeep-emerald/50 bg-everkeep-emerald/10 text-everkeep-emerald"
                  : "border-white/10 hover:border-white/20",
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      {wallet.cluster === "localnet" && (
        <p className="text-xs text-muted-foreground">
          Use {LOCALNET_TEST_PRESET.label} on localnet to test claims without waiting.
        </p>
      )}
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
