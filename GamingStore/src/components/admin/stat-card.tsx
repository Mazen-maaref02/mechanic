import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  primary: "text-violet-300 bg-violet-500/10 border-violet-500/20",
  accent: "text-sky-300 bg-sky-500/10 border-sky-500/20",
  success: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
  neutral: "text-foreground-muted bg-surface-raised border-border",
} as const;

export const StatCard = ({
  label, value, sub, icon: Icon, tone,
}: {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  tone: keyof typeof TONES;
}) => (
  <div className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-primary/30">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wider text-foreground-dim">{label}</p>
        <p className="mt-1.5 truncate font-display text-xl font-bold">{value}</p>
        <p className="mt-1 truncate text-xs text-foreground-muted">{sub}</p>
      </div>
      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg border", TONES[tone])}>
        <Icon className="h-4.5 w-4.5" />
      </span>
    </div>
  </div>
);
