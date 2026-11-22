"use client";

import * as React from "react";
import { toast } from "sonner";
import type { CurrencyCode } from "@/lib/money";

export interface CartItem {
  variantId: string;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  currency: CurrencyCode;
  itemCount: number;
  add: (variantId: string, quantity?: number) => void;
  remove: (variantId: string) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  setCurrency: (currency: CurrencyCode) => void;
  clear: () => void;
}

const CartContext = React.createContext<CartContextValue | null>(null);

const STORAGE_KEY = "gs_cart_v2";
const CURRENCY_KEY = "gs_currency";

const readStorage = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [currency, setCurrencyState] = React.useState<CurrencyCode>("TND");
  // Hydration gate as STATE, not a ref: a ref flips true inside the same commit
  // where `items` is still the pre-hydration empty list, so the persistence
  // effects would write `[]` over the stored cart (and under StrictMode's
  // double effect pass they would erase it permanently). Waiting for state
  // means the effects only run after the hydrated values have committed.
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const stored = readStorage<CartItem[]>(STORAGE_KEY, []);
    if (Array.isArray(stored)) {
      const cleaned = stored.filter(
        (i) => typeof i?.variantId === "string" && Number.isInteger(i?.quantity) && i.quantity > 0 && i.quantity <= 10,
      );
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time localStorage hydration after mount; a lazy initializer cannot touch window during SSR and a render-time read would cause hydration mismatches.
      setItems(cleaned.slice(0, 20));
    }
    const storedCurrency = readStorage<CurrencyCode>(CURRENCY_KEY, "TND");
    if (storedCurrency === "USD" || storedCurrency === "TND") setCurrencyState(storedCurrency);
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [hydrated, items]);

  React.useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(CURRENCY_KEY, JSON.stringify(currency));
  }, [hydrated, currency]);

  const add = React.useCallback((variantId: string, quantity: number = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === variantId);
      if (existing) {
        if (existing.quantity + quantity > 10) {
          toast.info("Maximum quantity per product is 10");
          return prev;
        }
        return prev.map((i) => (i.variantId === variantId ? { ...i, quantity: i.quantity + quantity } : i));
      }
      if (prev.length >= 20) {
        toast.info("Cart is full — remove items first");
        return prev;
      }
      return [...prev, { variantId, quantity }];
    });
    toast.success("Added to cart");
  }, []);

  const remove = React.useCallback((variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }, []);

  const setQuantity = React.useCallback((variantId: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((i) => i.variantId !== variantId);
      return prev.map((i) => (i.variantId === variantId ? { ...i, quantity: Math.min(10, quantity) } : i));
    });
  }, []);

  const setCurrency = React.useCallback((currency: CurrencyCode) => setCurrencyState(currency), []);

  const clear = React.useCallback(() => setItems([]), []);

  const value = React.useMemo(
    () => ({
      items,
      currency,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      add,
      remove,
      setQuantity,
      setCurrency,
      clear,
    }),
    [items, currency, add, remove, setQuantity, setCurrency, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextValue => {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
