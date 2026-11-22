import Link from "next/link";
import {
  CircleDollarSign, CircleCheck, Clock, KeyRound, TrendingUp, ShoppingCart,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, type CurrencyCode } from "@/lib/money";
import { StatCard } from "@/components/admin/stat-card";
import { OrdersMiniTable } from "@/components/admin/orders-mini-table";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    ordersRes,
    soldRes,
    reservedRes,
    availableRes,
    activeProductsRes,
    itemsRes,
  ] = await Promise.all([
    supabase.from("orders").select("id, total_amount, currency, status, order_number, created_at").order("created_at", { ascending: false }),
    supabase.from("digital_keys").select("id", { count: "exact" }).eq("status", "sold"),
    supabase.from("digital_keys").select("id", { count: "exact" }).eq("status", "reserved"),
    supabase.from("digital_keys").select("id", { count: "exact" }).eq("status", "available"),
    supabase.from("products").select("id", { count: "exact" }).eq("status", "active"),
    supabase.from("order_items").select("quantity"),
  ]);

  const orders = ordersRes.data ?? [];
  const completed = orders.filter((o) => o.status === "completed");
  const pending = orders.filter((o) => o.status === "pending_payment");
  const processing = orders.filter((o) =>
    ["payment_submitted", "payment_verified", "processing"].includes(o.status),
  );

  const revenueByCurrency: Record<string, { amount: number; count: number }> = {
    TND: { amount: 0, count: 0 },
    USD: { amount: 0, count: 0 },
  };
  for (const o of completed) {
    const cur = (revenueByCurrency[o.currency] ??= { amount: 0, count: 0 });
    cur.amount += o.total_amount;
    cur.count += 1;
  }

  const itemsSold = (itemsRes.data ?? []).reduce((sum, i) => sum + i.quantity, 0);

  const cards = [
    {
      label: "Revenue (TND)",
      value: formatPrice(revenueByCurrency.TND!.amount, "TND"),
      sub: `${revenueByCurrency.TND!.count} orders`,
      icon: CircleDollarSign,
      tone: "primary" as const,
    },
    {
      label: "Revenue (USD)",
      value: formatPrice(revenueByCurrency.USD!.amount, "USD"),
      sub: `${revenueByCurrency.USD!.count} orders`,
      icon: TrendingUp,
      tone: "accent" as const,
    },
    {
      label: "Completed orders",
      value: String(completed.length),
      sub: `${processing.length} in progress · ${pending.length} pending`,
      icon: CircleCheck,
      tone: "success" as const,
    },
    {
      label: "Items sold",
      value: String(itemsSold),
      sub: `${soldRes.count ?? 0} keys delivered`,
      icon: ShoppingCart,
      tone: "neutral" as const,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Store pulse: revenue, pending work and inventory health.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="font-display text-sm font-semibold">Latest orders</h2>
            <Link href="/admin/orders" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          <OrdersMiniTable
            orders={(orders ?? []).slice(0, 8).map((o) => ({
              id: o.id,
              order_number: o.order_number,
              status: o.status,
              total: formatPrice(o.total_amount, o.currency as CurrencyCode),
              created: new Date(o.created_at).toLocaleDateString("en-GB"),
            }))}
          />
        </section>

        <section className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold">
              <KeyRound className="h-4 w-4 text-primary" /> Key inventory
            </h2>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-surface-raised px-2 py-3">
                <p className="font-display text-lg font-bold text-foreground">{availableRes.count ?? 0}</p>
                <p className="text-[10px] uppercase tracking-wider text-foreground-dim">available</p>
              </div>
              <div className="rounded-lg bg-surface-raised px-2 py-3">
                <p className="font-display text-lg font-bold text-amber-300">{reservedRes.count ?? 0}</p>
                <p className="text-[10px] uppercase tracking-wider text-foreground-dim">reserved</p>
              </div>
              <div className="rounded-lg bg-surface-raised px-2 py-3">
                <p className="font-display text-lg font-bold text-emerald-300">{soldRes.count ?? 0}</p>
                <p className="text-[10px] uppercase tracking-wider text-foreground-dim">sold</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-foreground-muted">
              Active products: {activeProductsRes.count ?? 0}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold">
              <Clock className="h-4 w-4 text-amber-300" /> Needs attention
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-foreground-muted">
              <li>· Orders waiting for payment confirmation → <Link href="/admin/orders?status=pending_payment" className="text-primary hover:underline">orders</Link></li>
              <li>· Orders confirmed &amp; ready to fulfill → <Link href="/admin/orders?status=payment_verified" className="text-primary hover:underline">ready to deliver</Link></li>
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="font-display text-sm font-semibold">Currency policy</h2>
            <p className="mt-2 text-xs text-foreground-muted">
              TND & USD pricing and the exchange rate snapshot are managed in{" "}
              <Link href="/admin/settings" className="text-primary hover:underline">Settings</Link>.
              Orders keep the rate captured at checkout.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
