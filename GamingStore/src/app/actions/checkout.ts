"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, clientIp } from "@/lib/security/rate-limit";
import { validateProofFile } from "@/lib/security/file-validation";
import {
  checkoutSchema, submitPaymentSchema,
} from "@/lib/validation/schemas";
import type { CurrencyCode } from "@/lib/money";
import {
  dispatchOrderNotice, type NoticeItem, type OrderNotice, type NoticeKind,
} from "@/lib/notify/order-notify";

/** Fetch the placed order + its items and shape a notification notice. */
async function buildOrderPlacedNotice(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orderId: string,
): Promise<OrderNotice | null> {
  const { data: order } = await supabase
    .from("orders")
    .select(
      "order_number, customer_name, customer_email, customer_phone, customer_note, payment_method, total_amount, currency",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return null;

  const { data: items } = await supabase
    .from("order_items")
    .select("product_title, variant_label, quantity, line_total")
    .eq("order_id", orderId)
    .order("created_at");

  const noticeItems: NoticeItem[] = (items ?? []).map((i) => ({
    title: i.product_title,
    label: i.variant_label,
    quantity: i.quantity,
    lineTotalMinor: i.line_total,
  }));

  return {
    kind: "order_placed" as NoticeKind,
    orderNumber: order.order_number,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    customerPhone: order.customer_phone ?? "",
    customerNote: order.customer_note ?? undefined,
    paymentMethod: order.payment_method ?? undefined,
    items: noticeItems,
    totalMinor: order.total_amount,
    currency: order.currency as CurrencyCode,
  };
}

export interface OrderPlacementResult {
  ok: boolean;
  error?: string;
  orderId?: string;
  orderNumber?: string;
}

export interface PaymentMethodConfig {
  enabled: boolean;
  display_name: string;
  receiver: string;
  instructions: string;
}

type PaymentConfigShape = Record<string, PaymentMethodConfig>;

/**
 * Places an order. The client sends only variantIds + quantities +
 * customer info; ALL prices/totals come from the database via the
 * place_order security-definer transaction. Stock limits are not
 * enforced (0008) — the team fulfills every order manually.
 */
export async function placeOrderAction(input: unknown): Promise<OrderPlacementResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid checkout data — refresh the page and review your cart." };
  }

  const h = await headers();
  if (!rateLimit(`checkout:${clientIp(h)}`, 8, 5 * 60_000).ok) {
    return { ok: false, error: "Too many attempts. Please wait a few minutes." };
  }

  // No account required — guests check out directly (migration 0006).
  // Authenticated users (admin/staff) keep their profile linkage automatically.
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("place_order", {
    p_currency: parsed.data.currency,
    p_items: parsed.data.items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
    p_coupon_code: parsed.data.couponCode?.trim() || "",
    p_name: parsed.data.customerName,
    p_email: parsed.data.customerEmail,
    p_phone: parsed.data.customerPhone?.trim() || "",
    p_note: parsed.data.customerNote?.trim() || "",
    p_delivery_email: parsed.data.deliveryEmail?.trim() || "",
    p_payment_method: parsed.data.paymentMethod,
  });

  if (error || !data) {
    const code = error?.message ?? "";
    if (code.includes("invalid_coupon")) return { ok: false, error: "That coupon is not valid." };
    if (code.includes("coupon_min_order")) return { ok: false, error: "Order does not meet the coupon minimum." };
    if (code.includes("variant_unavailable")) return { ok: false, error: "An item is no longer available." };
    if (code.includes("empty_cart")) return { ok: false, error: "Your cart is empty." };
    return { ok: false, error: "Could not place the order. Please try again." };
  }

  const result = data as {
    order_id: string;
    order_number: string;
    currency: string;
  };

  revalidatePath("/admin/orders");

  // Notifications: scheduled after the response so checkout is never blocked.
  const orderId = result.order_id;
  after(async () => {
    try {
      const notice = await buildOrderPlacedNotice(supabase, orderId);
      if (notice) await dispatchOrderNotice(notice);
    } catch (e) {
      console.warn("[notify] order notice skipped:", String(e).slice(0, 200));
    }
  });

  // redirect flag: client navigates to /payment/[orderId]
  return { ok: true, orderId: result.order_id, orderNumber: result.order_number };
}

/**
 * Payment-method configuration from store_settings (admin-editable).
 * Public instructions only — nothing secret is stored in this table.
 */
export async function getPaymentInstructions(): Promise<{
  methods: Record<string, PaymentMethodConfig>;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_settings")
    .select("value")
    .eq("key", "payment_methods")
    .maybeSingle();

  if (error || !data) {
    return { methods: {}, error: "Payment instructions are not configured yet." };
  }
  return { methods: (data.value ?? {}) as unknown as PaymentConfigShape, error: null };
}

export interface SubmitPaymentResult {
  ok: boolean;
  error?: string;
  proofStored?: boolean;
}

/** Magic-byte file validation shared by the upload path. */
const FILE_ERRORS: Record<string, string> = {
  TOO_LARGE: "The file is larger than 5MB.",
  BAD_TYPE: "Only JPG, PNG, WEBP images or PDF files are accepted.",
  EMPTY: "Attach a non-empty file.",
  MAGIC: "The file content does not match its type — it may be corrupted.",
};

/**
 * Customer submits payment reference (+ optional proof). This NEVER marks a
 * payment verified — only the admin dashboard does that.
 */
export async function submitPaymentAction(
  _prev: SubmitPaymentResult | null,
  formData: FormData,
): Promise<SubmitPaymentResult> {
  const h = await headers();
  if (!rateLimit(`submit-pay:${clientIp(h)}`, 10, 5 * 60_000).ok) {
    return { ok: false, error: "Too many attempts. Please wait a few minutes." };
  }

  const file = formData.get("proof");
  const proofFile = file instanceof File && file.size > 0 ? file : null;

  const parsed = submitPaymentSchema.safeParse({
    orderId: formData.get("orderId"),
    email: formData.get("email"),
    method: formData.get("method"),
    reference: formData.get("reference"),
    proofDataUrl: null, // real file handled below via validateProofFile
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payment details." };
  }
  void FILE_ERRORS;

  if (proofFile) {
    const validation = await validateProofFile(proofFile);
    if (!validation.ok) {
      return { ok: false, error: FILE_ERRORS[validation.error ?? "BAD_TYPE"] };
    }
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Guest order access (migration 0006): clients have no accounts, so the
  // caller must present the order id AND the exact email used at checkout.
  // The anonymous RLS path stays deny-all — this check runs with the
  // service-role client, server-side only.
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select(
      "id, profile_id, status, total_amount, currency, order_number, customer_name, customer_email, customer_phone",
    )
    .eq("id", parsed.data.orderId)
    .maybeSingle();

  const sessionAllows = Boolean(user && order && order.profile_id === user.id);
  if (
    !order ||
    (!sessionAllows &&
      parsed.data.email.trim().toLowerCase() !== order.customer_email.toLowerCase())
  ) {
    return { ok: false, error: "Order not found — check the email you used at checkout." };
  }
  if (order.status === "payment_verified" || order.status === "processing" || order.status === "completed") {
    return { ok: false, error: "This order was already verified — no further action needed." };
  }
  if (order.status !== "pending_payment" && order.status !== "payment_submitted") {
    return { ok: false, error: "This order can no longer accept payment submissions." };
  }

  // Look for an existing pending/submitted payment to update (prevents row spam)
  let paymentId: string | null = null;
  const { data: existing } = await admin
    .from("payments")
    .select("id, status")
    .eq("order_id", order.id)
    .in("status", ["pending", "submitted", "rejected"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const total = order.total_amount;
  const currency = order.currency as CurrencyCode;

  if (existing) {
    paymentId = existing.id;
    const { error: updErr } = await admin
      .from("payments")
      .update({
        method: parsed.data.method,
        amount: total,
        currency,
        reference: parsed.data.reference,
        status: "submitted",
        rejected_reason: null,
      })
      .eq("id", existing.id);
    if (updErr) return { ok: false, error: "Could not update the payment. Try again." };
  } else {
    const { data: inserted, error: insErr } = await admin
      .from("payments")
      .insert({
        order_id: order.id,
        method: parsed.data.method,
        amount: total,
        currency,
        reference: parsed.data.reference,
        status: "submitted",
      })
      .select("id")
      .single();
    if (insErr || !inserted) return { ok: false, error: "Could not register the payment. Try again." };
    paymentId = inserted.id;
  }

  let proofStored = false;
  if (proofFile && paymentId) {
    const ext = validationMimeExt(proofFile, parsed.data.method);
    const path = `${user?.id ?? "guest"}/${order.id}/${paymentId}-${Date.now()}.${ext}`;
    const bytes = new Uint8Array(await proofFile.arrayBuffer());
    const { error: uploadErr } = await admin.storage
      .from("payment-proofs")
      .upload(path, bytes, {
        contentType: proofFile.type,
        upsert: false,
      });

    if (uploadErr) {
      return { ok: false, error: "Payment saved, but the proof upload failed — you can upload it again." };
    }
    proofStored = true;

    const { error: proofErr } = await admin.from("payment_proofs").insert({
      payment_id: paymentId,
      storage_path: path,
      mime_type: proofFile.type,
      size_bytes: proofFile.size,
      uploaded_by: user?.id ?? null,
    });
    if (proofErr) {
      return { ok: false, error: "Payment saved, but the proof record failed — contact support." };
    }
  }

  // Update order status (only pending/submitted flow)
  await admin
    .from("orders")
    .update({ status: "payment_submitted" })
    .eq("id", order.id);

  revalidatePath(`/payment/${order.id}`);

  // Notification: scheduled after the response so submission is never blocked.
  const paymentNotice: OrderNotice = {
    kind: "payment_submitted",
    orderNumber: order.order_number,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    customerPhone: order.customer_phone ?? "",
    items: [],
    totalMinor: order.total_amount,
    currency: order.currency as CurrencyCode,
    paymentMethod: parsed.data.method,
    paymentReference: parsed.data.reference,
  };
  after(async () => {
    try {
      await dispatchOrderNotice(paymentNotice);
    } catch (e) {
      console.warn("[notify] payment notice skipped:", String(e).slice(0, 200));
    }
  });

  return { ok: true, proofStored };
}

function validationMimeExt(file: File, _method: string): string {
  void _method;
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "pdf";
}
