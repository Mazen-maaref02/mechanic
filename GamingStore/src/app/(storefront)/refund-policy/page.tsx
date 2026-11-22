import type { Metadata } from "next";

export const metadata: Metadata = { title: "Refund policy" };

export default function RefundPolicyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">Refund policy</h1>
      <p className="mt-2 text-sm text-foreground-dim">Last updated: November 2026</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground-muted">
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">1. Nature of digital goods</h2>
          <p className="mt-3">
            Game keys and gift cards are delivered digitally and are generally
            non-refundable once delivered and working. This matches the nature of
            digital products.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">2. When we refund or replace</h2>
          <ul className="mt-3 space-y-2">
            <li>· The payment was verified but the item is out of stock — full refund, your choice of replacement when possible.</li>
            <li>· A delivered key is proven invalid on the compatible platform — replacement first; refund if no replacement stock exists.</li>
            <li>· Duplicate payment on the same order — the extra verified payment is refunded.</li>
            <li>· An automatic delivery fails on our side — refund or manual re-delivery.</li>
            <li>· A cancelled or unverified order — refund of any amount received.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">3. How to claim</h2>
          <p className="mt-3">
            Contact support within 48 hours of delivery with your order number and a
            short description (screenshots help but are not required). Claims are
            verified against order, payment and delivery records.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">4. Not covered</h2>
          <ul className="mt-3 space-y-2">
            <li>· Wrong region/platform purchased without checking compatibility.</li>
            <li>· Key already used on an account by mistake.</li>
            <li>· Marketplace-style reselling of delivered keys.</li>
          </ul>
        </section>

        <p className="rounded-xl border border-border bg-surface p-5">
          Refunds are returned via the original payment method (D17 / e-Dinar,
          Flouci, WafaCash or cash) within 3 business days of approval.
        </p>
      </div>
    </div>
  );
}
