import { describe, expect, it } from "vitest";
import {
  cartSchema, checkoutSchema, paymentMethodSchema,
  submitPaymentSchema, topupRequestSchema,
} from "@/lib/validation/schemas";

const uuidA = "4f9c8b2e-7d1a-4b3e-9c2f-8a5d1e7f3b4c";
const uuidB = "a3f1d2c4-5e6b-4a8c-9d0e-1f2a3b4c5d6f";

describe("checkout schemas — server re-validation baseline", () => {
  const validItems = { items: [{ variantId: uuidA, quantity: 2 }] };

  it("accepts a valid TND checkout with a delivery email and a payment method", () => {
    const ok = checkoutSchema.safeParse({
      ...validItems,
      currency: "TND",
      couponCode: null,
      customerName: "Achraf Ben Ali",
      customerEmail: "ach@example.com",
      deliveryEmail: "keys@another-inbox.com",
      paymentMethod: "d17_edinar",
      customerPhone: "+216 20 123 456",
      customerNote: "",
    });
    expect(ok.success).toBe(true);
  });

  it("rejects a checkout without a valid delivery email", () => {
    const bad = checkoutSchema.safeParse({
      ...validItems,
      currency: "TND",
      customerName: "Achraf Ben Ali",
      customerEmail: "ach@example.com",
      deliveryEmail: "not-an-email",
      paymentMethod: "d17_edinar",
      customerPhone: "+216 20 123 456",
    });
    expect(bad.success).toBe(false);
  });

  it("rejects a checkout without a payment method", () => {
    const bad = checkoutSchema.safeParse({
      ...validItems,
      currency: "TND",
      customerName: "Achraf Ben Ali",
      customerEmail: "ach@example.com",
      deliveryEmail: "ach@example.com",
      customerPhone: "+216 20 123 456",
    });
    expect(bad.success).toBe(false);
  });

  it("rejects a checkout with an unknown payment method", () => {
    const bad = checkoutSchema.safeParse({
      ...validItems,
      currency: "TND",
      customerName: "Achraf Ben Ali",
      customerEmail: "ach@example.com",
      deliveryEmail: "ach@example.com",
      paymentMethod: "redotpay",
      customerPhone: "+216 20 123 456",
    });
    expect(bad.success).toBe(false);
  });

  it("rejects invalid currency, uuid, quantity", () => {
    const bad1 = checkoutSchema.safeParse({
      ...validItems,
      currency: "EUR",
      customerName: "Achraf Ben Ali",
      customerEmail: "ach@example.com",
      deliveryEmail: "ach@example.com",
      customerPhone: "+216 20 123 456",
    });
    expect(bad1.success).toBe(false);

    const bad2 = checkoutSchema.safeParse({
      ...validItems,
      currency: "USD",
      customerName: "Achraf Ben Ali",
      customerEmail: "ach@example.com",
      deliveryEmail: "ach@example.com",
      paymentMethod: "wafacash",
      customerPhone: "+216 20 123 456",
    });
    expect(bad2.success).toBe(true); // sanity

    const bad3 = checkoutSchema.safeParse({
      items: [{ variantId: "not-a-uuid", quantity: 1 }],
      currency: "USD",
      customerName: "Achraf Ben Ali",
      customerEmail: "ach@example.com",
      deliveryEmail: "ach@example.com",
      paymentMethod: "cash",
      customerPhone: "+216 20 123 456",
    });
    expect(bad3.success).toBe(false);

    const bad4 = checkoutSchema.safeParse({
      items: [{ variantId: uuidA, quantity: 0 }],
      currency: "USD",
      customerName: "Achraf Ben Ali",
      customerEmail: "ach@example.com",
      deliveryEmail: "ach@example.com",
      paymentMethod: "flouci",
      customerPhone: "+216 20 123 456",
    });
    expect(bad4.success).toBe(false);
  });

  it("rejects suspicious transaction references and huge proofs", () => {
    expect(
      submitPaymentSchema.safeParse({
        orderId: uuidB,
        email: "ach@example.com",
        method: "redotpay",
        reference: "SELECT * FROM users;--",
      }).success,
    ).toBe(false);
    expect(
      submitPaymentSchema.safeParse({
        orderId: uuidB,
        email: "ach@example.com",
        method: "binance",
        reference: "TRX-1234%",
      }).success,
    ).toBe(false);
    expect(paymentMethodSchema.safeParse("western_union").success).toBe(false);
  });

  it("accepted methods are d17_edinar, flouci, cash, wafacash", () => {
    for (const m of ["d17_edinar", "flouci", "cash", "wafacash"]) {
      expect(paymentMethodSchema.safeParse(m).success).toBe(true);
    }
    // legacy methods are no longer accepted from clients
    expect(paymentMethodSchema.safeParse("redotpay").success).toBe(false);
    expect(paymentMethodSchema.safeParse("binance").success).toBe(false);
  });

  it("cart schema sanity — empty cart is a valid state (submission guarded elsewhere)", () => {
    expect(cartSchema.safeParse({ items: [], currency: "USD" }).success).toBe(true);
    expect(cartSchema.safeParse({ items: [{ variantId: uuidA, quantity: 11 }], currency: "USD" }).success).toBe(false);
  });
});

describe("top-up request schemas never accept secrets", () => {
  const base = {
    customerName: "Achraf Ben Ali",
    customerEmail: "ach@example.com",
    customerPhone: "+216 20 123 456",
    service: "redotpay",
    amount: 5000,
    currency: "TND",
    paymentMethod: "d17_edinar",
  };

  it("accepts contact details + an account identifier only", () => {
    expect(topupRequestSchema.safeParse({ ...base, recipientRef: "RP-889920" }).success).toBe(true);
  });

  it("rejects missing contact details", () => {
    expect(topupRequestSchema.safeParse({ ...base, customerEmail: "not-an-email", recipientRef: "RP-889920" }).success).toBe(false);
  });

  it("rejects whitespace/format abuse in recipientRef", () => {
    expect(topupRequestSchema.safeParse({ ...base, recipientRef: "<script>alert(1)</script>" }).success).toBe(false);
  });

  it("rejects zero/negative amounts", () => {
    expect(topupRequestSchema.safeParse({ ...base, recipientRef: "RP-1", amount: 0 }).success).toBe(false);
  });
});

