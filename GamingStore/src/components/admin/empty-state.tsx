import type { LucideIcon } from "lucide-react";
import { PackageOpen } from "lucide-react";

export const EmptyState = ({
  title, text, icon: Icon = PackageOpen,
}: {
  title: string;
  text: string;
  icon?: LucideIcon;
}) => (
  <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
    <Icon className="h-8 w-8 text-foreground-dim" />
    <p className="mt-1 font-medium text-foreground">{title}</p>
    <p className="max-w-xs text-xs text-foreground-muted">{text}</p>
  </div>
);
