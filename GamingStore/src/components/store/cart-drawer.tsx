"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, Trash2, Minus, Plus, ArrowRight, Loader2 } from "lucide-react";
import { useCart } from "@/components/store/cart-context";
import { formatPrice, type CurrencyCode } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface DrawerVariant {
  id: string;
  label: string;
  price_tnd: number;
  price_usd: number;
  imageUrl: string | null;
  productTitle: string;
}

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Slide-over cart. Variant data is fetched live from the catalog (public RLS).
 * Totals shown here are indicative only — checkout always re-validates
 * prices/totals server-side.
 */
export const CartDrawer = ({ open, onOpenChange }: CartDrawerProps) => {
  const router = useRouter();
  const { items, setQuantity, remove, currency, clear } = useCart();
  const [variants, setVariants] = React.useState<Record<string, DrawerVariant>>({});
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const fetchVariants = async () => {
      const ids = items.map((i) => i.variantId);
      if (ids.length === 0) {
        setVariants({});
        return;
      }
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("product_variants")
        .select("id, product_id, label, price_tnd, price_usd")
        .in("id", ids);

      if (cancelled) return;
      if (error || !data) {
        setLoading(false);
        return;
      }

      const productIds = [...new Set(data.map((row) => row.product_id))];
      const { data: products } = await supabase
        .from("products")
        .select("id, name, image_url")
        .in("id", productIds);

      if (cancelled) return;
      const productMap = new Map<string, { name: string; image_url: string | null }>();
      for (const p of products ?? []) productMap.set(p.id, p);

      const map: Record<string, DrawerVariant> = {};
      for (const row of data) {
        const product = productMap.get(row.product_id);
        map[row.id] = {
          id: row.id,
          label: row.label,
          price_tnd: row.price_tnd,
          price_usd: row.price_usd,
          imageUrl: product?.image_url ?? null,
          productTitle: product?.name ?? "Product",
        };
      }
      setVariants(map);
      setLoading(false);
    };
    void fetchVariants();
    return () => { cancelled = true; };
  }, [open, items]);

  const price = (v: DrawerVariant, code: CurrencyCode): number =>
    code === "TND" ? v.price_tnd : v.price_usd;

  const lines = items
    .map((i) => ({ ...i, v: variants[i.variantId] }))
    .filter((i) => Boolean(i.v));

  const totalMinor = lines.reduce(
    (sum, l) => sum + price(l.v!, currency) * l.quantity,
    0,
  );

  const goCheckout = () => {
    if (busy) return;
    setBusy(true);
    onOpenChange(false);
    router.push("/checkout");
    setTimeout(() => setBusy(false), 600);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]"
          onClick={() => onOpenChange(false)}
          aria-hidden
        >
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className={cn(
              "absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-border bg-background-raised shadow-2xl",
            )}
            aria-label="Shopping cart"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Your cart
              </h2>
              <button
                onClick={() => onOpenChange(false)}
                aria-label="Close cart"
                className="rounded-md p-1.5 text-foreground-dim hover:bg-surface-hover hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-2xl border border-border bg-surface">
                  <ShoppingBag className="h-7 w-7 text-foreground-dim" />
                </div>
                <p className="font-medium text-foreground">
                  {loading ? "Loading cart…" : items.length > 0 ? "Some items are no longer available" : "Your cart is empty"}
                </p>
                <p className="text-sm text-foreground-muted">
                  {items.length > 0 ? "Unavailable items were removed from pricing." : "Browse the shop and add something you like."}
                </p>
                <button
                  onClick={() => { onOpenChange(false); router.push("/shop"); }}
                  className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
                >
                  Browse shop
                </button>
              </div>
            ) : (
              <>
                <ul className="flex-1 divide-y divide-border overflow-y-auto px-5">
                  {lines.map((line) => (
                    <motion.li
                      key={line.variantId}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 24 }}
                      className="flex gap-3 py-4"
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-raised">
                        {line.v!.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={line.v!.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-xs text-foreground-dim">IMG</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{line.v!.productTitle}</p>
                        <p className="text-xs text-foreground-muted">{line.v!.label}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-1 rounded-lg border border-border">
                            <button
                              onClick={() => setQuantity(line.variantId, line.quantity - 1)}
                              className="p-1.5 text-foreground-muted hover:text-foreground"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="min-w-6 text-center text-sm">{line.quantity}</span>
                            <button
                              onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                              className="p-1.5 text-foreground-muted hover:text-foreground"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">
                              {formatPrice(price(line.v!, currency) * line.quantity, currency)}
                            </span>
                            <button
                              onClick={() => remove(line.variantId)}
                              aria-label={`Remove ${line.v!.productTitle}`}
                              className="rounded-md p-1.5 text-foreground-dim hover:bg-red-500/10 hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </ul>
                <div className="space-y-3 border-t border-border px-5 py-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground-muted">Total ({currency})</span>
                    <span className="font-display text-lg font-bold" aria-live="polite">
                      {formatPrice(totalMinor, currency)}
                    </span>
                  </div>
                  <p className="text-xs text-foreground-dim">
                    Totals and stock are re-validated from the store database at checkout.
                  </p>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={goCheckout}
                    disabled={busy || loading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-white shadow-glow transition-colors hover:bg-primary-hover disabled:opacity-60"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    Go to checkout
                  </motion.button>
                  <button
                    onClick={clear}
                    className="w-full rounded-lg px-3 py-1.5 text-xs text-foreground-dim hover:text-red-300"
                  >
                    Clear cart
                  </button>
                </div>
              </>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
