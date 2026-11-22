"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingCart, Zap, Clock } from "lucide-react";
import { useCart } from "@/components/store/cart-context";
import { formatPrice, type CurrencyCode } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  platform: string | null;
  region: string | null;
  deliveryType: "manual" | "automatic";
  categoryName: string;
  variants: { id: string; label: string; priceTnd: number; priceUsd: number; stock: number | null; active: boolean }[];
}

/** TND per 1 USD — passed down from the server (admin-controlled). */
export const ProductCard = ({ product, index = 0, usdToTnd = 0 }: { product: ProductCardData; index?: number; usdToTnd?: number }) => {
  const { add, currency } = useCart();
  const purchasable = product.variants.filter((v) => v.active);
  const [selectedId, setSelectedId] = React.useState<string | null>(
    purchasable[0]?.id ?? null,
  );
  const selected = purchasable.find((v) => v.id === selectedId) ?? null;
  const price = selected ? (currency === "TND" ? selected.priceTnd : selected.priceUsd) : 0;

  /** Indicative secondary-currency display, minor units. Never authoritative. */
  const approxOtherMinor = (minor: number, code: CurrencyCode): number => {
    if (usdToTnd <= 0) return 0;
    if (code === "TND") {
      const usdMinor = Math.round((minor / 1000) / usdToTnd * 100);
      return usdMinor;
    }
    const tndMinor = Math.round((minor / 100) * usdToTnd * 1000);
    return tndMinor;
  };
  const approxLabel = `${formatPrice(approxOtherMinor(price, currency), currency === "TND" ? "USD" : "TND")} est.`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-primary/40 hover:shadow-[0_16px_48px_-20px_rgba(139,92,246,0.35)]"
    >
      <Link href={`/product/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-surface-raised">
        {product.imageUrl ? (
          <motion.img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-surface-raised to-[#191b2e]">
            <span className="font-display text-2xl font-bold text-foreground-dim/50">
              {product.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-1.5">
          {product.deliveryType === "automatic" && (
            <span className="inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[10px] font-semibold text-emerald-300 backdrop-blur">
              <Zap className="h-3 w-3" /> Instant
            </span>
          )}
          {product.deliveryType === "manual" && (
            <span className="inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[10px] font-semibold text-sky-300 backdrop-blur">
              <Clock className="h-3 w-3" /> Same day
            </span>
          )}
        </div>
        {product.platform && (
          <span className="absolute right-3 top-3 rounded-md bg-black/70 px-2 py-1 text-[10px] font-medium text-foreground/90 backdrop-blur">
            {product.platform}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-foreground-dim">
            {product.categoryName}
            {product.region ? ` · ${product.region}` : ""}
          </p>
          <Link href={`/product/${product.slug}`}>
            <h3 className="mt-0.5 font-display text-[15px] font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
              {product.name}
            </h3>
          </Link>
        </div>

        {purchasable.length > 1 && (
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`${product.name} options`}>
            {purchasable.slice(0, 4).map((v) => {
              return (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={v.id === selectedId}
                  onClick={() => setSelectedId(v.id)}
                  className={cn(
                    "rounded-md border px-2 py-1 text-xs transition-all",
                    v.id === selectedId
                      ? "border-primary bg-primary/15 text-violet-200"
                      : "border-border text-foreground-muted hover:border-primary/50 hover:text-foreground",
                  )}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <div>
            <p className="font-display text-lg font-bold tracking-tight" aria-label={`Price ${formatPrice(price, currency)}`}>
              {formatPrice(price, currency)}
            </p>
            {usdToTnd > 0 && price > 0 && (
              <p className="text-[10px] text-foreground-dim">{approxLabel}</p>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => selected && add(selected.id)}
            aria-label={`Add ${product.name} — ${selected?.label ?? ""} to cart`}
            className={cn(
              "grid h-10 w-10 place-items-center rounded-lg transition-all",
              "bg-primary text-white shadow-glow hover:bg-primary-hover",
            )}
          >
            <ShoppingCart className="h-[1.1rem] w-[1.1rem]" />
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
};
