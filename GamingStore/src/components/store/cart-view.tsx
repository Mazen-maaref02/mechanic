"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, Trash2, Minus, Plus, ArrowRight, Loader2, Info } from "lucide-react";
import { useCart } from "@/components/store/cart-context";
import { formatPrice, type CurrencyCode } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";

interface CartVariant {
  id: string;
  label: string;
  price_tnd: number;
  price_usd: number;
  slug: string;
  name: string;
  image_url: string | null;
  platform: string | null;
  delivery: "manual" | "automatic";
  stock: number | null;
}

export const CartView = () => {
  const router = useRouter();
  const { items, setQuantity, remove, currency, setCurrency, itemCount } = useCart();
  const [variants, setVariants] = React.useState<Record<string, CartVariant>>({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const supabase = createClient();
      const ids = items.map((i) => i.variantId);
      if (ids.length === 0) {
        setVariants({});
        setLoading(false);
        return;
      }
      const variantRes = await supabase
        .from("product_variants")
        .select("id, product_id, label, price_tnd, price_usd")
        .in("id", ids);
      if (cancelled) return;
      const productIds = [...new Set((variantRes.data ?? []).map((v) => v.product_id))];
      const { data: products } = await supabase
        .from("products")
        .select("id, name, image_url, platform, delivery_type, slug, status")
        .in("id", productIds);
      if (cancelled) return;
      const productMap = new Map<string, { name: string; image_url: string | null; platform: string | null; delivery_type: string; slug: string; status: string }>();
      for (const p of products ?? []) productMap.set(p.id, p);

      const map: Record<string, CartVariant> = {};
      for (const v of variantRes.data ?? []) {
        const product = productMap.get(v.product_id);
        if (!product || product.status !== "active") continue;
        map[v.id] = {
          id: v.id,
          label: v.label,
          price_tnd: v.price_tnd,
          price_usd: v.price_usd,
          slug: product.slug,
          name: product.name,
          image_url: product.image_url,
          platform: product.platform,
          delivery: (product.delivery_type === "automatic" ? "automatic" : "manual"),
          stock: null, // 0008: stock limits removed — always orderable
        };
      }
      setVariants(map);
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [items]);

  const price = (v: CartVariant, code: CurrencyCode): number =>
    code === "TND" ? v.price_tnd : v.price_usd;

  const lines = items
    .map((i) => ({ ...i, v: variants[i.variantId] }))
    .filter((l) => Boolean(l.v));

  const totalMinor = lines.reduce((sum, l) => sum + price(l.v!, currency) * l.quantity, 0);

  if (loading) {
    return (
      <div className="grid place-items-center py-24" aria-live="polite">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="mt-3 text-sm text-foreground-muted">Loading your cart…</p>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <div className="grid h-20 w-20 place-items-center rounded-2xl border border-border bg-surface">
          <ShoppingBag className="h-9 w-9 text-foreground-dim" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">Your cart is empty</h2>
          <p className="mt-1 text-sm text-foreground-muted">
            {itemCount > 0
              ? "Items you kept are no longer available in the store."
              : "Add gift cards, game keys or top-up services to get started."}
          </p>
        </div>
        <Link
          href="/shop"
          className="mt-2 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-white shadow-glow hover:bg-primary-hover"
        >
          Browse the shop <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div>
        <AnimatePresence initial={false}>
          {lines.map((line) => {
            return (
              <motion.div
                key={line.variantId}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -24 }}
                className="flex gap-4 border-b border-border py-5"
              >
                <Link href={`/product/${line.v!.slug}`} className="shrink-0">
                  <div className="h-20 w-20 overflow-hidden rounded-lg border border-border bg-surface-raised sm:h-24 sm:w-24">
                    {line.v!.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={line.v!.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="grid h-full w-full place-items-center font-display text-sm text-foreground-dim">
                        {line.v!.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/product/${line.v!.slug}`} className="font-medium hover:text-primary">
                        {line.v!.name}
                      </Link>
                      <p className="text-xs text-foreground-muted">{line.v!.label}</p>
                      {line.v!.platform && (
                        <p className="mt-0.5 text-xs text-foreground-dim">{line.v!.platform}</p>
                      )}
                    </div>
                    <p className="whitespace-nowrap font-semibold">
                      {formatPrice(price(line.v!, currency) * line.quantity, currency)}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1 rounded-lg border border-border">
                      <button
                        onClick={() => setQuantity(line.variantId, line.quantity - 1)}
                        className="p-2 text-foreground-muted hover:text-foreground"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-8 text-center text-sm">{line.quantity}</span>
                      <button
                        onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                        className="p-2 text-foreground-muted hover:text-foreground disabled:opacity-40"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-foreground-dim">
                        {formatPrice(price(line.v!, currency), currency)} / unit
                      </span>
                      <button
                        onClick={() => remove(line.variantId)}
                        aria-label={`Remove ${line.v!.name}`}
                        className="rounded-md p-2 text-foreground-dim hover:bg-red-500/10 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* summary */}
      <aside className="h-fit rounded-xl border border-border bg-surface p-6 lg:sticky lg:top-24">
        <h2 className="font-display text-base font-semibold">Order summary</h2>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-foreground-muted">Items</span>
            <span>{lines.reduce((s, l) => s + l.quantity, 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground-muted">Subtotal</span>
            <span className="font-semibold">{formatPrice(totalMinor, currency)}</span>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-xs text-foreground-dim">Pricing currency</p>
          <div className="mt-1 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Currency">
            {(["TND", "USD"] as CurrencyCode[]).map((code) => (
              <button
                key={code}
                role="radio"
                aria-checked={currency === code}
                onClick={() => setCurrency(code)}
                className={
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-all " +
                  (currency === code
                    ? "border-primary bg-primary/15 text-violet-200"
                    : "border-border text-foreground-muted hover:border-primary/40")
                }
              >
                {code}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => router.push("/checkout")}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-white shadow-glow hover:bg-primary-hover"
        >
          Continue to checkout <ArrowRight className="h-4 w-4" />
        </button>
        <p className="mt-3 inline-flex items-start gap-1.5 text-[11px] leading-relaxed text-foreground-dim">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Final totals, stock and any coupon are validated on our server at checkout —
          this page is an estimate.
        </p>
      </aside>
    </div>
  );
};
