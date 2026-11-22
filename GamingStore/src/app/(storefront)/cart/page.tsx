import type { Metadata } from "next";
import { CartView } from "@/components/store/cart-view";

export const metadata: Metadata = {
  title: "Shopping cart",
};

export default function CartPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">Your cart</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Review your items, choose TND or USD, then check out.
        </p>
      </header>
      <CartView />
    </div>
  );
}
