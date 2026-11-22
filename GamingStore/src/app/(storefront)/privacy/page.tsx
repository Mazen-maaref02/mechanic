import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy policy" };

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "Data we collect",
    body: [
      "Account: email, name (and optional phone) — required for order communication and verification contact.",
      "Orders: purchased items, amounts, currency, payment references and (if you attach one) payment proofs. We store the minimum needed to verify and deliver your order.",
      "Service usage: audit records of important actions (order placement, verification, administrative changes) to keep the store safe and provable.",
    ],
  },
  {
    title: "What we never collect",
    body: [
      "We never ask for, store or accept: wallet passwords, private keys, seed phrases or card CVC codes. If any message claims to be us and asks for these, it is an impersonation attempt — report it.",
    ],
  },
  {
    title: "How data is protected",
    body: [
      "Access control is enforced at the database level (row-level security): customers access only their own orders; staff actions are role-gated and audit-logged.",
      "Digital key inventory is encrypted at rest; plaintext keys reach only the buyer's own delivered-order page or staff fulfillment flows.",
      "Payment proofs live in a private storage bucket with signed, expiring access for the verification team only.",
    ],
  },
  {
    title: "Sharing and retention",
    body: [
      "We do not sell your data. Payment references may be shared with the corresponding payment provider only for dispute resolution.",
      "Posts are retained for the period of your account life; deletion requests via support are processed within 30 days, subject to accounting obligations.",
    ],
  },
  {
    title: "Your rights",
    body: [
      "You can access and correct your personal details from your profile. For export or deletion requests contact support with proof of identity.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">Privacy policy</h1>
      <p className="mt-2 text-sm text-foreground-dim">Last updated: November 2026</p>
      <div className="mt-8 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="font-display text-lg font-semibold">{s.title}</h2>
            {s.body.map((p, i) => (
              <p key={i} className="mt-3 text-sm leading-relaxed text-foreground-muted">{p}</p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
