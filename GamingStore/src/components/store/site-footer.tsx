import Link from "next/link";
import { ShieldCheck, MessageCircle, FileText, Cpu } from "lucide-react";

const FOOTER_NAV = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "All products" },
      { href: "/gift-cards", label: "Gift cards" },
      { href: "/game-keys", label: "Game keys" },
      { href: "/top-up", label: "Top-up services" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/support", label: "Support" },
      { href: "/faq", label: "FAQ" },
      { href: "/track-order", label: "Track your order" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms of service" },
      { href: "/privacy", label: "Privacy policy" },
      { href: "/refund-policy", label: "Refund policy" },
    ],
  },
];

export const SiteFooter = () => (
  <footer className="border-t border-border bg-background-raised">
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary-muted shadow-glow">
              <ShieldCheck className="h-5 w-5 text-white" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">
              NEX<span className="text-primary">LEVEL</span>
            </span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-foreground-muted">
            Digital gaming store for Tunisia and beyond — gift cards, game keys and
            charging services, delivered fast and verified by real humans.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-foreground-dim">
            <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1">
              <Cpu className="h-3 w-3" /> Steam · Epic · Xbox · PSN
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1">
              <MessageCircle className="h-3 w-3" /> Instagram DM support
            </span>
          </div>
        </div>

        {FOOTER_NAV.map((section) => (
          <nav key={section.title} aria-label={section.title}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-dim">
              {section.title}
            </h3>
            <ul className="mt-3 space-y-2">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground-muted transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-foreground-dim sm:flex-row">
        <p>© {new Date().getFullYear()} NexLevel Gaming Store. All rights reserved.</p>
        <p className="inline-flex items-center gap-3">
          {/* hidden admin access — deliberately subtle, for the owner only */}
          <Link
            href="/login"
            aria-label="Admin access"
            title="Admin"
            className="text-foreground-dim/40 transition-opacity duration-200 hover:text-foreground-dim hover:opacity-100"
          >
            ·
          </Link>
          <span className="inline-flex items-center gap-1.5">
            <FileText className="h-3 w-3" />
            Digital products delivered by verified manual review.
          </span>
        </p>
      </div>
    </div>
  </footer>
);
