"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, randomToken } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/session";
import { rateLimit } from "@/lib/security/rate-limit";
import { encryptKeyContent, decryptKeyContent } from "@/lib/security/key-cipher";
import { sendKeysToCustomerEmail, type DeliveredKeyLine } from "@/lib/notify/order-notify";
import type { Database } from "@/lib/database.types";
import {
  manualDeliverySchema,
  keysImportSchema,
  productSchema,
  variantSchema,
  categorySchema,
  couponSchema,
  exchangeRateSchema,
  paymentMethodSchema,
} from "@/lib/validation/schemas";

export interface ActionResult {
  ok: boolean;
  error?: string;
  info?: string;
}

/**
 * Guest-first delivery: after automatic key allocation succeeds, email the
 * decrypted key codes to the customer's email (order notified via after()).
 * Never blocks the admin action; skips silently if email is not configured.
 */
function queueKeyDeliveryEmail(orderId: string): void {
  after(async () => {
    try {
      const admin = createAdminClient();
      const [{ data: order }, { data: items }] = await Promise.all([
        admin
          .from("orders")
          .select("order_number, customer_name, customer_email, delivery_email, status")
          .eq("id", orderId)
          .maybeSingle(),
        admin
          .from("order_items")
          .select("id, product_title, variant_label, quantity, delivery_status")
          .eq("order_id", orderId)
          .order("created_at"),
      ]);
      if (!order || !items || items.length === 0) return;

      const { data: deliveries } = await admin
        .from("deliveries")
        .select("order_item_id, key_id, method, content")
        .in("order_item_id", items.map((i) => i.id));

      const deliveryByItem = new Map<string, { key_id: string | null; method: string; content: string | null }>();
      for (const d of deliveries ?? []) deliveryByItem.set(d.order_item_id, d);

      const lines: DeliveredKeyLine[] = [];
      for (const item of items) {
        if (item.delivery_status !== "delivered") continue;
        const delivery = deliveryByItem.get(item.id);
        if (!delivery) continue;

        if (delivery.method === "manual" && delivery.content) {
          lines.push({
            title: item.product_title,
            label: item.variant_label,
            quantity: item.quantity,
            keys: [delivery.content],
          });
        } else if (delivery.key_id) {
          const { data: key } = await admin
            .from("digital_keys")
            .select("key_ciphertext")
            .eq("id", delivery.key_id)
            .maybeSingle();
          if (!key) continue;
          try {
            lines.push({
              title: item.product_title,
              label: item.variant_label,
              quantity: item.quantity,
              keys: [decryptKeyContent(key.key_ciphertext)],
            });
          } catch {
            // decryption failure â€” do not email garbage; the tracking page shows the fallback message
          }
        }
      }

      if (lines.length === 0) return;
      // Keys go to the receiving email chosen at checkout (delivery_email);
      // fall back to the contact email when unset.
      const sent = await sendKeysToCustomerEmail({
        orderNumber: order.order_number,
        customerName: order.customer_name,
        customerEmail: order.delivery_email || order.customer_email,
        lines,
      });
      if (!sent) console.warn("[notify] key email skipped (not configured or refused)");
    } catch (e) {
      console.warn("[notify] key delivery email failed:", String(e).slice(0, 200));
    }
  });
}

/** Shared prelude for admin actions: role check + rate limit. */
const guard = async (action: string) => {
  const user = await requireAdmin();
  const limit = rateLimit(`admin:${user.id}:${action}`, 60, 60_000);
  if (!limit.ok) return { user, limited: true as const };
  return { user, limited: false as const };
};

// â”€â”€ Payment verification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function verifyPaymentAction(
  paymentId: string,
  approve: boolean,
  reason?: string | null,
): Promise<ActionResult> {
  const g = await guard("verify-payment");
  if (g.limited) return { ok: false, error: "Rate limited â€” slow down." };

  const supabase = await createClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("id, order_id, status, amount, currency, method")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment) return { ok: false, error: "Payment not found." };

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, status")
    .eq("id", payment.order_id)
    .maybeSingle();
  if (!order) return { ok: false, error: "Order not found." };

  if (approve) {
    if (payment.status === "verified") return { ok: false, error: "Already verified." };
    if (payment.status === "rejected") return { ok: false, error: "Rejected payment â€” customer must resubmit." };

    const { error: updErr } = await supabase
      .from("payments")
      .update({ status: "verified", verified_by: g.user.id, verified_at: new Date().toISOString() })
      .eq("id", paymentId);
    // partial unique index (verified, per order) makes double-verification impossible
    if (updErr) {
      return { ok: false, error: "Could not mark verified â€” another payment may already be verified for this order." };
    }

    await supabase.rpc("audit", {
      p_action: "payment.verified",
      p_entity_type: "payment",
      p_entity_id: paymentId,
      p_metadata: { order_id: order.id, amount: payment.amount, currency: payment.currency, method: payment.method },
    });

    // move the order forward, then attempt automatic key allocation
    await supabase.from("orders").update({ status: "payment_verified" }).eq("id", order.id);

    const { data: allocated, error: allocErr } = await supabase.rpc("allocate_keys_for_order", {
      p_order_id: order.id,
    });

    if (allocErr) {
      const shortage = allocErr.message.includes("insufficient_inventory");
      await supabase.from("orders").update({ status: shortage ? "delivery_failed" : "processing" }).eq("id", order.id);
      await supabase.rpc("audit", {
        p_action: shortage ? "delivery.insufficient_inventory" : "delivery.error",
        p_entity_type: "order",
        p_entity_id: order.id,
        p_metadata: { message: allocErr.message },
      });

      return {
        ok: true,
        info: shortage
          ? "Payment verified â€” but key inventory is insufficient. Import keys, then press 'Retry delivery'."
          : "Payment verified â€” order moved to processing for manual fulfillment.",
      };
    }

    await supabase.rpc("audit", {
      p_action: "delivery.automatic",
      p_entity_type: "order",
      p_entity_id: order.id,
      p_metadata: { keys_allocated: allocated ?? 0 },
    });

    // email the key codes to the customer (guest-first store)
    if ((allocated ?? 0) > 0) queueKeyDeliveryEmail(order.id);

    revalidatePath("/admin/orders");
    return { ok: true, info: `Verified & delivered ${allocated ?? 0} key(s). Order completed.` };
  }

  // rejection
  if (["verified", "refunded"].includes(payment.status)) {
    return { ok: false, error: "This payment cannot be rejected in its current state." };
  }
  const { error: rejErr } = await supabase
    .from("payments")
    .update({ status: "rejected", rejected_reason: reason?.slice(0, 300) ?? null })
    .eq("id", paymentId);
  if (rejErr) return { ok: false, error: "Could not record the rejection." };

  await supabase
    .from("orders")
    .update({ status: "pending_payment" })
    .eq("id", order.id);

  await supabase.rpc("audit", {
    p_action: "payment.rejected",
    p_entity_type: "payment",
    p_entity_id: paymentId,
    p_metadata: { order_id: order.id, reason: reason ?? null },
  });
  return { ok: true, info: "Payment rejected â€” customer can resubmit a new reference." };
}

// â”€â”€ Order lifecycle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function retryAutomaticDeliveryAction(orderId: string): Promise<ActionResult> {
  const g = await guard("retry-delivery");
  if (g.limited) return { ok: false, error: "Rate limited." };

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "Order not found." };

  if (order.status !== "delivery_failed" && order.status !== "payment_verified" && order.status !== "processing") {
    return { ok: false, error: "Delivery can only be retried for verified orders." };
  }

  // allow the definer function to run (it itself requires verified/processing)
  if (order.status === "delivery_failed") {
    await supabase.from("orders").update({ status: "processing" }).eq("id", orderId);
  }

  const { data, error } = await supabase.rpc("allocate_keys_for_order", { p_order_id: orderId });
  if (error) {
    await supabase.from("orders").update({ status: "delivery_failed" }).eq("id", orderId);
    return { ok: false, error: error.message.includes("insufficient_inventory") ? "Still not enough key inventory." : error.message };
  }

  await supabase.rpc("audit", {
    p_action: "delivery.automatic_retry",
    p_entity_type: "order",
    p_entity_id: orderId,
    p_metadata: { keys_allocated: data ?? 0 },
  });
  if ((data ?? 0) > 0) queueKeyDeliveryEmail(orderId);
  revalidatePath("/admin/orders");
  return { ok: true, info: `Delivered ${data ?? 0} key(s).` };
}

export async function manualDeliverAction(orderItemId: string, content: string): Promise<ActionResult> {
  const g = await guard("manual-deliver");
  if (g.limited) return { ok: false, error: "Rate limited." };

  const parsed = manualDeliverySchema.safeParse({ orderItemId, content });
  if (!parsed.success) return { ok: false, error: "Delivery details are too short." };

  const supabase = await createClient();
  const { data: item } = await supabase
    .from("order_items")
    .select("id, order_id, delivery_status")
    .eq("id", orderItemId)
    .maybeSingle();
  if (!item) return { ok: false, error: "Order item not found." };
  if (item.delivery_status === "delivered") return { ok: false, error: "Already delivered (idempotence)." };

  const { error: insErr } = await supabase.from("deliveries").insert({
    order_item_id: orderItemId,
    method: "manual",
    content: parsed.data.content,
    delivered_by: g.user.id,
  });
  if (insErr) return { ok: false, error: "Could not record the delivery log." };

  const { error: updErr } = await supabase
    .from("order_items")
    .update({ delivery_status: "delivered", delivered_at: new Date().toISOString() })
    .eq("id", orderItemId);
  if (updErr) return { ok: false, error: "Could not update the item status." };

  // complete the order when all items delivered
  const { data: items } = await supabase
    .from("order_items")
    .select("delivery_status")
    .eq("order_id", item.order_id);
  const allDelivered = (items ?? []).every((i) => i.delivery_status === "delivered");
  if (allDelivered) {
    await supabase.from("orders").update({ status: "completed" }).eq("id", item.order_id);
  } else {
    await supabase.from("orders").update({ status: "processing" }).eq("id", item.order_id);
  }

  await supabase.rpc("audit", {
    p_action: "delivery.manual",
    p_entity_type: "order_item",
    p_entity_id: orderItemId,
    p_metadata: { order_id: item.order_id },
  });

  // email the delivered content to the customer (guest-first store)
  queueKeyDeliveryEmail(item.order_id);

  revalidatePath("/admin/orders");
  return { ok: true, info: allDelivered ? "Delivered â€” order completed." : "Item delivered." };
}

export async function setOrderStatusAction(
  orderId: string,
  status: string,
  notes?: string | null,
  paymentMethod?: string | null,
): Promise<ActionResult> {
  const g = await guard("set-order-status");
  if (g.limited) return { ok: false, error: "Rate limited." };

  const allowed = new Set([
    "pending_payment", "payment_submitted", "payment_verified",
    "processing", "completed", "cancelled", "refunded", "delivery_failed",
  ]);
  if (!allowed.has(status)) return { ok: false, error: "Unknown status." };

  // Off-site payment method recording (0009): optional, validated against the
  // DB enum (the 4 accepted client methods + other + legacy labels).
  let method: string | null = null;
  if (paymentMethod) {
    const m = paymentMethodSchema.safeParse(paymentMethod);
    if (!m.success && paymentMethod !== "other") {
      return { ok: false, error: "Unknown payment method." };
    }
    method = paymentMethod;
  }

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "Order not found." };

  // Business guards â€” careful sequencing for lifecycle integrity
  if (status === "completed" && order.status !== "completed") {
    const { data: items } = await supabase
      .from("order_items")
      .select("delivery_status")
      .eq("order_id", orderId);
    const notAllDelivered = (items ?? []).some((i) => i.delivery_status !== "delivered");
    if (notAllDelivered) {
      return { ok: false, error: "Cannot complete: some items are not delivered yet." };
    }
  }

  const { error } = await supabase
    .from("orders")
    .update({
      status: status as never,
      admin_notes: notes ?? undefined,
      ...(method ? { payment_method: method as never } : {}),
    })
    .eq("id", orderId);
  if (error) return { ok: false, error: "Status update failed." };

  if ((status === "cancelled" || status === "refunded") && order.status !== status) {
    // DB trigger releases counted stock and revokes sold/reserved keys
    await supabase.rpc("audit", {
      p_action: `order.${status}_by_admin`,
      p_entity_type: "order",
      p_entity_id: orderId,
      p_metadata: null,
    });
  }

  revalidatePath("/admin/orders");
  return { ok: true, info: `Order set to ${status.replace(/_/g, " ")}.` };
}

// â”€â”€ Inventory: encrypted key import â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function importKeysAction(
  variantId: string,
  rawKeys: string,
): Promise<ActionResult & { imported?: number }> {
  const g = await guard("import-keys");
  if (g.limited) return { ok: false, error: "Rate limited." };

  const parsed = keysImportSchema.safeParse({ variantId, keys: rawKeys });
  if (!parsed.success) return { ok: false, error: "Paste one key per line (or CSV), max 2000 lines." };

  // dedupe + hard-safety: never store blank lines
  const keys = [...new Set(parsed.data.keys)].filter((k) => k.length <= 500);
  if (keys.length === 0) return { ok: false, error: "No usable keys found." };

  // RLS denies client writes to digital_keys by design â€” service role handles inserts
  const admin = createAdminClient();
  const rows = keys.map((k) => ({
    variant_id: variantId,
    key_ciphertext: encryptKeyContent(k),
    status: "available" as const,
    batch: randomToken(6).toUpperCase(),
  }));

  let imported = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const { data, error } = await admin
      .from("digital_keys")
      .insert(rows.slice(i, i + 200))
      .select("id");
    if (error) return { ok: false, error: `Import failed: ${error.message}` };
    imported += data?.length ?? 0;
  }

  const supabase = await createClient();
  await supabase.rpc("audit", {
    p_action: "inventory.imported",
    p_entity_type: "product_variant",
    p_entity_id: variantId,
    p_metadata: { count: imported },
  });
  return { ok: true, imported, info: `Imported ${imported} encrypted key(s).` };
}

export async function revokeKeysAction(keyIds: string[]): Promise<ActionResult> {
  const g = await guard("revoke-keys");
  if (g.limited) return { ok: false, error: "Rate limited." };
  if (keyIds.length === 0 || keyIds.length > 100) return { ok: false, error: "Select 1â€“100 keys." };

  // RLS denies staff access to digital_keys rows â€” verify via service role.
  const admin = createAdminClient();
  const { data: keys } = await admin
    .from("digital_keys")
    .select("id, status")
    .in("id", keyIds);
  if (!keys) return { ok: false, error: "Keys not found." };
  if (keys.some((k) => k.status === "sold")) {
    return { ok: false, error: "Sold keys cannot be revoked â€” cancel the order instead." };
  }

  const revocable = keys
    .filter((k) => k.status === "available" || k.status === "reserved")
    .map((k) => k.id);
  if (revocable.length === 0) return { ok: false, error: "Nothing to revoke." };

  const { error: updErr } = await admin
    .from("digital_keys")
    .update({ status: "revoked" })
    .in("id", revocable);
  if (updErr) return { ok: false, error: "Revocation failed." };

  await (await createClient()).rpc("audit", {
    p_action: "inventory.revoked",
    p_entity_type: "digital_key",
    p_entity_id: undefined,
    p_metadata: { count: revocable.length },
  });
  return { ok: true, info: "Keys revoked." };
}

// â”€â”€ Catalog CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function saveCategoryAction(input: unknown, id?: string): Promise<ActionResult> {
  const g = await guard("save-category");
  if (g.limited) return { ok: false, error: "Rate limited." };
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid category." };

  const supabase = await createClient();
  const payload = {
    name: parsed.data.name,
    slug: parsed.data.slug,
    description: parsed.data.description ?? null,
    sort_order: parsed.data.sortOrder,
    is_active: parsed.data.isActive,
  };
  if (id) {
    const { error } = await supabase.from("categories").update(payload).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("categories").insert(payload);
    if (error) return { ok: false, error: error.message };
  }
  await supabase.rpc("audit", {
    p_action: id ? "category.updated" : "category.created",
    p_entity_type: "category",
    p_entity_id: id ?? undefined,
    p_metadata: null,
  });
  revalidatePath("/admin/categories");
  return { ok: true, info: `Category ${id ? "updated" : "created"}.` };
}

export async function saveProductAction(input: unknown, id?: string): Promise<ActionResult> {
  const g = await guard("save-product");
  if (g.limited) return { ok: false, error: "Rate limited." };
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid product." };

  const supabase = await createClient();
  const productPayload = {
    category_id: parsed.data.categoryId,
    name: parsed.data.name,
    slug: parsed.data.slug,
    description: parsed.data.description ?? null,
    image_url: parsed.data.imageUrl ?? null,
    platform: parsed.data.platform ?? null,
    region: parsed.data.region ?? null,
    delivery_type: parsed.data.deliveryType,
    status: parsed.data.status,
    is_featured: parsed.data.isFeatured,
  };
  if (id) {
    const { error } = await supabase.from("products").update(productPayload).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("products").insert(productPayload);
    if (error) return { ok: false, error: error.message };
  }
  await supabase.rpc("audit", {
    p_action: id ? "product.updated" : "product.created",
    p_entity_type: "product",
    p_entity_id: id ?? undefined,
    p_metadata: null,
  });
  revalidatePath("/admin/products");
  revalidatePath("/");
  return { ok: true, info: `Product ${id ? "updated" : "created"}.` };
}

// variant-level ops used by product editor
export async function saveVariantAction(input: unknown, id?: string): Promise<ActionResult> {
  const g = await guard("save-variant");
  if (g.limited) return { ok: false, error: "Rate limited." };
  const parsed = variantSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid variant." };

  const supabase = await createClient();
  const variantPayload = {
    product_id: parsed.data.productId,
    label: parsed.data.label,
    sku: parsed.data.sku,
    price_tnd: parsed.data.priceTnd,
    price_usd: parsed.data.priceUsd,
    stock: parsed.data.stock,
    is_active: parsed.data.isActive,
    sort_order: parsed.data.sortOrder,
  };
  if (id) {
    const { error } = await supabase.from("product_variants").update(variantPayload).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("product_variants").insert(variantPayload);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/admin/products");
  return { ok: true, info: `Variant ${id ? "updated" : "created"}.` };
}

export async function archiveProductAction(id: string, confirmSlug: string): Promise<ActionResult> {
  const g = await guard("archive-product");
  if (g.limited) return { ok: false, error: "Rate limited." };

  const supabase = await createClient();
  const { data: product } = await supabase.from("products").select("slug, name").eq("id", id).maybeSingle();
  if (!product) return { ok: false, error: "Product not found." };
  if (confirmSlug !== product.slug) return { ok: false, error: "Type the product slug to confirm." };

  const { error } = await supabase.from("products").update({ status: "inactive", is_featured: false }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await supabase.rpc("audit", {
    p_action: "product.archived",
    p_entity_type: "product",
    p_entity_id: id,
    p_metadata: { name: product.name },
  });
  revalidatePath("/admin/products");
  revalidatePath("/");
  return { ok: true, info: "Product archived (hidden from the shop)." };
}

export async function savePaymentInstructionsAction(methods: unknown): Promise<ActionResult> {
  const g = await guard("save-settings");
  if (g.limited) return { ok: false, error: "Rate limited." };

  const supabase = await createClient();
  // Validate the shape before persisting: enabled/display_name/receiver/instructions.
  if (
    typeof methods !== "object" ||
    methods === null ||
    Array.isArray(methods) ||
    Object.values(methods as Record<string, unknown>).some(
      (m) =>
        typeof m !== "object" ||
        m === null ||
        typeof (m as Record<string, unknown>).enabled !== "boolean" ||
        typeof (m as Record<string, unknown>).display_name !== "string" ||
        typeof (m as Record<string, unknown>).receiver !== "string" ||
        typeof (m as Record<string, unknown>).instructions !== "string",
    )
  ) {
    return { ok: false, error: "Invalid payment method configuration." };
  }
  const { error } = await supabase
    .from("store_settings")
    .update({ value: methods as unknown as Database["public"]["Tables"]["store_settings"]["Update"]["value"], updated_at: new Date().toISOString() })
    .eq("key", "payment_methods");
  if (error) return { ok: false, error: "Update failed." };

  await supabase.rpc("audit", {
    p_action: "settings.payment_methods_updated",
    p_entity_type: "store_settings",
    p_entity_id: undefined,
    p_metadata: null,
  });
  revalidatePath("/admin/settings");
  revalidatePath("/payment", "layout");
  return { ok: true, info: "Payment instructions updated." };
}

export async function setExchangeRateAction(rate: number): Promise<ActionResult> {
  const g = await guard("exchange-rate");
  if (g.limited) return { ok: false, error: "Rate limited." };
  const parsed = exchangeRateSchema.safeParse({ base: "USD", quote: "TND", rate });
  if (!parsed.success) return { ok: false, error: "Rate must be a positive number." };

  const supabase = await createClient();
  const { error } = await supabase.from("exchange_rates").insert({
    base: "USD",
    quote: "TND",
    rate: parsed.data.rate,
    created_by: g.user.id,
  });
  if (error) return { ok: false, error: "Could not publish the rate." };

  await supabase.rpc("audit", {
    p_action: "exchange_rate.published",
    p_entity_type: "exchange_rate",
    p_entity_id: undefined,
    p_metadata: { rate: parsed.data.rate },
  });
  revalidatePath("/admin/settings");
  revalidatePath("/");
  return { ok: true, info: "New exchange rate published (affects new orders only)." };
}

export async function saveCouponAction(input: unknown, id?: string): Promise<ActionResult> {
  const g = await guard("save-coupon");
  if (g.limited) return { ok: false, error: "Rate limited." };
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid coupon." };

  const supabase = await createClient();
  const couponPayload = {
    code: parsed.data.code,
    type: parsed.data.type,
    value: parsed.data.value,
    currency: parsed.data.currency,
    min_order_amount: parsed.data.minOrderAmount,
    max_uses: parsed.data.maxUses,
    is_active: parsed.data.isActive,
  };
  if (id) {
    const { error } = await supabase.from("coupons").update(couponPayload).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("coupons").insert(couponPayload);
    if (error) return { ok: false, error: error.message };
  }
  await supabase.rpc("audit", {
    p_action: id ? "coupon.updated" : "coupon.created",
    p_entity_type: "coupon",
    p_entity_id: id ?? undefined,
    p_metadata: null,
  });
  revalidatePath("/admin/coupons");
  return { ok: true, info: `Coupon ${id ? "updated" : "created"}.` };
}

export async function setTopupStatusAction(
  id: string,
  status: "submitted" | "processing" | "completed" | "rejected",
  notes?: string | null,
): Promise<ActionResult> {
  const g = await guard("topup-status");
  if (g.limited) return { ok: false, error: "Rate limited." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("topup_requests")
    .update({ status, admin_notes: notes ?? undefined })
    .eq("id", id);
  if (error) return { ok: false, error: "Update failed." };

  await supabase.rpc("audit", {
    p_action: `topup.${status}`,
    p_entity_type: "topup_request",
    p_entity_id: id,
    p_metadata: null,
  });
  return { ok: true, info: `Request marked ${status}.` };
}

/** Role changes are admin-only, audited, and never self-serviceable. */
export async function setUserRoleAction(
  userId: string,
  role: "customer" | "staff" | "admin",
): Promise<ActionResult> {
  const g = await guard("set-user-role");
  if (g.limited) return { ok: false, error: "Rate limited." };
  if (g.user.profile.role !== "admin") return { ok: false, error: "Only admins may change roles." };
  if (userId === g.user.id) return { ok: false, error: "You cannot change your own role." };

  const supabase = await createClient();
  const { data: target } = await supabase.from("profiles").select("id, role, email").eq("id", userId).maybeSingle();
  if (!target) return { ok: false, error: "User not found." };

  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) return { ok: false, error: "Role update failed." };

  await supabase.rpc("audit", {
    p_action: "user.role_changed",
    p_entity_type: "profile",
    p_entity_id: userId,
    p_metadata: { from: target.role, to: role, by: g.user.id },
  });
  return { ok: true, info: `Role updated for ${target.email}.` };
}
