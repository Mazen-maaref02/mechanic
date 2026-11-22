import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, type CurrencyCode } from "@/lib/money";

export const metadata: Metadata = { title: "Reports" };

export default async function AdminReportsPage() {
  const supabase = await createClient();

  const [{ data: orders }, { data: items }, { data: topups }, { data: payments }] = await Promise.all([
    supabase.from("orders").select("total_amount, currency, status, created_at").order("created_at"),
    supabase.from("order_items").select("product_title, quantity, line_total, order_id").limit(5000),
    supabase.from("topup_requests").select("amount, fee_amount, currency, service, status"),
    supabase.from("payments").select("method, status, amount, currency"),
  ]);

  const completed = (orders ?? []).filter((o) => o.status === "completed");
  const revenueByCurrency: Record<string, { amount: number; count: number }> = {
    TND: { amount: 0, count: 0 },
    USD: { amount: 0, count: 0 },
  };
  for (const o of completed) {
    const entry = (revenueByCurrency[o.currency] ??= { amount: 0, count: 0 });
    entry.amount += o.total_amount;
    entry.count += 1;
  }

  // last 14 days of order volume (completed)
  const days = 13;
  const byDay: { label: string; count: number; amount: number; currency: CurrencyCode }[] = [];
  // start-of-today reference (built once, reused for bucketing)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayT = today.getTime();

  for (let i = days; i >= 0; i--) {
    const d = new Date(todayT);
    d.setDate(d.getDate() - i);
    byDay.push({ label: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }), count: 0, amount: 0, currency: "TND" });
  }
  for (const o of completed) {
    const created = new Date(o.created_at);
    created.setHours(0, 0, 0, 0);
    const idx = days - Math.round((todayT - created.getTime()) / 86_400_000);
    // only TND is plotted for the day series (mixed currencies stay in the totals)
    if (idx >= 0 && idx <= days && o.currency === "TND") {
      byDay[idx]!.count += 1;
      byDay[idx]!.amount += o.total_amount;
    }
  }
  const peakCount = Math.max(1, ...byDay.map((d) => d.count));

  // top products by quantity sold
  const products = new Map<string, { qty: number; revenue: number }>();
  for (const it of items ?? []) {
    const entry = products.get(it.product_title) ?? { qty: 0, revenue: 0 };
    entry.qty += it.quantity;
    entry.revenue += it.line_total;
    products.set(it.product_title, entry);
  }
  const topProducts = [...products.entries()].sort((a, b) => b[1].qty - a[1].qty).slice(0, 8);

  // top-up stats
  const topupDone = (topups ?? []).filter((t) => t.status === "completed");
  const topupByService = new Map<string, { count: number; amount: number }>();
  for (const t of topupDone) {
    const entry = topupByService.get(t.service) ?? { count: 0, amount: 0 };
    entry.count += 1;
    entry.amount += t.amount;
    topupByService.set(t.service, entry);
  }

  // payment method mix on verified payments
  const methodMix = new Map<string, number>();
  for (const p of payments ?? []) {
    if (p.status !== "verified") continue;
    methodMix.set(p.method, (methodMix.get(p.method) ?? 0) + 1);
  }

  return (
    <div>
      <header className="mb-5">
        <h1 className="font-display text-2xl font-bold tracking-tight">Reports</h1>
        <p className="mt-0.5 text-sm text-foreground-muted">Completed orders, top products, service &amp; method mix.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(["TND", "USD"] as CurrencyCode[]).map((cur) => (
          <div key={cur} className="rounded-xl border border-border bg-surface px-5 py-4">
            <p className="text-xs uppercase tracking-wider text-foreground-dim">Revenue {cur}</p>
            <p className="mt-1 font-display text-xl font-bold">{formatPrice(revenueByCurrency[cur]!.amount, cur)}</p>
            <p className="text-xs text-foreground-muted">{revenueByCurrency[cur]!.count} completed orders</p>
          </div>
        ))}
        <div className="rounded-xl border border-border bg-surface px-5 py-4">
          <p className="text-xs uppercase tracking-wider text-foreground-dim">Top-up fees</p>
          <p className="mt-1 font-display text-xl font-bold">{topupDone.length}</p>
          <p className="text-xs text-foreground-muted">completed credit requests</p>
        </div>
        <div className="rounded-xl border border-border bg-surface px-5 py-4">
          <p className="text-xs uppercase tracking-wider text-foreground-dim">Verified payments</p>
          <p className="mt-1 font-display text-xl font-bold">{(payments ?? []).filter((p) => p.status === "verified").length}</p>
          <p className="text-xs text-foreground-muted">across all methods</p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface" aria-label="Daily orders">
          <h2 className="border-b border-border px-5 py-3 font-display text-sm font-semibold">Orders — last 14 days (TND)</h2>
          <div className="flex h-44 items-end gap-1.5 px-5 py-4">
            {byDay.map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-1" title={`${d.label}: ${d.count} orders · ${formatPrice(d.amount, "TND")}`}>
                <div
                  className="w-full rounded-t bg-primary/70"
                  style={{ height: `${Math.max(2, (d.count / peakCount) * 100)}%` }}
                />
                <span className="text-[9px] text-foreground-dim">{d.label.slice(0, 2)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface" aria-label="Top products">
          <h2 className="border-b border-border px-5 py-3 font-display text-sm font-semibold">Top products by units sold</h2>
          <ul className="divide-y divide-border">
            {topProducts.map(([title, s]) => (
              <li key={title} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                <span className="truncate">{title}</span>
                <span className="tabular-nums text-foreground-muted">{s.qty}</span>
              </li>
            ))}
            {topProducts.length === 0 && (
              <li className="px-5 py-6 text-center text-sm text-foreground-muted">No sales yet.</li>
            )}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-surface" aria-label="Payment mix">
          <h2 className="border-b border-border px-5 py-3 font-display text-sm font-semibold">Payment method mix (verified)</h2>
          <ul className="divide-y divide-border">
            {[...methodMix.entries()].sort((a, b) => b[1] - a[1]).map(([method, count]) => (
              <li key={method} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                <span>{method === "d17_edinar" ? "D17 / e-Dinar" : method === "flouci" ? "Flouci" : method === "cash" ? "Cash" : method === "wafacash" ? "WafaCash" : method}</span>
                <span className="tabular-nums text-foreground-muted">{count}</span>
              </li>
            ))}
            {methodMix.size === 0 && (
              <li className="px-5 py-6 text-center text-sm text-foreground-muted">No verified payments yet.</li>
            )}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-surface" aria-label="Top-up services">
          <h2 className="border-b border-border px-5 py-3 font-display text-sm font-semibold">Top-up services (completed)</h2>
          <ul className="divide-y divide-border">
            {[...topupByService.entries()].map(([service, s]) => (
              <li key={service} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                <span>{service}</span>
                <span className="tabular-nums text-foreground-muted">{s.count}</span>
              </li>
            ))}
            {topupByService.size === 0 && (
              <li className="px-5 py-6 text-center text-sm text-foreground-muted">No completed top-ups yet.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
