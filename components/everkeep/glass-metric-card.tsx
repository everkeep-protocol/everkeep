import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface GlassMetricCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export function GlassMetricCard({
  icon: Icon,
  title,
  description,
  className,
}: GlassMetricCardProps) {
  return (
    <div
      className={cn(
        "glass-card group p-6 transition-colors hover:border-everkeep-emerald/25",
        className,
      )}
    >
      <div className="mb-4 inline-flex rounded-lg border border-everkeep-emerald/20 bg-everkeep-emerald/10 p-2.5">
        <Icon className="h-5 w-5 text-everkeep-emerald" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
