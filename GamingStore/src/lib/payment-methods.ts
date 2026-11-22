/**
 * Canonical payment methods (migration 0008).
 * Keys match the DB `payment_method` enum and store_settings.payment_methods.
 * Legacy keys (redotpay, binance) exist only to label old rows — they are
 * never offered to customers or accepted by validation.
 */
export const PAYMENT_METHOD_KEYS = ["d17_edinar", "flouci", "cash", "wafacash"] as const;

export type PaymentMethodKey = (typeof PAYMENT_METHOD_KEYS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodKey, string> = {
  d17_edinar: "D17 / e-Dinar",
  flouci: "Flouci",
  cash: "Cash",
  wafacash: "WafaCash",
};

/** Labels for any stored method value, including legacy rows. */
export const paymentMethodLabel = (method: string): string =>
  PAYMENT_METHOD_LABELS[method as PaymentMethodKey] ??
  (method === "redotpay" ? "RedotPay" : method === "binance" ? "Binance Pay" : method);
