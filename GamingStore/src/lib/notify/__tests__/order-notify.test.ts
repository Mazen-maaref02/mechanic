import { describe, expect, it } from "vitest";
import {
  buildOrderEmailHtml, buildWhatsappText, type OrderNotice,
} from "@/lib/notify/order-notify";

const sample: OrderNotice = {
  kind: "order_placed",
  orderNumber: "TNP-2026-000123",
  customerName: "Mazen <Maaref>",
  customerEmail: "mazen@example.com",
  customerPhone: "21654471843",
  customerNote: "Pay soon & call <me>",
  items: [
    { title: "Steam Wallet Gift Card", label: "100 TND", quantity: 1, lineTotalMinor: 100000 },
    { title: "Fortnite — V-Bucks Pack (Epic)", label: "1,000 V-Bucks", quantity: 2, lineTotalMinor: 70000 },
  ],
  totalMinor: 170000,
  currency: "TND",
};

const payment: OrderNotice = {
  ...sample,
  kind: "payment_submitted",
  items: [],
  paymentMethod: "flouci",
  paymentReference: "BN-777-XYZ",
  totalMinor: 100000,
};

describe("buildWhatsappText", () => {
  it("renders the full order form with items and totals", () => {
    const text = buildWhatsappText(sample);
    expect(text).toContain("NEW ORDER");
    expect(text).toContain("TNP-2026-000123");
    expect(text).toContain("Mazen <Maaref>");
    expect(text).toContain("mazen@example.com");
    expect(text).toContain("21654471843");
    expect(text).toContain("1× Steam Wallet Gift Card — 100 TND → 100.000 TND");
    expect(text).toContain("2× Fortnite — V-Bucks Pack (Epic)");
    expect(text).toContain("TOTAL: 170.000 TND");
    expect(text).toContain("Pay soon & call <me>");
  });

  it("omits phone line and note when absent", () => {
    const text = buildWhatsappText({ ...sample, customerPhone: "", customerNote: undefined });
    expect(text).not.toContain("📞");
    expect(text).not.toContain("📝");
  });

  it("payment notice includes method/reference and skips the items block", () => {
    const text = buildWhatsappText(payment);
    expect(text).toContain("PAYMENT SUBMITTED");
    expect(text).toContain("Method: Flouci");
    expect(text).toContain("Reference: BN-777-XYZ");
    expect(text).not.toContain("🧾 Items:");
    expect(text).toContain("TOTAL: 100.000 TND");
  });
});

describe("buildOrderEmailHtml", () => {
  it("escapes HTML in every user-provided field", () => {
    const html = buildOrderEmailHtml(sample);
    expect(html).toContain("Mazen &lt;Maaref&gt;");
    expect(html).toContain("Pay soon &amp; call &lt;me&gt;");
    expect(html).not.toContain("<Maaref>");
    expect(html).not.toContain("call <me>");
  });

  it("shows items, quantities, line totals and grand total", () => {
    const html = buildOrderEmailHtml(sample);
    expect(html).toContain("TNP-2026-000123");
    expect(html).toContain("100.000 TND");
    expect(html).toContain("70.000 TND"); // 2 × 35.000
    expect(html).toContain("170.000 TND");
    expect(html).toContain("New order");
  });

  it("payment notice adds method/reference rows", () => {
    const html = buildOrderEmailHtml(payment);
    expect(html).toContain("Flouci");
    expect(html).toContain("BN-777-XYZ");
  });

  it("order notice has no payment rows", () => {
    expect(buildOrderEmailHtml(sample)).not.toContain("Payment method");
  });
});
