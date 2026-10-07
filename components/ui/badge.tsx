import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-everkeep-emerald/15 text-everkeep-emerald",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground border-white/20",
        devnet:
          "border-everkeep-cyan/40 bg-everkeep-cyan/10 text-everkeep-cyan",
        mainnet: "border-white/25 bg-white/5 text-foreground",
        warning:
          "border-amber-400/40 bg-amber-400/10 text-amber-300",
        claimable:
          "border-everkeep-emerald/50 bg-everkeep-emerald/20 text-everkeep-emerald",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
