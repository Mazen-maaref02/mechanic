"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2, Lock, Mail, ShieldCheck, Wallet } from "lucide-react";
import { useCart } from "@/components/store/cart-context";
import { checkoutSchema } from "@/lib/validation/schemas";
import { placeOrderAction } from "@/app/actions/checkout";
import { formatPrice, type CurrencyCode } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import { z } from "zod";

// Client-side validation covers contact fields only. `items` are injected at
// submit time from the cart context; quantities, prices and totals are always
// re-validated authoritatively inside placeOrderAction (never trust the client).
const contactSchema = checkoutSchema.omit({ items: true });
type ContactSchema = typeof contactSchema;

// Off-site payment methods the client picks from â€” the team collects the
// money directly (nothing is paid on the website).
const PAYMENT_CHOICES: { value: string; label: string; hint: string }[] = [
  { value: "d17_edinar", label: "D17 / e-Dinar", hint: "La Poste card transfer" },
  { value: "flouci", label: "Flouci", hint: "Instant app transfer" },
  { value: "wafacash", label: "WafaCash", hint: "Agent cash transfer" },
  { value: "cash", label: "Cash", hint: "In person / delivery" },
];

type ContactForm = z.infer<ContactSchema>;

interface CartVariantLite {
  id: string;
  label: string;
  price_tnd: number;
  price_usd: number;
  name: string;
  slug: string;
}

export const CheckoutView = ({
  defaultEmail,
  defaultName,
  defaultPhone,
}: {
  defaultEmail: string;
  defaultName: string;
  defaultPhone: string;
}) => {
  const router = useRouter();
  const { items, currency, setCurrency, clear } = useCart();
  const [variants, setVariants] = React.useState<Record<string, CartVariantLite>>({});
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      currency,
      customerEmail: defaultEmail,
      customerName: defaultName,
      customerPhone: defaultPhone,
      deliveryEmail: defaultEmail,
      paymentMethod: "d17_edinar",
      couponCode: null,
      customerNote: null,
    },
  });

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
      const [variantRes] = await Promise.all([
        supabase
          .from("product_variants")
          .select("id, product_id, label, price_tnd, price_usd")
          .in("id", ids),
      ]);
      if (cancelled) return;

      const productIds = [...new Set((variantRes.data ?? []).map((v) => v.product_id))];
      const { data: products } = productIds.length > 0
        ? await supabase.from("products").select("id, name, slug, status").in("id", productIds)
        : { data: null };
      if (cancelled) return;
      const productMap = new Map<string, { name: string; slug: string; status: string }>();
      for (const p of products ?? []) productMap.set(p.id, p);

      const map: Record<string, CartVariantLite> = {};
      for (const v of variantRes.data ?? []) {
        const product = productMap.get(v.product_id);
        if (!product || product.status !== "active") continue;
        map[v.id] = {
          id: v.id,
          label: v.label,
          price_tnd: v.price_tnd,
          price_usd: v.price_usd,
          name: product.name,
          slug: product.slug,
        };
      }
      setVariants(map);
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
    // re-run when cart contents change: the effect must also fire after the
    // cart-context hydrates from localStorage (mount happens pre-hydration).
  }, [items]);

  const lines = items
    .map((i) => ({ ...i, v: variants[i.variantId] }))
    .filter((l) => Boolean(l.v));

  const price = (v: CartVariantLite, code: CurrencyCode): number =>
    code === "TND" ? v.price_tnd : v.price_usd;

  const subtotal = lines.reduce((sum, l) => sum + price(l.v!, currency) * l.quantity, 0);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    if (lines.length === 0) {
      setServerError("Your cart is empty.");
      return;
    }
    setSubmitting(true);
    const result = await placeOrderAction({
      currency,
      couponCode: values.couponCode || null,
      customerName: values.customerName,
      customerEmail: values.customerEmail,
      customerPhone: values.customerPhone,
      deliveryEmail: values.deliveryEmail,
      paymentMethod: values.paymentMethod,
      customerNote: values.customerNote || null,
      items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
    });
    if (result.ok && result.orderId) {
      clear();
      // Payment page + tracking are reached via the order id plus the exact
      // contact email used at checkout.
      router.push(
        `/payment/${result.orderId}?email=${encodeURIComponent(values.customerEmail)}`,
      );
      return;
    }
    setSubmitting(false);
    setServerError(result.error ?? "Something went wrong.");
  });

  if (loading) {
    return (
      <div className="grid place-items-center py-24" aria-live="polite">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <h2 className="font-display text-lg font-semibold">Nothing to check out</h2>
        <p className="text-sm text-foreground-muted">Your cart is empty.</p>
        <Link href="/shop" className="mt-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover">
          Browse the shop
        </Link>
      </div>
    );
  }

  const fErr = (field: keyof ContactForm): string | undefined =>
    (errors as Record<string, { message?: string }>)[field]?.message;

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1fr_360px]" noValidate>
      <div className="space-y-6">
        <section className="rounded-xl border border-border bg-surface p-4 sm:p-6" aria-labelledby="contact-heading">
          <h2 id="contact-heading" className="font-display text-base font-semibold">Contact details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm text-foreground-muted">Full name *</span>
              <input
                {...register("customerName")}
                className="w-full rounded-lg border border-border bg-background-raised px-3 py-2.5 text-sm outline-none focus:border-primary"
                placeholder="Achraf Ben Ali"
                autoComplete="name"
              />
              {fErr("customerName") && <span className="mt-1 block text-xs text-red-300">{fErr("customerName")}</span>}
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-foreground-muted">Contact email *</span>
              <input
                {...register("customerEmail")}
                type="email"
                className="w-full rounded-lg border border-border bg-background-raised px-3 py-2.5 text-sm outline-none focus:border-primary"
                placeholder="you@example.com"
                autoComplete="email"
              />
              {fErr("customerEmail") && <span className="mt-1 block text-xs text-red-300">{fErr("customerEmail")}</span>}
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-foreground-muted">Phone (Tunisia format) *</span>
              <input
                {...register("customerPhone")}
                type="tel"
                className="w-full rounded-lg border border-border bg-background-raised px-3 py-2.5 text-sm outline-none focus:border-primary"
                placeholder="+216 20 123 456"
                autoComplete="tel"
              />
              {fErr("customerPhone") && <span className="mt-1 block text-xs text-red-300">{fErr("customerPhone")}</span>}
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-foreground-muted">Coupon code (optional)</span>
              <input
                {...register("couponCode")}
                className="w-full rounded-lg border border-border bg-background-raised px-3 py-2.5 text-sm uppercase outline-none focus:border-primary"
                placeholder="WELCOME10"
              />
              {fErr("couponCode") && <span className="mt-1 block text-xs text-red-300">{fErr("couponCode")}</span>}
            </label>
          </div>
          <p className="mt-3 text-xs text-foreground-dim">
            The order appears in{" "}
            <Link href="/account/orders" className="text-primary underline underline-offset-2">My account â†’ Orders</Link>{" "}
            and is trackable any time with the order number + this email.
          </p>
        </section>

        <section className="rounded-xl border border-border bg-surface p-4 sm:p-6" aria-labelledby="note-heading">
          <h2 id="note-heading" className="font-display text-base font-semibold">Order note (optional)</h2>
          <textarea
            {...register("customerNote")}
            className="mt-3 min-h-[80px] w-full rounded-lg border border-border bg-background-raised px-3 py-2.5 text-sm outline-none focus:border-primary"
            placeholder="Anything our team should know?"
            maxLength={500}
          />
        </section>

        {/* Client-selected payment method â€” the owner sees it on the order
            and collects the money off-site (nothing is paid here). */}
        <section className="rounded-xl border border-border bg-surface p-4 sm:p-6" aria-labelledby="payment-heading">
          <h2 id="payment-heading" className="flex items-center gap-2 font-display text-base font-semibold">
            <Wallet className="h-4 w-4 text-primary" /> How do you want to pay?
          </h2>
          <p className="mt-1 text-xs text-foreground-dim">
            Nothing is paid on the website â€” our team confirms with you and you pay
            with the method you choose.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Payment method">
            {PAYMENT_CHOICES.map((m) => (
              <label
                key={m.value}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background-raised px-3 py-3 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/10"
              >
                <input
                  {...register("paymentMethod")}
                  type="radio"
                  value={m.value}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{m.label}</span>
                  <span className="block text-[11px] text-foreground-dim">{m.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </section>
      </div>

      {/* summary */}
      <aside className="h-fit space-y-4 rounded-xl border border-border bg-surface p-4 sm:p-6 lg:sticky lg:top-24">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">Summary</h2>
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-border p-0.5" role="radiogroup" aria-label="Currency">
            {(["TND", "USD"] as CurrencyCode[]).map((code) => (
              <button
                key={code}
                type="button"
                role="radio"
                aria-checked={currency === code}
                onClick={() => setCurrency(code)}
                className={
                  "rounded-md px-2.5 py-1 text-xs font-semibold transition-all " +
                  (currency === code ? "bg-primary/20 text-violet-200" : "text-foreground-muted hover:text-foreground")
                }
              >
                {code}
              </button>
            ))}
          </div>
        </div>
        <ul className="divide-y divide-border text-sm">
          {lines.map((l) => (
            <li key={l.variantId} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="block truncate">{l.v!.name}</span>
                <span className="text-[11px] text-foreground-dim">
                  {l.v!.label} Ã— {l.quantity}
                </span>
              </span>
              <span className="whitespace-nowrap font-medium">
                {formatPrice(price(l.v!, currency) * l.quantity, currency)}
              </span>
            </li>
          ))}
        </ul>

        {/* Receiving email â€” the key/code is delivered here. It can be the
            account email or any other inbox the customer chooses. */}
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
              <Mail className="h-3.5 w-3.5 text-primary" /> Receiving email *
            </span>
            <input
              {...register("deliveryEmail")}
              type="email"
              className="w-full rounded-lg border border-border bg-background-raised px-3 py-2.5 text-sm outline-none focus:border-primary"
              placeholder="the email that receives your key"
              autoComplete="email"
            />
          </label>
          {fErr("deliveryEmail") && <span className="mt-1 block text-xs text-red-300">{fErr("deliveryEmail")}</span>}
          <p className="mt-1.5 text-[11px] text-foreground-dim">
            Your key / code will be sent to this email. It can be the same as your
            account email or another inbox.
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3 font-display text-base font-bold">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal, currency)}</span>
        </div>
        <p className="text-[11px] leading-relaxed text-foreground-dim">
          Prices and totals are re-calculated from the store database. If anything changed,
          the server will reject with a clear message.
        </p>
        {serverError && (
          <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {serverError}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-white shadow-glow hover:bg-primary-hover disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          Place order
        </button>
        <p className="inline-flex items-center gap-1.5 text-[11px] text-foreground-dim">
          <ShieldCheck className="h-3.5 w-3.5" />
          Nothing to pay now â€” our team contacts you to confirm and arrange payment.
          <Lock className="ml-0.5 h-3 w-3" />
        </p>
      </aside>
    </form>
  );
};
