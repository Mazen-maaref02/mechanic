import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { decryptKeyContent } from "@/lib/security/key-cipher";

/**
 * Guest order access — since clients no longer create accounts, every storefront
 * order view is gated by knowing BOTH the order reference AND the exact email
 * used at checkout. Access goes through the service-role client (RLS deny-all
 * for anon stays untouched); verification happens here, server-side only.
 */
export interface GuestOrderBundle {
  order: {
    id: string;
    order_number: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string | null;
    customer_note: string | null;
    admin_notes: string | null;
    status: string;
    payment_method: string | null;
    currency: string;
    subtotal_amount: number;
    discount_amount: number;
    total_amount: number;
    exchange_rate: string | number | null;
    created_at: string;
  };
  items: Array<{
    id: string;
    product_title: string;
    variant_label: string;
    quantity: number;
    line_total: number;
    delivery_status: string;
    requires_key: boolean;
    region: string | null;
  }>;
  payments: Array<{
    id: string;
    method: string;
    status: string;
    reference: string | null;
    created_at: string;
  }>;
  deliveries: Array<{
    id: string;
    order_item_id: string;
    method: string;
    created_at: string;
  }>;
  /** Decrypted plaintext key per delivered order item id (empty until delivered). */
  keyByItem: Map<string, string>;
}

/** Load an order for a guest identified by (order number | order id) + email. */
export async function loadGuestOrder(
  selector: { byOrderId?: string; byOrderNumber?: string },
  providedEmail: string,
): Promise<GuestOrderBundle | null> {
  const email = providedEmail?.trim().toLowerCase();
  if (!email) return null;

  const admin = createAdminClient();
  let query = admin
    .from("orders")
    .select("*")
    .eq("customer_email", email)
    .limit(1);

  if (selector.byOrderId) query = query.eq("id", selector.byOrderId);
  else if (selector.byOrderNumber) query = query.eq("order_number", selector.byOrderNumber);
  else return null;

  const { data: order } = await query.maybeSingle();
  if (!order) return null;

  const { data: items } = await admin
    .from("order_items")
    .select("*")
    .eq("order_id", order.id)
    .order("created_at");

  const itemRows = items ?? [];
  const itemIds = itemRows.map((i) => i.id);

  const [{ data: payments }, { data: deliveries }] = await Promise.all([
    admin
      .from("payments")
      .select("id, method, status, reference, created_at")
      .eq("order_id", order.id)
      .order("created_at"),
    itemIds.length > 0
      ? admin
          .from("deliveries")
          .select("id, order_item_id, key_id, method, content, created_at")
          .in("order_item_id", itemIds)
      : Promise.resolve({ data: null as Array<{ id: string; order_item_id: string; key_id: string | null; method: string; content: string | null; created_at: string }> | null }),
  ]);

  return {
    order,
    items: itemRows,
    payments: payments ?? [],
    deliveries: deliveries ?? [],
    keyByItem: await decryptDeliveredKeys(itemRows, deliveries ?? []),
  };
}

/** Decrypt plaintext keys for solidly-delivered items only (server-side, once). */
async function decryptDeliveredKeys(
  items: Array<{ id: string; delivery_status: string }>,
  deliveries: Array<{ key_id: string | null; order_item_id: string }>,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const deliveredItems = new Set(
    items.filter((i) => i.delivery_status === "delivered").map((i) => i.id),
  );
  const keyIds = deliveries
    .filter((d) => d.key_id && deliveredItems.has(d.order_item_id))
    .map((d) => d.key_id as string);

  if (keyIds.length === 0) return map;

  const admin = createAdminClient();
  const { data: keys } = await admin
    .from("digital_keys")
    .select("id, key_ciphertext, order_item_id")
    .in("id", keyIds)
    .eq("status", "sold");

  for (const k of keys ?? []) {
    if (!k.order_item_id) continue;
    try {
      map.set(k.order_item_id, decryptKeyContent(k.key_ciphertext));
    } catch {
      map.set(k.order_item_id, "[Key decryption error — contact support]");
    }
  }
  return map;
}
