/**
 * Money utilities — integer minor-unit arithmetic ONLY.
 * TND minor unit = millime = 1/1000 (3 decimals)
 * USD minor unit = cent = 1/100   (2 decimals)
 * No floating point is ever used for money.
 */

export type CurrencyCode = "TND" | "USD";

export const CURRENCY_META: Record<
  CurrencyCode,
  { exponent: number; symbol: string; symbolPosition: "suffix" | "prefix" }
> = {
  TND: { exponent: 3, symbol: "TND", symbolPosition: "suffix" },
  USD: { exponent: 2, symbol: "$", symbolPosition: "prefix" },
};

export interface Money {
  amountMinor: number;
  currency: CurrencyCode;
}

export const isCurrencyCode = (value: unknown): value is CurrencyCode =>
  value === "TND" || value === "USD";

export const ZERO: Record<CurrencyCode, Money> = {
  TND: { amountMinor: 0, currency: "TND" },
  USD: { amountMinor: 0, currency: "USD" },
};

export const addMoney = (a: Money, b: Money): Money => {
  if (a.currency !== b.currency) {
    throw new Error("addMoney: currency mismatch");
  }
  return { amountMinor: a.amountMinor + b.amountMinor, currency: a.currency };
};

export const subtractMoney = (a: Money, b: Money): Money => {
  if (a.currency !== b.currency) {
    throw new Error("subtractMoney: currency mismatch");
  }
  return { amountMinor: a.amountMinor - b.amountMinor, currency: a.currency };
};

export const multiplyMoney = (m: Money, quantity: number): Money => {
  const amountMinor = Number.isInteger(quantity) ? m.amountMinor * quantity : -1;
  if (amountMinor < 0) {
    throw new Error(`multiplyMoney: invalid quantity (${quantity})`);
  }
  return { amountMinor, currency: m.currency };
};

/** Parse a human price string ("12.500" TND, "19.99" USD) into minor units. */
export const parseAmountMinor = (value: string, currency: CurrencyCode): number => {
  const trimmed = value.trim();
  if (!/^\d{1,10}([.,]\d{1,3})?$/.test(trimmed)) {
    throw new Error(`parseAmountMinor: invalid amount "${value}"`);
  }
  const normalized = trimmed.replace(",", ".");
  const [whole, frac = ""] = normalized.split(".");
  const decad = CURRENCY_META[currency].exponent;
  if (frac.length > decad) {
    throw new Error(`parseAmountMinor: too many decimals for ${currency}`);
  }
  return parseInt(whole + frac.padEnd(decad, "0"), 10);
};

/** Format minor units for display ("45.000 TND", "$19.99"). */
export const formatMoney = (m: Money, locale = "en-US"): string => {
  const { exponent, symbol, symbolPosition } = CURRENCY_META[m.currency];
  const isNegative = m.amountMinor < 0;
  const abs = Math.abs(m.amountMinor);
  const units = Math.floor(abs / 10 ** exponent);
  const frac = String(abs % 10 ** exponent).padStart(exponent, "0");
  const joined = isNegative
    ? `-${units.toLocaleString(locale)}.${frac}`
    : `${units.toLocaleString(locale)}.${frac}`;
  return symbolPosition === "suffix" ? `${joined} ${symbol}` : `${symbol}${joined}`;
};

export const moneyEquals = (a: Money, b: Money): boolean =>
  a.currency === b.currency && a.amountMinor === b.amountMinor;

export const moneyLess = (a: Money, min: Money) => a.currency === min.currency && a.amountMinor < min.amountMinor;

/** Convenience: format a raw minor-unit amount in one call. */
export const formatPrice = (amountMinor: number, currency: CurrencyCode, locale = "en-US"): string =>
  formatMoney({ amountMinor, currency }, locale);
