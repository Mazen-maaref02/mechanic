import type { Metadata } from "next";
import { CircleCheck, Clock, CircleX, Package, CreditCard, Search, ShieldCheck } from "lucide-react";
import { loadGuestOrder } from "@/lib/orders/guest-access";
import { formatPrice, type CurrencyCode } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { KeyReveal } from "@/components/store/key-reveal";

export const metadata: Metadata = {
  title: "Track order",
};

interface TrackOrderPageProps {
  searchParams: Promise<{ number?: string; email?: string }>;
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "accent" | "danger" | "neutral"> = {
  pending_payment: "warning",
  payment_submitted: "accent",
  payment_verified: "accent",
  processing: "accent",
  completed: "success",
  cancelled: "neutral",
  refunded: "neutral",
  delivery_failed: "danger",
};

export default async function TrackOrderPage({ searchParams }: TrackOrderPageProps) {
  const { number = "", email = "" } = await searchParams;
  const bundle = await loadGuestOrder({ byOrderNumber: number }, email);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">Track your order</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Enter the order number and the exact email you used at checkout.
        </p>
      </header>

      <form method="get" className="grid gap-3 rounded-xl border border-border bg-surface p-5 sm:grid-cols-[1fr_1fr_auto]">
        <label className="block">
          <span className="mb-1.5 block text-sm text-foreground-muted">Order number *</span>
          <input
            name="number"
            required
            defaultValue={number}
            placeholder="GS-260309-1A2B3C"
            className="w-full rounded-lg border border-border bg-background-raised px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-foreground-muted">Email used at checkout *</span>
          <input
            name="email"
            type="email"
            required
            defaultValue={email}
            placeholder="you@example.com"
            autoComplete="email"
            className="w-full rounded-lg border border-border bg-background-raised px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </label>
        <button
          type="submit"
          className="self-end flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          <Search className="h-4 w-4" /> Track
        </button>
      </form>

      {number && email && !bundle && (
        <div className="mt-8 rounded-xl border border-border bg-surface px-5 py-4 text-sm text-foreground-muted">
          <CircleX className="mr-2 inline h-4 w-4 text-red-300" />
          No order found for that combination — double-check the order number and use the exact
          email from checkout.
        </div>
      )}

      {bundle && (() => {
        const { order, items, payments, deliveries, keyByItem } = bundle;
        const currency = order.currency as CurrencyCode;
        const verified = payments.some((p) => p.status === "verified");
        return (
          <div className="mt-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-mono text-2xl font-bold tracking-tight sm:text-3xl">{order.order_number}</h2>
                <p className="mt-1 text-sm text-foreground-muted">
                  Placed {new Date(order.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[order.status] ?? "neutral"}>
                {order.status.replace(/_/g, " ")}
              </Badge>
            </div>

            <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs text-foreground-muted" aria-label="Order progress">
              {[
                { icon: CreditCard, label: "Order placed", done: true },
                { icon: Clock, label: "Reference submitted", done: payments.some((p) => p.status === "submitted" || p.status === "verified") },
                { icon: CircleCheck, label: "Payment verified", done: verified },
                { icon: Package, label: "Delivered", done: order.status === "completed" || order.status === "processing" },
              ].map((step, i) => (
                <li key={step.label} className="flex items-center gap-2">
                  <span className={step.done ? "text-emerald-400" : "text-foreground-dim"}>
                    <step.icon className="h-4 w-4" />
                  </span>
                  <span className={step.done ? "text-foreground" : ""}>{step.label}</span>
                  {i < 3 && <span className="ml-1 h-px w-8 bg-border" aria-hidden />}
                </li>
              ))}
            </ol>

            <section className="rounded-xl border border-border bg-surface" aria-label="Order items">
              <h2 className="border-b border-border px-5 py-3 font-display text-sm font-semibold">Items</h2>
              <ul className="divide-y divide-border">
                {items.map((item) => {
                  const key = keyByItem.get(item.id);
                  return (
                    <li key={item.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{item.product_title}</p>
                          <p className="text-xs text-foreground-muted">
                            {item.variant_label} × {item.quantity} · {item.delivery_status.replace(/_/g, " ")}
                          </p>
                        </div>
                        <span className="font-semibold">{formatPrice(item.line_total, currency)}</span>
                      </div>
                      {key && <KeyReveal value={key} />}
                      {!key && item.delivery_status === "delivered" && item.requires_key === false && (
                        <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-sky-400/10 px-2.5 py-1.5 text-xs text-sky-200">
                          <ShieldCheck className="h-3.5 w-3.5" /> Fulfilled manually — details were sent by our team.
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>

              {deliveries.length > 0 && (
                <div className="border-t border-border px-5 py-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-dim">Delivery log</h3>
                  <ul className="mt-2 space-y-1.5 text-xs text-foreground-muted">
                    {deliveries.map((d) => (
                      <li key={d.id} className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-surface-raised px-1.5 py-0.5 font-mono">{d.method}</span>
                        <span>{new Date(d.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <div className="rounded-xl border border-border bg-surface p-5 text-sm" aria-label="Payment summary">
              <h2 className="font-display text-sm font-semibold">Payment</h2>
              <dl className="mt-3 space-y-2">
                <div className="flex justify-between">
                  <dt className="text-foreground-muted">Total ({currency})</dt>
                  <dd className="font-semibold">{formatPrice(order.total_amount, currency)}</dd>
                </div>
                {payments.filter((p) => p.reference).length > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-foreground-muted">Last reference</dt>
                    <dd className="font-mono">{payments.filter((p) => p.reference).slice(-1)[0]?.reference}</dd>
                  </div>
                )}
              </dl>
              {order.status === "pending_payment" && (
                <a
                  href={`/payment/${order.id}?email=${encodeURIComponent(order.customer_email)}`}
                  className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
                >
                  <CreditCard className="h-4 w-4" /> Complete payment
                </a>
              )}
            </div>

            {order.admin_notes && (
              <div className="rounded-xl border border-border bg-surface p-5 text-sm">
                <h2 className="font-display text-sm font-semibold">Notes from the team</h2>
                <p className="mt-2 whitespace-pre-line text-xs text-foreground-muted">{order.admin_notes}</p>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
