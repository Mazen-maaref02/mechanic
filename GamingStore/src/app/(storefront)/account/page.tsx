import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Package, Search, ShoppingCart } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, type CurrencyCode } from "@/lib/money";
import { SignOutButton } from "@/components/store/sign-out-button";

export const metadata: Metadata = {
  title: "My account",
};

const STATUS_VARIANT: Record<string, string> = {
  pending_payment: "bg-amber-500/15 text-amber-300",
  payment_submitted: "bg-sky-500/15 text-sky-300",
  payment_verified: "bg-sky-500/15 text-sky-300",
  processing: "bg-sky-500/15 text-sky-300",
  completed: "bg-emerald-500/15 text-emerald-300",
  cancelled: "bg-white/5 text-foreground-muted",
  refunded: "bg-white/5 text-foreground-muted",
  delivery_failed: "bg-red-500/15 text-red-300",
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, total_amount, currency, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">My account</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Signed in as <span className="font-medium text-foreground">{user.email}</span>
          </p>
        </div>
        <SignOutButton />
      </header>

      <section className="rounded-xl border border-border bg-surface" aria-label="Your orders">
        <h2 className="border-b border-border px-5 py-3 font-display text-sm font-semibold">
          Your orders
        </h2>
        {(orders ?? []).length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-foreground-muted">No orders yet.</p>
            <Link
              href="/shop"
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              <ShoppingCart className="h-4 w-4" /> Browse the shop
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {(orders ?? []).map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-mono text-sm font-bold">{o.order_number}</p>
                  <p className="text-xs text-foreground-muted">
                    {new Date(o.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatPrice(o.total_amount, o.currency as CurrencyCode)}</span>
                  <span className={"rounded-full px-2.5 py-1 text-xs font-semibold " + (STATUS_VARIANT[o.status] ?? "bg-white/5 text-foreground-muted")}>
                    {o.status.replace(/_/g, " ")}
                  </span>
                  <Link
                    href={`/track-order?number=${encodeURIComponent(o.order_number)}&email=${encodeURIComponent(user.email)}`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-foreground-muted transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    <Search className="h-3.5 w-3.5" /> Details
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-4 flex items-center gap-2 text-xs text-foreground-dim">
        <Package className="h-3.5 w-3.5" />
        Delivered keys and references appear on each order&apos;s tracking page.
      </p>
    </div>
  );
}
