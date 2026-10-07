import { Layers, LockKeyhole, Zap } from "lucide-react";
import { GlassMetricCard } from "@/components/everkeep/glass-metric-card";

const metrics = [
  {
    icon: LockKeyhole,
    title: "Non-Custodial",
    description:
      "You retain control until conditions are met. Assets live in a program-controlled vault—not a company wallet.",
  },
  {
    icon: Layers,
    title: "Trustless Execution",
    description:
      "No administrator required. Transfers execute when on-chain inactivity and plan rules are satisfied.",
  },
  {
    icon: Zap,
    title: "Solana-Native",
    description:
      "Fast, low-cost transactions built for SOL and SPL assets with wallet-adapter ready integration.",
  },
];

export function MetricCards() {
  return (
    <section className="pb-16">
      <div className="grid gap-6 md:grid-cols-3">
        {metrics.map((m) => (
          <GlassMetricCard key={m.title} {...m} />
        ))}
      </div>
    </section>
  );
}
