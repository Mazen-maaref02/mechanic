import { describe, expect, it } from "vitest";
import {
  addMoney, CURRENCY_META, formatPrice, isCurrencyCode, moneyEquals, multiplyMoney,
  parseAmountMinor, subtractMoney,
  ZERO,
} from "@/lib/money";

describe("money — integer minor-unit arithmetic", () => {
  it("stores TND with 3 decimals (millimes) and USD with 2 (cents)", () => {
    expect(CURRENCY_META.TND.exponent).toBe(3);
    expect(CURRENCY_META.USD.exponent).toBe(2);
  });

  it("parses TND amounts to millimes", () => {
    expect(parseAmountMinor("12.500", "TND")).toBe(12500);
    expect(parseAmountMinor("12,5", "TND")).toBe(12500);
    expect(parseAmountMinor("1000", "TND")).toBe(1000000);
  });

  it("parses USD amounts to cents", () => {
    expect(parseAmountMinor("19.99", "USD")).toBe(1999);
    expect(parseAmountMinor("0.10", "USD")).toBe(10);
  });

  it("rejects over-precision instead of silently rounding", () => {
    expect(() => parseAmountMinor("1.999", "USD")).toThrow();
    expect(() => parseAmountMinor("abc", "TND")).toThrow();
    expect(() => parseAmountMinor("-5", "TND")).toThrow();
  });

  it("adds and subtracts only within the same currency", () => {
    expect(addMoney({ amountMinor: 1000, currency: "TND" }, { amountMinor: 500, currency: "TND" }))
      .toEqual({ amountMinor: 1500, currency: "TND" });
    expect(() => addMoney({ amountMinor: 1, currency: "TND" }, { amountMinor: 1, currency: "USD" }))
      .toThrow();
    expect(subtractMoney({ amountMinor: 0, currency: "TND" }, ZERO.TND)).toEqual(ZERO.TND);
  });

  it("multiplies by integer quantities only", () => {
    expect(multiplyMoney({ amountMinor: 12500, currency: "TND" }, 3)).toEqual({
      amountMinor: 37500,
      currency: "TND",
    });
    expect(() => multiplyMoney({ amountMinor: 1000, currency: "USD" }, 1.5)).toThrow();
    expect(() => multiplyMoney({ amountMinor: 1000, currency: "USD" }, -2)).toThrow();
  });

  it("formats for display", () => {
    expect(formatPrice(12500, "TND")).toContain("12.500");
    expect(formatPrice(1999, "USD")).toContain("19.99");
  });

  it("guards helpers", () => {
    expect(isCurrencyCode("TND")).toBe(true);
    expect(isCurrencyCode("EUR")).toBe(false);
    expect(moneyEquals(ZERO.USD, { amountMinor: 0, currency: "USD" })).toBe(true);
  });
});
