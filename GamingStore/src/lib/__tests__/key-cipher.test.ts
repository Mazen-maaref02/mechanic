import { describe, expect, it, beforeAll } from "vitest";
import {
  decryptKeyContent,
  encryptKeyContent,
  maskKeyHint,
} from "@/lib/security/key-cipher";

beforeAll(() => {
  // Random 64-hex secret for the test environment
  if (!process.env.KEY_ENCRYPTION_SECRET) {
    process.env.KEY_ENCRYPTION_SECRET =
      "7f6a5d4c3b2a19080f0e0d0c0b0a0908101112131415161718191a1b1c1d1e1f";
  }
});

describe("digital key encryption (AES-256-GCM envelope)", () => {
  it("round-trips plaintext keys", () => {
    const plaintext = "STEAM-XXXX-YYYY-ZZZZ-ABCD";
    const cipher = encryptKeyContent(plaintext);
    expect(cipher).not.toContain(plaintext);
    expect(cipher.startsWith("v1.")).toBe(true);
    expect(decryptKeyContent(cipher)).toBe(plaintext);
  });

  it("produces a unique iv per encryption (two ciphertexts differ)", () => {
    const a = encryptKeyContent("KEY-AAA");
    const b = encryptKeyContent("KEY-AAA");
    expect(a).not.toBe(b);
  });

  it("refuses to decrypt tampered ciphertext", () => {
    const cipher = encryptKeyContent("KEY-BBB");
    const parts = cipher.split(".");
    const tampered = [parts[0], parts[1], parts[2], Buffer.from("evil").toString("base64")].join(".");
    expect(() => decryptKeyContent(tampered)).toThrow();
  });

  it("refuses to decrypt foreign-version envelopes", () => {
    expect(() => decryptKeyContent("v9.AAAA.AAAA.AAAA")).toThrow(/unknown ciphertext envelope/);
  });

  it("never exposes plaintext through the mask hint", () => {
    const cipher = encryptKeyContent("SECRETKEY-1234");
    const hint = maskKeyHint();
    expect(cipher).toMatch(/^v1\./);
    expect(hint).not.toContain("SECRETKEY");
    expect(hint.startsWith("••••")).toBe(true);
  });
});
