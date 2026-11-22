import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const skeletonVariants = cva("animate-pulse rounded-lg bg-surface-raised", {
  variants: {
    variant: { text: "h-4", card: "h-44", circle: "h-10 w-10 rounded-full" },
  },
  defaultVariants: { variant: "text" },
});

const Skeleton = ({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof skeletonVariants>) => (
  <div className={cn(skeletonVariants({ variant }), className)} {...props} />
);

export { Skeleton };
