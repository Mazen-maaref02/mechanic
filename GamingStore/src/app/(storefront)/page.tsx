import Link from "next/link";
import {
  ArrowRight, Gift, Gamepad2, Wallet, Zap, ShieldCheck, Headset,
  CircleCheck, RefreshCw,
} from "lucide-react";
import { ProductCard, type ProductCardData } from "@/components/store/product-card";
import { getFeatured, getCategories, getCatalog } from "@/lib/catalog/queries";
import { getUsdToTndRate } from "@/lib/catalog/exchange";

const PAYMENT_METHODS = ["D17 / e-Dinar", "Flouci", "Cash", "WafaCash"] as const;

export default async function HomePage() {
  const [featured, categories, catalog, usdToTnd] = await Promise.all([
    getFeatured(6),
    getCategories(),
    getCatalog(),
    getUsdToTndRate(),
  ]);

  const toCard = (p: Awaited<ReturnType<typeof getCatalog>>[number]): ProductCardData => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    imageUrl: p.imageUrl,
    platform: p.platform,
    region: p.region,
    deliveryType: p.deliveryType,
    categoryName: p.categoryName,
    variants: p.variants.map((v) => ({
      id: v.id,
      label: v.label,
      priceTnd: v.priceTnd,
      priceUsd: v.priceUsd,
      stock: v.stock,
      active: v.active,
    })),
  });

  return (
    <div className="flex flex-col">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 55% at 30% 20%, rgba(139,92,246,0.16) 0%, transparent 60%), radial-gradient(45% 45% at 78% 15%, rgba(56,189,248,0.10) 0%, transparent 65%)",
          }}
        />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-violet-200">
              <Zap className="h-3.5 w-3.5" />
              Instant digital delivery · Tunisia & worldwide
            </p>
            <h1 className="mt-5 font-display text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Game keys, gift cards
              <br />
              <span className="text-gradient-glow">balanced for your wallet.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-foreground-muted sm:text-lg">
              Steam & Epic keys, wallet gift cards, and RedotPay / Binance / Rizon
              charging services — pay in TND or USD with D17 / e-Dinar,
              Flouci, Cash or WafaCash. Every order verified by a real person.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8">
              <Link
                href="/shop"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-glow transition-all hover:bg-primary-hover sm:h-12 sm:px-6"
              >
                Browse the shop
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/top-up"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 sm:h-12 sm:px-6"
              >
                <Wallet className="h-4 w-4" />
                Top-up services
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-foreground-muted sm:mt-8">
              <span className="inline-flex items-center gap-1.5">
                <CircleCheck className="h-4 w-4 text-emerald-400" /> Manual payment verification
              </span>
              <span className="inline-flex items-center gap-1.5">
                <RefreshCw className="h-4 w-4 text-sky-400" /> TND & USD pricing
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-violet-400" /> Encrypted key inventory
              </span>
            </div>
          </div>

          {/* stat / payment panel */}
          <aside className="relative hidden lg:block" aria-hidden>
            <div className="absolute right-0 top-4 w-full max-w-sm rounded-2xl border border-border bg-surface/80 p-6 shadow-card backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground-dim">
                Accepted here
              </p>
              <ul className="mt-4 space-y-3">
                {PAYMENT_METHODS.map((m) => (
                  <li
                    key={m}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface-raised px-4 py-3"
                  >
                    <span className="text-sm font-medium">{m}</span>
                    <CircleCheck className="h-4 w-4 text-emerald-400" />
                  </li>
                ))}
              </ul>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  { label: "Gift cards", icon: Gift },
                  { label: "Game keys", icon: Gamepad2 },
                ].map(({ label, icon: Icon }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-border bg-surface-raised px-4 py-3"
                  >
                    <Icon className="h-4 w-4 text-primary" />
                    <p className="mt-2 text-xs text-foreground-muted">{label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-foreground-dim">
                Currencies: TND (millimes) & USD (cents). An admin-controlled
                exchange rate is shown as an estimate — your order keeps its own rate.
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* ── Featured ─────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Featured products
            </h2>
            <p className="mt-1 text-sm text-foreground-muted">
              Hand-picked by our team — restocked regularly.
            </p>
          </div>
          <Link
            href="/shop"
            className="hidden shrink-0 items-center gap-1.5 text-sm font-medium text-primary hover:underline sm:inline-flex"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {featured.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p, i) => (
              <ProductCard key={p.id} product={toCard(p)} index={i} usdToTnd={usdToTnd} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-dashed border-border bg-surface/50 px-8 py-14 text-center">
            <p className="font-medium text-foreground">The catalog is being set up</p>
            <p className="mt-1 text-sm text-foreground-muted">
              Products added in the admin dashboard will appear here automatically.
            </p>
          </div>
        )}
      </section>

      {/* ── Categories ───────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6 sm:pb-14">
        <div className="grid gap-4 sm:grid-cols-3">
          {categories.map((c) => {
            const icon = c.slug === "gift-cards" ? Gift : c.slug === "game-keys" ? Gamepad2 : Wallet;
            const Icon = icon;
            const count = catalog.filter((p) => p.categorySlug === c.slug).length;
            return (
              <Link
                key={c.id}
                href={`/${c.slug}`}
                className="rounded-xl border border-border bg-surface p-5 transition-all hover:border-primary/40 hover:shadow-glow"
              >
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="text-xs text-foreground-dim">{count} products</span>
                </div>
                <h3 className="mt-3 font-display text-base font-semibold">{c.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-foreground-muted">
                  {c.description}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section className="border-y border-border bg-background-raised">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            How your order works
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Pick & pay",
                text: "Add keys or cards to your cart in TND or USD, then pay with D17 / e-Dinar, Flouci, Cash or WafaCash and submit your transaction reference.",
              },
              {
                step: "02",
                title: "Verified by humans",
                text: "We check your payment on our side — usually within minutes during business hours. Screenshots alone are never enough.",
              },
              {
                step: "03",
                title: "Keys delivered",
                text: "Automatic products receive encrypted inventory keys instantly after verification; services are fulfilled by our team and confirmed on your tracking page.",
              },
            ].map((s) => (
              <div key={s.step} className="relative rounded-xl border border-border bg-surface p-6">
                <span className="font-display text-sm font-bold text-primary">{s.step}</span>
                <h3 className="mt-2 font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Support CTA ──────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-surface to-sky-400/5 px-5 py-8 text-center sm:px-12 sm:py-10">
          <Headset className="h-7 w-7 text-primary" />
          <h2 className="font-display text-xl font-bold sm:text-2xl">Need a hand?</h2>
          <p className="max-w-md text-sm text-foreground-muted">
            Questions about a key, a payment or a service? Our team answers in
            business hours — your orders live in your account, trackable any time.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/support"
              className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover"
            >
              Contact support
            </Link>
            <Link
              href="/faq"
              className="inline-flex h-10 items-center rounded-lg border border-border px-5 text-sm font-semibold text-foreground hover:border-primary/50"
            >
              Read FAQ
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
