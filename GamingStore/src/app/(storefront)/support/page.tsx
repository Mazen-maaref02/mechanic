import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Instagram, Clock, MessageCircleQuestion } from "lucide-react";

export const metadata: Metadata = {
  title: "Support",
};

const CHANNELS = [
  {
    icon: Instagram,
    title: "Instagram DM",
    text: "@nexlevel.gaming — fastest response during opening hours.",
    href: "https://instagram.com/nexlevel.gaming",
  },
  {
    icon: Mail,
    title: "Email",
    text: "support@gamingstore.example — include your order number.",
    href: "mailto:support@gamingstore.example",
  },
  {
    icon: Clock,
    title: "Hours",
    text: "9:00 – 21:00 (GMT+1), every day. Verification typically < 1 hour in-hours.",
  },
];

export default function SupportPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">Support</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground-muted">
        Problems with a payment verification, a key that did not arrive, or a service
        request? Here is how to reach us fast — with the details ready, most issues are
        resolved in a single reply.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {CHANNELS.map((c) => (
          <div key={c.title} className="rounded-xl border border-border bg-surface p-5">
            <c.icon className="h-5 w-5 text-primary" />
            <h2 className="mt-3 font-display text-sm font-semibold">{c.title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-foreground-muted">{c.text}</p>
          </div>
        ))}
      </div>

      <section className="mt-10 rounded-xl border border-border bg-surface p-6">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold">
          <MessageCircleQuestion className="h-4 w-4 text-primary" /> Include in your message
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-foreground-muted">
          <li>· Your order number (GS-… format) or top-up request number (TR-…)</li>
          <li>· The transaction reference you submitted</li>
          <li>· Screenshot attachable in DM / email — but note we always verify on our side</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold">Self-service</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Link href="/faq" className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-primary/40">
            <p className="font-medium">FAQ</p>
            <p className="mt-1 text-xs text-foreground-muted">Delivery timing, currencies, refunds</p>
          </Link>
          <Link href="/track-order" className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-primary/40">
            <p className="font-medium">Order tracking</p>
            <p className="mt-1 text-xs text-foreground-muted">Statuses, keys and references</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
