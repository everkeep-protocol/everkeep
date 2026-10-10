import { Layers, LockKeyhole, Zap } from "lucide-react";
import { GlassMetricCard } from "@/components/everkeep/glass-metric-card";

const metrics = [
  {
    icon: LockKeyhole,
    title: "Non-Custodial",
    description:
      "Assets never leave your wallet. The vault PDA only holds a revocable SPL delegate allowance.",
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
      "Fast, low-cost transactions for SPL Token and Token-2022 assets, signed with Phantom.",
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
