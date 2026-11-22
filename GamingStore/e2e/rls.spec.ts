import { test, expect } from "@playwright/test";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const URL = `http://127.0.0.1:54321`;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const CUSTOMER = { email: "customer@gamingstore.dev", password: "Customer123!" };

async function signIn(email: string, password: string): Promise<{ id: string; token: string }> {
  const res = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`sign-in failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { user: { id: string }; access_token: string };
  return { id: json.user.id, token: json.access_token };
}

/** Raw PostgREST read as a specific caller. */
async function restGet(table: string, token: string | null) {
  const res = await fetch(`${URL}/rest/v1/${table}`, {
    headers: { apikey: ANON, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) return { rows: [], status: res.status, body: await res.text() };
  return { rows: (await res.json()) as unknown[], status: res.status, body: "" };
}

test.describe("RLS / privacy invariants (Supabase REST, no app server)", () => {
  test("anon sees NO orders, payments, keys or logs", async () => {
    for (const table of ["orders", "payments", "digital_keys", "deliveries", "payment_proofs", "audit_logs"]) {
      const { rows } = await restGet(table, null);
      expect(rows.length, `${table} must be invisible to anon`).toBe(0);
    }
  });

  test("customer scopes strictly to own rows (orders join-profile RLS)", async () => {
    const me = await signIn(CUSTOMER.email, CUSTOMER.password);
    const { rows } = await restGet("orders", me.token);
    for (const o of rows as { profile_id: string }[]) {
      expect(o.profile_id, "order must belong to the caller").toBe(me.id);
    }
  });

  test("customer cannot escalate their own role", async () => {
    const me = await signIn(CUSTOMER.email, CUSTOMER.password);
    const res = await fetch(`${URL}/rest/v1/profiles?id=eq.${me.id}`, {
      method: "PATCH",
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${me.token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ role: "admin" }),
    });
    const json = (await res.json()) as unknown[] | { message?: string } | null;
    // with-check violation → 403 + error object; never a patched row set
    expect(Array.isArray(json) ? json.length : 0).toBe(0);
    expect(res.ok, `escalation must be rejected by RLS (got ${res.status})`).toBe(false);
    const { rows } = await restGet("profiles", me.token);
    const self = (rows as { id: string; role: string }[]).find((r) => r.id === me.id);
    expect(self?.role, "role must remain customer after escalation attempt").toBe("customer");
  });

  test("digital_keys are never readable even with a valid session", async () => {
    const me = await signIn(CUSTOMER.email, CUSTOMER.password);
    const { rows } = await restGet("digital_keys", me.token);
    expect(rows.length).toBe(0);
  });

  test("anon cannot write to digital_keys even via insert", async () => {
    const res = await fetch(`${URL}/rest/v1/digital_keys`, {
      method: "POST",
      headers: {
        apikey: ANON,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        variant_id: "00000000-0000-0000-0000-00000000000f",
        key_ciphertext: "attacker-controlled",
        status: "available",
      }),
    });
    expect(res.ok).toBe(false);
    const { rows } = await restGet("digital_keys", null);
    expect(rows.length).toBe(0);
  });
});
