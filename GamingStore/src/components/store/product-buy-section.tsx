"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShoppingCart, Zap, Clock, ShieldCheck, Minus, Plus } from "lucide-react";
import { useCart } from "@/components/store/cart-context";
import { formatPrice } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface ProductBuySectionData {
  productId: string;
  productName: string;
  deliveryType: "manual" | "automatic";
  variants: {
    id: string;
    label: string;
    priceTnd: number;
    priceUsd: number;
    stock: number | null;
    active: boolean;
  }[];
  usdToTnd: number;
}

export const ProductBuySection = ({ data }: { data: ProductBuySectionData }) => {
  const router = useRouter();
  const { add, currency } = useCart();
  const purchasable = data.variants.filter((v) => v.active);
  const [selectedId, setSelectedId] = React.useState<string>(purchasable[0]?.id ?? "");
  const [quantity, setQuantity] = React.useState(1);
  const [buying, setBuying] = React.useState(false);

  // Derive the selection, falling back to the first purchasable variant when
  // the stored selection no longer exists (data can change between server
  // render and hydration). Availability never blocks a purchase — the team
  // fulfills every order manually.
  const selected = purchasable.find((v) => v.id === selectedId) ?? purchasable[0] ?? null;

  // Sync state when the derived selection differs (official render-adjust
  // pattern — avoids an effect round-trip).
  const [lastSelectedId, setLastSelectedId] = React.useState<string>(selected?.id ?? "");
  if (selected && lastSelectedId !== selected.id) {
    setLastSelectedId(selected.id);
    setSelectedId(selected.id);
  }
  const unitPrice = selected ? (currency === "TND" ? selected.priceTnd : selected.priceUsd) : 0;
  const maxQty = 10;

  const approxOther = (() => {
    if (data.usdToTnd <= 0) return null;
    if (currency === "TND") {
      return formatPrice(Math.round(((unitPrice * quantity) / 1000 / data.usdToTnd) * 100), "USD");
    }
    return formatPrice(Math.round((((unitPrice * quantity) / 100) * data.usdToTnd) * 1000), "TND");
  })();

  const buyNow = async () => {
    if (!selected) return;
    add(selected.id, quantity);
    setBuying(true);
    router.push("/checkout");
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-5" aria-label="Purchase options">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">Select an option</h2>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold",
            data.deliveryType === "automatic"
              ? "bg-emerald-400/10 text-emerald-300"
              : "bg-sky-400/10 text-sky-300",
          )}
        >
          {data.deliveryType === "automatic" ? <Zap className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
          {data.deliveryType === "automatic" ? "Automatic delivery" : "Manual fulfillment"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Product options">
        {purchasable.map((v) => {
          return (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={v.id === selected?.id}
              onClick={() => setSelectedId(v.id)}
              className={cn(
                "flex flex-col rounded-lg border px-3 py-2 text-left transition-all",
                v.id === selected?.id
                  ? "border-primary bg-primary/15"
                  : "border-border hover:border-primary/50",
              )}
            >
              <span className="text-sm font-medium">{v.label}</span>
              <span className="text-xs text-foreground-muted">
                {formatPrice(currency === "TND" ? v.priceTnd : v.priceUsd, currency)}
              </span>
            </button>
          );
        })}
        {purchasable.length === 0 && (
          <p className="text-sm text-foreground-muted">This product is currently unavailable.</p>
        )}
      </div>

      <div className="mt-5 flex items-center gap-4">
        <div className="flex items-center gap-1 rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
            className="p-2 text-foreground-muted transition-colors hover:text-foreground disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-8 text-center text-sm font-semibold" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            disabled={quantity >= maxQty}
            aria-label="Increase quantity"
            className="p-2 text-foreground-muted transition-colors hover:text-foreground disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div>
          <p className="font-display text-xl font-bold" aria-label="Total price">
            {formatPrice(unitPrice * quantity, currency)}
          </p>
          {approxOther && (
            <p className="text-[11px] text-foreground-dim">{approxOther} est. (indicative rate)</p>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          disabled={!selected}
          onClick={() => selected && add(selected.id, quantity)}
          className="flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface-raised text-sm font-semibold transition-colors hover:border-primary/50 disabled:opacity-50"
        >
          <ShoppingCart className="h-4 w-4" />
          Add to cart
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          disabled={!selected || buying}
          onClick={buyNow}
          className={cn(
            "flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50",
            "bg-primary shadow-glow hover:bg-primary-hover",
          )}
        >
          <Zap className="h-4 w-4" />
          Buy now
        </motion.button>
      </div>

      <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-foreground-dim">
        <ShieldCheck className="h-3.5 w-3.5" />
        Payments are verified manually — you will submit a transaction reference after ordering.
      </p>
    </section>
  );
};
