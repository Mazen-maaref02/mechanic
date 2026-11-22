"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search, ShoppingCart, Menu, X, Package, ShieldCheck, LogIn,
} from "lucide-react";
import { useCart } from "@/components/store/cart-context";
import { CartDrawer } from "@/components/store/cart-drawer";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/gift-cards", label: "Gift Cards" },
  { href: "/game-keys", label: "Game Keys" },
  { href: "/top-up", label: "Top-Up" },
];

export const SiteHeader = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { itemCount } = useCart();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Reset menus when navigation happens (official "adjust state during render" pattern).
  const [lastPath, setLastPath] = React.useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMobileOpen(false);
    setDrawerOpen(false);
  }

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/shop?q=${encodeURIComponent(q)}`);
  };

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 border-b transition-all duration-300",
          scrolled
            ? "border-border/80 bg-background/85 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl"
            : "border-transparent bg-background",
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          {/* logo */}
          <Link href="/" className="group flex shrink-0 items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary-muted shadow-[0_0_18px_rgba(139,92,246,0.45)]">
              <ShieldCheck className="h-5 w-5 text-white" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">
              NEX<span className="text-primary transition-colors group-hover:text-accent">LEVEL</span>
            </span>
          </Link>

          {/* desktop nav */}
          <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Primary">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active ? "text-foreground" : "text-foreground-muted hover:text-foreground",
                  )}
                >
                  {item.label}
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-x-2 -bottom-[calc(1rem+1px)] h-0.5 rounded-full bg-gradient-to-r from-primary to-accent"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* search (desktop) */}
          <form onSubmit={submitSearch} className="ml-auto hidden md:block" role="search">
            <label className="relative w-64 flex items-center rounded-lg border border-border bg-surface focus-within:border-primary/60 transition-colors xl:w-72">
              <Search className="ml-3 h-4 w-4 text-foreground-dim" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search games, cards…"
                aria-label="Search products"
                className="w-full bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-foreground-dim"
              />
            </label>
          </form>

          <div className={cn("flex items-center gap-1.5", "ml-auto md:ml-2")}>
            {/* cart */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => setDrawerOpen(true)}
              aria-label={`Open cart (${itemCount} items)`}
              className="relative grid h-10 w-10 place-items-center rounded-lg border border-border bg-surface text-foreground-muted transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <ShoppingCart className="h-[1.1rem] w-[1.1rem]" />
              <AnimatePresence>
                {itemCount > 0 && (
                  <motion.span
                    key="badge"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white shadow-glow"
                  >
                    {itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {/* order tracking (replaces sign-in — store is guest-only now) */}
            <Link
              href="/track-order"
              aria-label="Track your order"
              className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-surface text-foreground-muted transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <Package className="h-[1.1rem] w-[1.1rem]" />
            </Link>

            {/* optional sign-in — buying never requires an account */}
            <Link
              href="/login"
              className="hidden h-10 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm text-foreground-muted transition-colors hover:border-primary/50 hover:text-foreground sm:inline-flex"
            >
              <LogIn className="h-4 w-4" /> Sign in
            </Link>

            {/* mobile menu toggle */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-surface text-foreground-muted hover:text-foreground lg:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* mobile panel */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden border-t border-border lg:hidden"
            >
              <div className="space-y-1 px-4 py-3">
                <form onSubmit={submitSearch} className="mb-2 md:hidden" role="search">
                  <label className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3">
                    <Search className="h-4 w-4 text-foreground-dim" />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search games, cards…"
                      aria-label="Search products"
                      className="w-full bg-transparent py-2.5 text-sm outline-none"
                    />
                  </label>
                </form>
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "block rounded-lg px-3 py-2.5 text-sm font-medium",
                      pathname.startsWith(item.href)
                        ? "bg-primary/10 text-foreground"
                        : "text-foreground-muted hover:bg-surface hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="my-2 h-px bg-border" />
                <Link href="/track-order" className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-white">
                  <Package className="h-4 w-4" /> Track your order
                </Link>
                <Link href="/login" className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-foreground-muted">
                  <LogIn className="h-4 w-4" /> Sign in
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <CartDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
};
