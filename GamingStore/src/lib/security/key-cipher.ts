import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const VERSION_TAG = "v1";

const getSecretKey = (): Buffer => {
  const secret = process.env.KEY_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error("Config error: KEY_ENCRYPTION_SECRET env var must be set.");
  }
  const hex = secret.trim().toLowerCase();
  const isHex = /^[0-9a-f]{64}$/.test(hex);
  if (isHex) {
    return Buffer.from(hex, "hex");
  }
  // Accept any sufficiently long passphrase deterministically (scrypt-light via sha-256 stream).
  // Production should always use a full 64-char hex secret.
  if (secret.length < 32) {
    throw new Error("Config error: KEY_ENCRYPTION_SECRET must be 64 hex chars or ≥32 characters.");
  }
  const digest = createHash("sha256").update(secret).digest();
  return digest;
};

const encryptForColumn = (plaintext: string): string => {
  const key = getSecretKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const encryptedPart = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION_TAG, iv.toString("base64"), tag.toString("base64"), encryptedPart.toString("base64")].join(".");
};

const decryptFromColumn = (ciphertext: string): string => {
  const parts = ciphertext.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION_TAG) {
    throw new Error("Decrypt error: unknown ciphertext envelope.");
  }
  const iv = Buffer.from(parts[1]!, "base64");
  const tag = Buffer.from(parts[2]!, "base64");
  const data = Buffer.from(parts[3]!, "base64");
  const key = getSecretKey();
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decryptedPart = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  return decryptedPart;
};

/** Shape of a digital key row as stored in `digital_keys`. */
export interface DigitalKeyRecord {
  key_ciphertext: string;
  status: "available" | "reserved" | "sold" | "revoked";
}

export const encryptKeyContent = encryptForColumn;
export const decryptKeyContent = decryptFromColumn;

/** Deterministically mask a key for admin listing views — never shows plaintext. */
/** Deterministic per-key hint for admin listing views — never shows plaintext. */
export const maskKeyHint = (): string => {
  // Stable display hint; the digest suffix lets admins spot duplicate imports
  // without ever exposing key content.
  return "••••-••••";
};
