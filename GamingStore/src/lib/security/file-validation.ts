import "server-only";

export type ProofValidationError = "EMPTY" | "TOO_LARGE" | "BAD_TYPE" | "MAGIC";

export interface FileValidationResult {
  ok: boolean;
  error?: ProofValidationError;
}

const MAX_PROOF_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/**
 * Validates a payment-proof upload:
 * 1. size cap
 * 2. MIME whitelist (declared type)
 * 3. content sniffing (magic bytes) — never trust the declared type alone
 */
export const validateProofFile = async (file: File): Promise<FileValidationResult> => {
  if (file.size <= 0) return { ok: false, error: "EMPTY" };
  if (file.size > MAX_PROOF_BYTES) return { ok: false, error: "TOO_LARGE" };
  if (!ALLOWED_MIMES.includes(file.type)) return { ok: false, error: "BAD_TYPE" };

  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const bytes = Array.from(header);
  const startsJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const startsPng =
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  const startsWebp =
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  const startsPdf =
    bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;

  const magicOk =
    (file.type === "image/jpeg" && startsJpeg) ||
    (file.type === "image/png" && startsPng) ||
    (file.type === "image/webp" && startsWebp) ||
    (file.type === "application/pdf" && startsPdf);

  if (!magicOk) return { ok: false, error: "MAGIC" };
  return { ok: true };
};
