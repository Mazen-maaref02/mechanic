import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CircleCheck, Clock, CircleX, Package, ArrowRight, MessageCircle,
} from "lucide-react";
import { loadGuestOrder } from "@/lib/orders/guest-access";
import { formatPrice, type CurrencyCode } from "@/lib/money";
import { Badge } from "@/components/ui/badge";

// Payments are arranged OFF-SITE: the client only places the order; the team
// contacts them to confirm and collect payment (D17, Flouci, cash, WafaCash).
// This page is the order confirmation + status view.
export const metadata: Metadata = {
  title: "Order confirmation",
};

interface OrderPageProps {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ email?: string }>;
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "success" | "danger" | "warning" | "neutral" | "accent" }> = {
  pending_payment: { label: "Confirming with our team", variant: "warning" },
  payment_submitted: { label: "Confirming with our team", variant: "warning" },
  payment_verified: { label: "Confirmed — being prepared", variant: "accent" },
  processing: { label: "Being prepared", variant: "accent" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "neutral" },
  refunded: { label: "Refunded", variant: "neutral" },
  delivery_failed: { label: "Delivery issue", variant: "danger" },
};

const METHOD_LABELS: Record<string, string> = {
  d17_edinar: "D17 / e-Dinar",
  flouci: "Flouci",
  wafacash: "WafaCash",
  cash: "Cash",
  other: "Other",
};

export default async function OrderConfirmationPage({ params, searchParams }: OrderPageProps) {
  const { orderId } = await params;
  const { email } = await searchParams;

  // Access requires the exact email used at checkout (also works signed-in
  // via the account dashboard). Admins inspect orders via the dashboard.
  const bundle = await loadGuestOrder({ byOrderId: orderId }, email ?? "");
  if (!bundle) notFound();
  const view = bundle;

  const order = view.order;
  const items = view.items;

  const currency = order.currency as CurrencyCode;
  const statusBadge = STATUS_BADGE[order.status] ?? { label: order.status, variant: "neutral" as const };
  const trackQs = `number=${encodeURIComponent(order.order_number)}&email=${encodeURIComponent(order.customer_email)}`;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <Link href={`/track-order?${trackQs}`} className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground">
        ← Track this order
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Order {order.order_number}
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Placed {new Date(order.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
      </div>

      {/* Progress tracker */}
      <ol className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-2 text-xs text-foreground-muted" aria-label="Order progress">
        {[
          { icon: CircleCheck, label: "Order placed", done: true },
          { icon: MessageCircle, label: "Team confirms with you", done: order.status !== "pending_payment" && order.status !== "cancelled" },
          { icon: Package, label: "Delivered", done: order.status === "completed" || order.status === "processing" },
        ].map((step, i) => (
          <li key={step.label} className="flex items-center gap-2">
            <span className={step.done ? "text-emerald-400" : "text-foreground-dim"}>
              <step.icon className="h-4 w-4" />
            </span>
            <span className={step.done ? "text-foreground" : ""}>{step.label}</span>
            {i < 2 && <span className="ml-1 h-px w-8 bg-border" aria-hidden />}
          </li>
        ))}
      </ol>

      {/* Confirmation panel */}
      <section className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-5" aria-label="Next steps">
        <p className="inline-flex items-center gap-2 font-display text-base font-semibold text-emerald-200">
          <CircleCheck className="h-5 w-5 text-emerald-400" /> Your order is in — nothing to pay right now.
        </p>
        <p className="mt-2 text-sm text-foreground-muted">
          Our team will contact you shortly (phone / WhatsApp / email) to confirm your order and
          collect the payment
          {order.payment_method
            ? <> — you chose <strong className="text-foreground">{METHOD_LABELS[order.payment_method] ?? order.payment_method}</strong>, but you can switch to D17 / e-Dinar, Flouci, WafaCash or cash when we talk.</>
            : <> — D17 / e-Dinar, Flouci, WafaCash or cash, whatever is easiest for you.</>}
          Once confirmed and paid, we deliver your key or perform the top-up right away.
        </p>
        <p className="mt-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-2.5 text-xs text-amber-200">
          Save your order number <span className="font-mono">{order.order_number}</span> — track progress anytime with the order number + this email on the{" "}
          <Link href={`/track-order?${trackQs}`} className="font-semibold underline underline-offset-2">order tracking</Link> page.
        </p>
      </section>

      {/* Order summary */}
      <section className="mt-8 rounded-xl border border-border bg-surface p-6" aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="font-display text-base font-semibold">Order summary</h2>
        <ul className="mt-3 divide-y divide-border text-sm">
          {(items ?? []).map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-2">
              <span>
                <span className="block">{item.product_title}</span>
                <span className="text-[11px] text-foreground-dim">
                  {item.variant_label} × {item.quantity}
                  {item.delivery_status === "delivered" && " · delivered"}
                </span>
              </span>
              <span className="font-medium">{formatPrice(item.line_total, currency)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-foreground-muted">Subtotal</dt>
            <dd>{formatPrice(order.subtotal_amount, currency)}</dd>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-emerald-300">
              <dt>Discount</dt>
              <dd>-{formatPrice(order.discount_amount, currency)}</dd>
            </div>
          )}
          <div className="flex justify-between font-display text-base font-bold">
            <dt>Total ({currency})</dt>
            <dd>{formatPrice(order.total_amount, currency)}</dd>
          </div>
          {order.exchange_rate && (
            <p className="pt-1 text-[11px] text-foreground-dim">
              Rate snapshot at checkout: 1 USD = {Number(order.exchange_rate)} TND (kept with this order).
            </p>
          )}
        </dl>
      </section>

      {/* Status panel */}
      <section className="mt-8">
        {order.status === "cancelled" ? (
          <div className="rounded-xl border border-border bg-surface px-5 py-4 text-sm text-foreground-muted">
            <CircleX className="mr-2 inline h-4 w-4 text-red-300" />
            This order was cancelled. Contact support if you think this is a mistake.
          </div>
        ) : order.status === "completed" ? (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-4">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-emerald-300">
              <CircleCheck className="h-4 w-4" /> Paid and delivered.
            </p>
            <Link
              href={`/track-order?${trackQs}`}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-200 underline-offset-4 hover:underline"
            >
              View your key / delivery details <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface px-5 py-4 text-sm text-foreground-muted">
            <Clock className="mr-2 inline h-4 w-4 text-sky-300" />
            {order.status === "pending_payment"
              ? "Waiting for our team to contact you — usually within business hours."
              : "Confirmed — we are preparing your delivery."}{" "}
            Track it on{" "}
            <Link href={`/track-order?${trackQs}`} className="text-primary underline-offset-4 hover:underline">
              the tracking page
            </Link>.
          </div>
        )}
      </section>
    </div>
  );
}
