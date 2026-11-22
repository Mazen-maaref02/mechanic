import type { Metadata } from "next";
import { CircleHelp } from "lucide-react";

export const metadata: Metadata = {
  title: "FAQ",
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "How fast is delivery?",
    a: "Automatic products (game keys, wallet cards from inventory): delivered to your order page right after payment verification. Manual products and top-up services: typically under 1 hour during opening hours (9:00–21:00 GMT+1).",
  },
  {
    q: "How do payments get verified?",
    a: "You pay via D17/e-Dinar, Flouci, Cash or WafaCash, then submit the transaction reference (and optionally a screenshot) on your payment page. Our team checks the transfer against our own accounts. We never rely on screenshots alone.",
  },
  {
    q: "Can I pay in USD or TND?",
    a: "Both. Choose your currency during checkout — the order keeps that currency and an exchange-rate snapshot. Changing it later is impossible, and admin-set rates update future orders, not past ones.",
  },
  {
    q: "Where do I find my purchased key?",
    a: "Use the order tracking page with your order number and the email from checkout. Keys appear on delivered items with a reveal and copy button. They are stored encrypted and shown only with the verified email match.",
  },
  {
    q: "What if my key doesn't work?",
    a: "First verify the region/platform matches your account. If a key fails, contact support with your order number — we re-check the inventory record and replace proven-faulty keys.",
  },
  {
    q: "Do you ask for my wallet password or seed phrase?",
    a: "Never. For top-up services we only need your account ID. Anyone asking for passwords, private keys or seed phrases is impersonating us.",
  },
  {
    q: "Can I get a refund?",
    a: "Digital goods are generally non-refundable, but we handle failed deliveries and proven-faulty keys with replacement or refund — see the refund policy page.",
  },
  {
    q: "I made a duplicate payment by mistake.",
    a: "We check every order for duplicate submissions; extra verified payments on one order are refunded. Contact support with both references.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">Frequently asked questions</h1>
      <p className="mt-2 text-sm text-foreground-muted">
        Everything about payments, delivery and keys. Still stuck?{" "}
        <a href="/support" className="text-primary hover:underline">Contact support</a>.
      </p>

      <div className="mt-8 space-y-3">
        {FAQS.map((f) => (
          <details
            key={f.q}
            className="group rounded-xl border border-border bg-surface px-5 py-4 transition-colors open:border-primary/30"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium">
              <span className="inline-flex items-center gap-2.5">
                <CircleHelp className="h-4 w-4 shrink-0 text-primary" />
                {f.q}
              </span>
              <span className="text-foreground-dim transition-transform group-open:rotate-45" aria-hidden>
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-foreground-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
