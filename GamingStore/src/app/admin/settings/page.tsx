import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SettingsForms } from "@/components/admin/settings-forms";
import type { PaymentMethodConfig } from "@/app/actions/checkout";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("store_settings").select("key, value, updated_at");
  const map = new Map((rows ?? []).map((r) => [r.key, { value: r.value, updated_at: r.updated_at }]));

  const methods = (map.get("payment_methods")?.value ?? null) as unknown as Record<string, PaymentMethodConfig> | null;
  const limits = map.get("service_limits")?.value ?? null;
  const methodsUpdatedAt = map.get("payment_methods")?.updated_at ?? null;

  const { data: latestRate } = await supabase
    .from("exchange_rates")
    .select("base, quote, rate, created_at")
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div>
      <header className="mb-5">
        <h1 className="font-display text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-sm text-foreground-muted">
          Store-wide configuration. Payment instruction changes take effect on the customer&apos;s next payment form
          load; nothing is retro-edited on submitted orders.
        </p>
      </header>

      <SettingsForms
        methods={methods ?? {}}
        methodsUpdatedAt={methodsUpdatedAt}
        limits={limits}
        latestRate={
          latestRate
            ? {
                base: latestRate.base,
                quote: latestRate.quote,
                rate: Number(latestRate.rate),
                createdAt: latestRate.created_at,
              }
            : null
        }
      />
    </div>
  );
}
