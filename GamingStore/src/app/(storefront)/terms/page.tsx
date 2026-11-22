import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of service" };

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. About this store",
    body: [
      "NexLevel Gaming Store sells digital gaming products (gift cards, activation keys) and online charging services (RedotPay, Binance-related, Rizon and other configurable services) to customers in Tunisia and eligible international markets.",
      "We operate with manual payment verification: every payment is reviewed by our team against our own accounts before delivery. We do not provide cryptocurrency custody, and we never take custody of card credentials or wallet secrets.",
    ],
  },
  {
    title: "2. Orders and delivery",
    body: [
      "An order becomes payable when you submit a transaction reference for one of the supported payment methods. Delivery happens only after the payment is verified by our team.",
      "Automatic products are delivered as encrypted inventory keys visible on your order page once verified. Manual products and services are fulfilled by our team and confirmed in your account.",
      "Prices and totals shown at checkout are computed from our database and locked per order. Product availability can change between browsing and verification; stock conflicts are resolved by refund or replacement.",
    ],
  },
  {
    title: "3. Payments",
    body: [
      "Supported methods: D17 / e-Dinar, Flouci, Cash and WafaCash, with instructions shown at payment time. Amounts must match the order total exactly.",
      "A screenshot is never sufficient proof. Duplicate payments for the same order are identified during verification and refunded.",
      "Orders not completed can be cancelled from the dashboard before verification.",
    ],
  },
  {
    title: "4. Accounts and conduct",
    body: [
      "You are responsible for your account credentials. One account per person; fraudulent use leads to account termination and audit-logged enforcement.",
      "Attempting to obtain keys without verified payment, abusing referral or coupon systems, or interfering with service operation is prohibited and may be reported to authorities.",
    ],
  },
  {
    title: "5. Liability",
    body: [
      "To the extent permitted by law, our liability is limited to the value of the affected order. We are not liable for platform-side account restrictions (e.g. game platform region rules) — always confirm region and platform compatibility before purchase.",
    ],
  },
  {
    title: "6. Changes",
    body: [
      "These terms may be updated; continued use of the store means you accept the current version. The effective version is always available on this page.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">Terms of service</h1>
      <p className="mt-2 text-sm text-foreground-dim">Last updated: November 2026</p>
      <div className="mt-8 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.title} aria-labelledby={`t-${s.title.slice(0, 6)}`}>
            <h2 id={`t-${s.title.slice(0, 6)}`} className="font-display text-lg font-semibold">{s.title}</h2>
            {s.body.map((p, i) => (
              <p key={i} className="mt-3 text-sm leading-relaxed text-foreground-muted">{p}</p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
