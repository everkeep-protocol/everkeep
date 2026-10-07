import type { InstructionName } from "@/types/wizard";
import { cn } from "@/lib/utils";

const labels: Record<InstructionName, string> = {
  initialize: "initialize()",
  deposit: "deposit()",
  check_in: "check_in()",
  update_plan: "update_plan()",
  cancel: "cancel()",
  claim: "claim()",
};

export function InstructionChip({
  name,
  className,
}: {
  name: InstructionName;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md border border-everkeep-violet/30 bg-everkeep-violet/10 px-2 py-0.5 font-mono text-xs text-everkeep-violet",
        className,
      )}
    >
      {labels[name]}
    </span>
  );
}
