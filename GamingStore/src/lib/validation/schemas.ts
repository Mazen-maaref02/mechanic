import { z } from "zod";

/**
 * Central validation schemas. All user input goes through these —
 * server actions validate again regardless of client-side validation.
 */

// Never accept: seed phrase / private key / password fields on service requests.
// Any submitted key name matching this pattern (or a value carrying a mnemonic-
// length word sequence) is rejected before persistence.
export const forbiddenFieldPattern = /(seed|mnemonic|private[_ -]?key|secret|password|passphrase)/i;

const noWhitespace = (v: string) => v.trim().length > 0;

// ── Auth ─────────────────────────────────────────────────────────────────────
export const emailSchema = z.string().trim().toLowerCase().email();
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72)
  .regex(/[a-zA-Z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a digit");

export const registerSchema = z.object({
  fullName: z.string().min(2, "Name is too short").max(80).refine(noWhitespace),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(72),
  staff: z.boolean().optional(),
});

export const resetRequestSchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({ password: passwordSchema });

// ── Profile ──────────────────────────────────────────────────────────────────
export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(80),
  phone: z.string().min(6).max(24).regex(/^[+\d\s()-]+$/, "Invalid phone number"),
});

// ── Catalog (admin) ──────────────────────────────────────────────────────────
export const categorySchema = z.object({
  name: z.string().min(2).max(60),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only")
    .min(2)
    .max(60),
  description: z.string().max(300).optional().nullable(),
  sortOrder: z.number().int().min(0).max(999),
  isActive: z.boolean(),
});

export const productSchema = z.object({
  categoryId: z.uuid(),
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .min(2)
    .max(120),
  description: z.string().max(2000).optional().nullable(),
  imageUrl: z.url().optional().nullable(),
  platform: z.string().max(40).optional().nullable(),
  region: z.string().max(60).optional().nullable(),
  deliveryType: z.enum(["manual", "automatic"]),
  status: z.enum(["draft", "active", "inactive"]),
  isFeatured: z.boolean(),
});

export const variantSchema = z.object({
  productId: z.uuid(),
  label: z.string().min(1).max(80),
  sku: z.string().min(2).max(40).regex(/^[A-Za-z0-9-]+$/),
  priceTnd: z.number().int().min(0),
  priceUsd: z.number().int().min(0),
  stock: z.number().int().min(0).max(100000).nullable(),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
});

// ── Keys inventory ───────────────────────────────────────────────────────────
export const keysImportSchema = z.object({
  variantId: z.uuid(),
  keys: z
    .string()
    .min(1)
    .max(100_000)
    .transform((v) => v.split(/\r?\n/).map((k) => k.trim()).filter((k) => k.length > 0))
    .refine((keys) => keys.length > 0, "Supply at least one key")
    .refine((keys) => keys.length <= 2000, "Import up to 2000 keys at a time"),
});

// ── Checkout ─────────────────────────────────────────────────────────────────
export const checkoutItemSchema = z.object({
  variantId: z.uuid(),
  quantity: z.number().int().min(1).max(10),
});

// The four accepted off-site methods — the CLIENT picks one at checkout so
// the owner sees how he wants to pay before contacting him.
export const paymentMethodSchema = z.enum(["d17_edinar", "flouci", "cash", "wafacash"]);

export const checkoutSchema = z.object({
  currency: z.enum(["TND", "USD"]),
  couponCode: z.string().max(24).optional().nullable(),
  customerName: z.string().min(2).max(80),
  customerEmail: emailSchema,
  customerPhone: z
    .string()
    .min(6)
    .max(24)
    .regex(/^[+\d\s()-]+$/),
  // The email the key/code is SENT to — may differ from the contact email.
  deliveryEmail: emailSchema,
  // How the customer wants to pay (off-site): recorded on the order.
  paymentMethod: paymentMethodSchema,
  customerNote: z.string().max(500).optional().nullable(),
  items: z.array(checkoutItemSchema).min(1).max(20),
});

export const submitPaymentSchema = z.object({
  orderId: z.uuid(),
  // Guest checkout: the caller must present the exact email used at checkout
  // in addition to the order id (no accounts exist for storefront clients).
  email: emailSchema,
  method: paymentMethodSchema,
  reference: z
    .string()
    .trim()
    .min(4, "Transaction reference is too short")
    .max(80)
    .regex(/^[\w-]+$/, "Letters, numbers, dash and underscore only"),
  proofDataUrl: z
    .string()
    .regex(
      /^data:(image\/(jpeg|png|webp)|application\/pdf);base64,[A-Za-z0-9+/=]+$/,
      "Only JPG, PNG, WEBP or PDF up to 5MB",
    )
    .max(7_000_000)
    .optional()
    .nullable(),
});

// ── Top-ups ──────────────────────────────────────────────────────────────────
export const serviceIdSchema = z
  .string()
  .trim()
  .min(4, "Identifier is too short")
  .max(80)
  .regex(/^[A-Za-z0-9@._+:-]+$/, "Alphanumeric and @ . _ + : - only");

export const topupRequestSchema = z.object({
  // Guest flow (0007): contact details live on the request itself.
  customerName: z.string().min(2, "Name is too short").max(80).refine(noWhitespace),
  customerEmail: emailSchema,
  customerPhone: z
    .string()
    .trim()
    .min(6)
    .max(24)
    .regex(/^[+\d\s()-]+$/, "Invalid phone number"),
  service: z.enum(["redotpay", "binance", "rizon", "other"]),
  recipientRef: serviceIdSchema,
  amount: z.number().int().min(1),
  currency: z.enum(["TND", "USD"]),
  paymentMethod: paymentMethodSchema,
  reference: z.string().trim().min(4).max(80).optional().nullable(),
});

// ── Admin operations ─────────────────────────────────────────────────────────
export const orderStatusTransitionSchema = z.object({
  orderId: z.uuid(),
  status: z.enum([
    "pending_payment", "payment_submitted", "payment_verified",
    "processing", "completed", "cancelled", "refunded", "delivery_failed",
  ]),
  notes: z.string().max(500).optional().nullable(),
});

export const verifyPaymentSchema = z.object({
  paymentId: z.uuid(),
  approve: z.boolean(),
  reason: z.string().max(300).optional().nullable(),
});

export const manualDeliverySchema = z.object({
  orderItemId: z.uuid(),
  content: z.string().min(2).max(2000),
});

export const couponSchema = z.object({
  code: z.string().min(3).max(24).regex(/^[A-Z0-9-]+$/),
  type: z.enum(["percentage", "fixed"]),
  value: z.number().int().min(1),
  currency: z.enum(["TND", "USD"]).nullable(),
  minOrderAmount: z.number().int().min(0).nullable(),
  maxUses: z.number().int().min(1).max(100000).nullable(),
  isActive: z.boolean(),
});

export const exchangeRateSchema = z.object({
  base: z.enum(["USD"]),
  quote: z.enum(["TND"]),
  rate: z.number().min(0.000001).max(100000),
});

// ── Cart (client state sanity — server still revalidates everything) ────────
export const cartItemSchema = z.object({
  variantId: z.uuid(),
  quantity: z.number().int().min(1).max(10),
});

export const cartSchema = z.object({
  items: z.array(cartItemSchema).max(20),
  currency: z.enum(["TND", "USD"]),
});

export type CartItem = z.infer<typeof cartItemSchema>;

export const paymentConfigSchema = z.object({
  enabled: z.boolean(),
  display_name: z.string().min(2).max(40),
  receiver: z.string().min(4).max(200),
  instructions: z.string().min(10).max(1000),
});
