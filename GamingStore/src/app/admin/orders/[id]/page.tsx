import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ReceiptText, Clock3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { formatPrice, type CurrencyCode } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { OrderActions } from "@/components/admin/order-actions";
import { OrderStatusControls } from "@/components/admin/order-status-controls";

export const metadata: Metadata = { title: "Order detail" };

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

const PAYMENT_LABELS: Record<string, string> = {
  d17_edinar: "D17 / e-Dinar",
  flouci: "Flouci",
  cash: "Cash",
  wafacash: "WafaCash",
  other: "Other",
};

interface AdminOrderDetailProps {
  params: Promise<{ id: string }>;
}

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailProps) {
  await requireAdmin();
  const { id } = await params;

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", id)
    .order("created_at");

  const itemIds = (items ?? []).map((i) => i.id);
  const [{ data: payments }, { data: deliveries }] = await Promise.all([
    supabase.from("payments").select("*").eq("order_id", id).order("created_at"),
    itemIds.length > 0
      ? supabase
          .from("deliveries")
          .select("id, order_item_id, key_id, method, content, created_at")
          .in("order_item_id", itemIds)
          .order("created_at")
      : Promise.resolve({ data: null }),
  ]);

  const currency = order.currency as CurrencyCode;
  const pendingItems = (items ?? [])
    .filter((i) => i.delivery_status !== "delivered")
    .map((i) => ({ id: i.id, label: `${i.product_title} — ${i.variant_label}` }));
  const allDelivered = (items ?? []).length > 0 && (items ?? []).every((i) => i.delivery_status === "delivered");
  const needsRetry = order.status === "delivery_failed" || (order.status === "payment_verified" || order.status === "processing") && pendingItems.length > 0;

  return (
    <div>
      <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All orders
      </Link>

      {/* ── header ─────────────────────────────────────────────── */}
      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{order.customer_name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-foreground-muted">
            <Badge variant={STATUS_VARIANT[order.status] ?? "neutral"}>{order.status.replace(/_/g, " ")}</Badge>
            {order.payment_method && (
              <Badge variant="accent">
                {order.status === "pending_payment" || order.status === "payment_submitted"
                  ? `wants to pay via ${PAYMENT_LABELS[order.payment_method] ?? order.payment_method}`
                  : `paid via ${PAYMENT_LABELS[order.payment_method] ?? order.payment_method}`}
              </Badge>
            )}
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />
              {new Date(order.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
            </span>
          </p>
          <p className="mt-1 font-mono text-xs text-foreground-dim">{order.order_number}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-xl font-bold">{formatPrice(order.total_amount, currency)}</p>
          {order.exchange_rate !== null && (
            <p className="text-xs text-foreground-dim">rate snapshot {order.exchange_rate.toFixed(4)} TND/USD</p>
          )}
        </div>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* left column: items + payments */}
        <div className="space-y-5">
          <section className="rounded-xl border border-border bg-surface" aria-label="Items">
            <h2 className="border-b border-border px-5 py-3 font-display text-sm font-semibold">Items</h2>
            <ul className="divide-y divide-border">
              {(items ?? []).map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium">{item.product_title}</p>
                    <p className="text-xs text-foreground-muted">
                      {item.variant_label} × {item.quantity}
                      {item.region ? ` · ${item.region}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{formatPrice(item.line_total, currency)}</span>
                    <Badge variant={item.delivery_status === "delivered" ? "success" : item.delivery_status === "failed" ? "danger" : "neutral"}>
                      {item.delivery_status}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-surface" aria-label="Payment">
            <h2 className="flex items-center gap-2 border-b border-border px-5 py-3 font-display text-sm font-semibold">
              <ReceiptText className="h-4 w-4 text-foreground-dim" /> Payment (arranged with the customer)
            </h2>
            <div className="px-5 py-4">
              <p className="text-sm text-foreground-muted">
                Payments are never collected on the site. Contact the customer (phone/WhatsApp/email
                below), agree on the method (D17, Flouci, cash, WafaCash…), and once the money is in
                hand mark the order as paid — then deliver the key or do the top-up in the
                Fulfillment section.
              </p>
              <div className="mt-4">
                <OrderStatusControls orderId={order.id} status={order.status} currentMethod={order.payment_method} />
              </div>
            </div>
            {(payments ?? []).length > 0 && (
              <ul className="divide-y divide-border border-t border-border">
                {(payments ?? []).map((p) => (
                  <li key={p.id} className="space-y-2 px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{PAYMENT_LABELS[p.method] ?? p.method}</p>
                        <p className="font-mono text-xs text-foreground-muted">ref: {p.reference ?? "—"}</p>
                        <p className="text-xs text-foreground-dim">
                          {new Date(p.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                          {p.verified_at ? ` · verified ${new Date(p.verified_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">{formatPrice(p.amount, p.currency as CurrencyCode)}</span>
                        <Badge variant={p.status === "verified" ? "success" : p.status === "rejected" ? "danger" : p.status === "submitted" ? "accent" : "neutral"}>
                          {p.status}
                        </Badge>
                      </div>
                    </div>
                    {p.rejected_reason && (
                      <p className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-300">Reason: {p.rejected_reason}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {order.customer_note && (
            <section className="rounded-xl border border-border bg-surface px-5 py-4" aria-label="Customer note">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground-dim">Customer note</p>
              <p className="mt-1 text-sm">{order.customer_note}</p>
            </section>
          )}
        </div>

        {/* right column: fulfillment + customer */}
        <div className="space-y-5">
          <section className="rounded-xl border border-border bg-surface px-5 py-4" aria-label="Customer">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground-dim">Customer</h2>
            <dl className="mt-2 space-y-1.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-foreground-muted">Name</dt>
                <dd className="text-right font-medium">{order.customer_name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-foreground-muted">Email</dt>
                <dd className="truncate text-right">{order.customer_email}</dd>
              </div>
              {order.customer_phone && (
                <div className="flex justify-between gap-3">
                  <dt className="text-foreground-muted">Phone</dt>
                  <dd className="text-right">{order.customer_phone}</dd>
                </div>
              )}
            </dl>
          </section>

          <OrderActions orderId={order.id} needsRetry={needsRetry} pendingItems={pendingItems} allDelivered={allDelivered} />

          {deliveries && deliveries.length > 0 && (
            <section className="rounded-xl border border-border bg-surface px-5 py-4" aria-label="Delivery log">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground-dim">Delivery log</h2>
              <ul className="mt-2 space-y-1.5 text-xs text-foreground-muted">
                {deliveries.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-surface-raised px-1.5 py-0.5 font-mono">{d.method}</span>
                    <span className="truncate">{d.content ?? "automatic delivery"}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
