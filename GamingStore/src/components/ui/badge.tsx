import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-primary/30 bg-primary/15 text-violet-300",
        neutral: "border-border bg-surface-raised text-foreground-muted",
        accent: "border-sky-400/30 bg-sky-400/10 text-sky-300",
        success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
        warning: "border-amber-400/30 bg-amber-400/10 text-amber-300",
        danger: "border-red-400/30 bg-red-400/10 text-red-300",
        outline: "border-border text-foreground-muted",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <div className={cn(badgeVariants({ variant }), className)} {...props} />
);

export { Badge, badgeVariants };
