"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Package, Tags, ShoppingCart,
  Ticket, PieChart, Settings, ScrollText, LogOut, Menu, X, Store,
  ShieldCheck,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

const NAV: { href: string; label: string; icon: React.ElementType }[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/reports", label: "Reports", icon: PieChart },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/mfa", label: "MFA / Security", icon: ShieldCheck },
  { href: "/admin/audit-logs", label: "Audit logs", icon: ScrollText },
];

export const AdminSidebar = ({ userLabel, role }: { userLabel: string; role: string }) => {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  // Close the mobile menu after navigation (official render-adjust pattern).
  const [lastPath, setLastPath] = React.useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  const NavList = (
    <>
      <div className="flex items-center gap-2.5 px-3 py-4">
        <Link href="/admin" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary-muted shadow-glow">
            <Store className="h-5 w-5 text-white" />
          </span>
          <span>
            <span className="block font-display text-sm font-bold leading-tight">NexLevel</span>
            <span className="block text-[10px] uppercase tracking-wider text-foreground-dim">Admin panel</span>
          </span>
        </Link>
        <button
          className="ml-auto rounded-md p-1.5 text-foreground-dim lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <nav className="mt-2 flex-1 space-y-0.5 px-2" aria-label="Admin sections">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-primary/15 font-medium text-foreground"
                  : "text-foreground-muted hover:bg-surface hover:text-foreground",
              )}
            >
              <item.icon className={cn("h-4 w-4", active && "text-primary")} />
              {item.label}
              {active && (
                <motion.span
                  layoutId="admin-active"
                  className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary"
                />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <div className="px-2 text-xs text-foreground-dim">
          <p className="truncate font-medium text-foreground-muted">{userLabel}</p>
          <p className="capitalize">{role}</p>
        </div>
        <Link
          href="/"
          className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground-muted hover:bg-surface hover:text-foreground"
        >
          <Store className="h-4 w-4" /> View storefront
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      {/* mobile bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background-raised px-4 py-3 lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="Open admin menu" className="rounded-md p-2 text-foreground-muted hover:bg-surface">
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-display text-sm font-bold">Admin panel</span>
        <span className="w-9" />
      </div>

      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-background-raised lg:flex">
        {NavList}
      </aside>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} aria-hidden />
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-border bg-background-raised"
          >
            {NavList}
          </motion.aside>
        </div>
      )}
    </>
  );
};
