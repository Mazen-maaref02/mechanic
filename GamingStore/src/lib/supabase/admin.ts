import "server-only";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";
import type { Database } from "@/lib/database.types";

let cachedClient: SupabaseClient<Database> | null = null;

/**
 * Service-role client — SERVER ONLY. Bypasses RLS; used exclusively in
 * trusted server actions/admin operations. Never expose to the browser.
 */
export const createAdminClient = (): SupabaseClient<Database> => {
  if (cachedClient) {
    return cachedClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Config error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for server operations.",
    );
  }

  cachedClient = createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedClient;
};

/** Derive the 32-byte AES key from the configured secret. */
export const deriveCipherKey = (): Buffer => {
  const secret = process.env.KEY_ENCRYPTION_SECRET;

  if (!secret) {
    throw new Error(
      "Config error: KEY_ENCRYPTION_SECRET must be set (openssl rand -hex 32).",
    );
  }

  return Buffer.from(secret, "hex");
};

export const randomToken = (bytes = 16): string => randomBytes(bytes).toString("hex");

export const sha256Hex = (value: string): string =>
  createHash("sha256").update(value).digest("hex");
