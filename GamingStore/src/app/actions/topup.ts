"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createAdminClient, randomToken } from "@/lib/supabase/admin";
import { rateLimit, clientIp } from "@/lib/security/rate-limit";
import { topupRequestSchema, forbiddenFieldPattern } from "@/lib/validation/schemas";
import type { ActionState } from "@/app/actions/auth";

export interface TopupResult extends ActionState {
  requestNumber?: string;
}

/**
 * Service request (RedotPay / Binance / Rizon top-up) — guest flow (0007).
 * No account required: contact details are stored on the request row.
 * Collects ONLY the service identifier — the schema rejects anything that
 * smells like a credential, and we never ask for keys/passwords/seeds.
 */
export async function requestTopupAction(_prev: TopupResult | ActionState, formData: FormData): Promise<TopupResult> {
  const raw = {
    customerName: formData.get("customerName"),
    customerEmail: formData.get("customerEmail"),
    customerPhone: formData.get("customerPhone"),
    service: formData.get("service"),
    recipientRef: formData.get("recipientRef"),
    amount: Number(formData.get("amount")),
    currency: formData.get("currency"),
    paymentMethod: formData.get("paymentMethod"),
    reference: formData.get("reference") || null,
  };

  // Policy: never accept credential-shaped fields on service requests.
  const forbidden = Array.from(formData.keys()).some((k) => forbiddenFieldPattern.test(k));
  if (forbidden) {
    return { error: "This request must not contain passwords, keys or secrets." };
  }

  const parsed = topupRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid request details." };
  }

  const h = await headers();
  if (!rateLimit(`topup:${clientIp(h)}`, 5, 10 * 60_000).ok) {
    return { error: "Too many requests. Please wait and try again." };
  }

  const serviceFeePercent: Record<string, number> = {
    redotpay: 4,
    binance: 5,
    rizon: 3,
    other: 6,
  };

  // Enforce admin-configurable min/max per service + currency (fallback to defaults)
  const admin = createAdminClient();
  const { data: limitsSetting } = await admin
    .from("store_settings")
    .select("value")
    .eq("key", "service_limits")
    .maybeSingle();
  const limits = (limitsSetting?.value ?? {}) as Record<
    string,
    Record<string, { min_amount: number; max_amount: number }>
  >;
  const limitFor = limits[parsed.data.service]?.[parsed.data.currency] ??
    { min_amount: 20000, max_amount: 3_000_000 };
  if (parsed.data.amount < limitFor.min_amount || parsed.data.amount > limitFor.max_amount) {
    return {
      error: `Amount must be between ${(limitFor.min_amount / 1000).toFixed(3)} and ${(limitFor.max_amount / 1000).toFixed(3)} ${parsed.data.currency}.`,
    };
  }

  const fee = Math.round((parsed.data.amount * (serviceFeePercent[parsed.data.service] ?? 5)) / 100);
  const total = parsed.data.amount + fee;
  const requestNumber = `TR-${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${randomToken(3).toUpperCase()}`;

  const { error } = await admin.from("topup_requests").insert({
    order_number: requestNumber,
    profile_id: null,
    customer_name: parsed.data.customerName,
    contact_email: parsed.data.customerEmail,
    contact_phone: parsed.data.customerPhone,
    service: parsed.data.service,
    recipient_ref: parsed.data.recipientRef,
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    fee_amount: fee,
    total_amount: total,
    payment_method: parsed.data.paymentMethod,
    reference: parsed.data.reference ?? null,
    status: "submitted",
  });

  if (error) return { error: "Could not submit the request. Try again." };

  await admin.rpc("audit", {
    p_action: "topup.requested",
    p_entity_type: "topup_request",
    p_entity_id: undefined,
    p_metadata: { service: parsed.data.service, currency: parsed.data.currency, total, guest: true },
  });

  revalidatePath("/admin/topups");
  return { success: `Request ${requestNumber} submitted.`, requestNumber };
}
