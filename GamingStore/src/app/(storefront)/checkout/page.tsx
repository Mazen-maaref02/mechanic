import type { Metadata } from "next";
import { CheckoutView } from "@/components/store/checkout-view";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Checkout",
};

// Clients sign in before checkout — every order is registered to the
// customer's profile. Contact details are prefilled from the profile and
// stay editable.
export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  const p = user.profile;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">Checkout</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Step 1 — your details. After placing the order, our team contacts you to arrange payment.
        </p>
      </header>
      <CheckoutView
        defaultEmail={user.email}
        defaultName={p.full_name ?? ""}
        defaultPhone={p.phone ?? ""}
      />
    </div>
  );
}
