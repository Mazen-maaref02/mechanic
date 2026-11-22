import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-white shadow-[0_0_0_1px_rgba(139,92,246,0.35),0_8px_24px_-8px_rgba(139,92,246,0.45)] hover:bg-primary-hover",
        accent:
          "bg-accent-muted text-[#04222e] hover:bg-accent",
        secondary:
          "bg-surface-raised text-foreground border border-border hover:border-primary/50 hover:bg-surface-hover",
        outline:
          "border border-border bg-transparent text-foreground hover:border-primary/60 hover:bg-primary/10",
        ghost: "hover:bg-surface-hover text-foreground-muted hover:text-foreground",
        destructive:
          "bg-danger/90 text-white hover:bg-danger shadow-[0_8px_24px_-8px_rgba(239,68,68,0.5)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type = "button", ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        type={type}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
