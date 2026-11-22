import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground transition-colors",
        "placeholder:text-foreground-dim",
        "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "file:max-w-[240px] file:overflow-hidden file:text-xs file:text-ellipsis file:bg-surface-raised file:border-none file:text-foreground-muted",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
export { Input };

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[90px] w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground transition-colors",
        "placeholder:text-foreground-dim",
        "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
export { Textarea };
