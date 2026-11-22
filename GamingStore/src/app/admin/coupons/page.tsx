import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { type CurrencyCode } from "@/lib/money";
import { CouponManager } from "@/components/admin/coupon-manager";

export const metadata: Metadata = { title: "Coupons" };

export default async function AdminCouponsPage() {
  const supabase = await createClient();
  const { data: coupons } = await supabase
    .from("coupons")
    .select("*")
    .order("is_active", { ascending: false })
    .order("code");

  const list = coupons ?? [];

  return (
    <div>
      <header className="mb-5">
        <h1 className="font-display text-2xl font-bold tracking-tight">Coupons</h1>
        <p className="mt-0.5 text-sm text-foreground-muted">
          Percentage coupons apply per-currency logic in <code className="font-mono">place_order</code>; fixed coupons
          are validated in the coupon&apos;s own currency.
        </p>
      </header>
      <CouponManager
        coupons={list.map((c) => ({
          id: c.id,
          code: c.code,
          type: c.type as "percentage" | "fixed",
          value: c.value,
          currency: (c.currency ?? null) as CurrencyCode | null,
          minOrderAmount: c.min_order_amount,
          maxUses: c.max_uses,
          usedCount: c.used_count,
          isActive: c.is_active,
        }))}
      />
    </div>
  );
}
