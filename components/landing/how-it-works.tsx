import {
  Activity,
  ArrowDownToLine,
  FilePlus2,
  Gift,
  ScanEye,
  type LucideIcon,
} from "lucide-react";
import { InstructionChip } from "@/components/everkeep/instruction-chip";
import type { InstructionName } from "@/types/wizard";

const steps: {
  icon: LucideIcon;
  title: string;
  description: string;
  instruction?: InstructionName;
}[] = [
  {
    icon: FilePlus2,
    title: "Create Plan",
    description: "Connect your wallet, choose a beneficiary, and define the inheritance rules.",
    instruction: "initialize",
  },
  {
    icon: ArrowDownToLine,
    title: "Deposit Assets",
    description: "Move SOL and supported SPL tokens into the program-controlled vault.",
    instruction: "deposit",
  },
  {
    icon: Activity,
    title: "Check In",
    description: "Periodically confirm activity to reset the inactivity timer.",
    instruction: "check_in",
  },
  {
    icon: ScanEye,
    title: "Monitor Condition",
    description: "The program verifies whether the inactivity threshold has been reached.",
  },
  {
    icon: Gift,
    title: "Claim",
    description: "The beneficiary submits a claim once the on-chain rules are met.",
    instruction: "claim",
  },
];

export function HowItWorks() {
  return (
    <section className="pb-20">
      <div className="mb-8 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-everkeep-cyan">
          How it works
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
          From ownership to inheritance in five steps
        </h2>
      </div>
      <ol className="grid gap-4 md:grid-cols-5">
        {steps.map((step, i) => (
          <li
            key={step.title}
            className="glass-card relative flex flex-col gap-3 p-5 transition-colors hover:border-everkeep-emerald/25"
          >
            <div className="flex items-center justify-between">
              <step.icon className="h-5 w-5 text-everkeep-emerald" />
              <span className="font-mono text-xs text-muted-foreground">
                0{i + 1}
              </span>
            </div>
            <h3 className="font-semibold">{step.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {step.description}
            </p>
            {step.instruction && (
              <div className="mt-auto pt-2">
                <InstructionChip name={step.instruction} />
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
