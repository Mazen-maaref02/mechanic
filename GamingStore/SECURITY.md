# Security model & invariants

This document describes the trust model, the invariants the platform
guarantees, and **how each invariant is proven** (test or SQL guard, never by
assertion).

## Trust model

- **Never trust the client.** Prices, totals, stock, coupons, role and payment
  state are computed/validated server-side (Postgres RLS + RPC + server
  actions). Client-side fetching of catalog data is read-only aggregate data.
- Two personas with server-verified roles in `profiles.role`: `customer`
  (default) and `admin`. Role changes are **only** possible server-side; no
  RLS policy grants client writes on `profiles.role`, and admin API paths
  re-check role inside every action (`requireAdmin`).
- Payments are **manual-verified** by a human admin. A screenshot is treated
  as customer-provided context, never as proof.

## Database & RLS

All 15 tables have RLS enabled with no default-open policies:

| Invariant | Enforcement / proof |
| --- | --- |
| Anonymous users read only active public catalog rows | RLS; e2e `rls.spec.ts` asserts anon `orders`/`payments` REST queries return zero rows |
| Customers scope strictly to their own rows | `orders`/`payments`/`payment_proofs` join-profile RLS; e2e asserts a second customer's session cannot see IDs it didn't create |
| Non-admin cannot write admin-owned fields | 403 from PostgREST on role-escalation attempt (e2e) |
| `digital_keys` are opaque to every client | deny-all client policies (read and write), even for authenticated sessions; e2e proves zero rows + rejected insert. Plaintext only exists in the server decrypt path |
| Pending order cannot get two verified payments | partial unique index `(order_id) WHERE status = 'verified'` |
| Order cannot be completed before a verified payment | SQL flow + `allocate_keys_for_order` runs only from `verifyPaymentAction` after `status = 'verified'` |
| Concurrent allocation never double-sells | Postgres RPC with `FOR UPDATE SKIP LOCKED`; inventory decrement is row-lock based |

## Encryption of digital keys

- `digital_keys.key_ciphertext` is AES-256-GCM via
  `src/lib/security/key-cipher.ts`; the secret is `KEY_ENCRYPTION_SECRET`
  (32 bytes, server-only). The key plaintext never enters logs, the React
  tree of anyone other than the order's owner, or public APIs.
- The buyer's order page masks the key until **Reveal**; the reveal is a
  server-rendered decrypt path scoped by RLS'd ownership checks.
- Losing `KEY_ENCRYPTION_SECRET` makes existing ciphertext undecryptable —
  back it up (e.g. in the deployment secret manager) before importing keys.

## Payment proof storage

- Supabase Storage private bucket `payment-proofs`; a DB index table
  `payment_proofs` tracks rows. Uploads are validated (MIME whitelist, 5 MB
  cap, size sniffing) in `src/lib/security/file-validation.ts`.
- Screenshots are always reachable through short-lived **signed URLs**
  generated for the owning customer or an admin, never through a public URL.

## Auth hardening

- Login/register/reset/upful mutations are **rate limited**
  (`src/lib/security/rate-limit.ts`, per-IP sliding window). Limits are active
  in production builds; local dev/e2e skip them (single ephemeral process,
  one IP) so automated runs are not throttled — this branch is
  `NODE_ENV !== "production"` in `rateLimit()` only.
- Admin accounts should enroll **TOTP MFA** (admin UI → MFA module). Admin
  server actions still enforce the server-side role check regardless of MFA
  status (defense in depth).
- Supabase Auth email confirmation behaves per project config; the dev seed
  creates pre-confirmed users.

## Audit trail

Every admin mutation (role change, product/variant CRUD, key import, payment
verify/reject, delivery retry, settings change, coupon CRUD, top-up actions)
writes to `audit_logs` through the `audit()` SQL helper or a service-role
insert. `/admin/audit-logs` exposes it read-only; audit rows are not
client-writable.

## Destructive actions

Admin destructive operations (rejecting a payment, deleting products/
variants, clearing settings, top-up rejections) go through confirmation
dialogs and write audit entries. Key import is append-only; keys are marked
`used`/`revoked`, never deleted once sold.

## Secrets policy

| Secret | Where | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client-safe | Publishable; anon role is locked down by RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only env | Bypasses RLS. Never import in a module reachable from a Client Component. Guarded by `server-only` import discipline |
| `KEY_ENCRYPTION_SECRET` | server-only env | 32-byte AES-256-GCM key; rotate only with a re-encryption plan |
| `NEXT_PUBLIC_SITE_URL` | client-safe | Auth redirect target |

`.env.local` is git-ignored and generated locally by `npm run env:local`.
The repo `.env.example` documents the variables without real values.

## Admin bootstrapping (console-only)

No public path can create an admin. In the Supabase SQL editor (or migration
script run by an operator):

```sql
update public.profiles set role = 'admin' where id = '<auth-user-uuid>';
```

Then have that admin sign in and immediately enroll TOTP MFA. Confirm in
`audit_logs` (seed/demo only pre-creates the local dev admin).

## Production checklist

1. Hosted Supabase: migrations applied in order; RLS verified with
   `supabase db lint` / by running the e2e `rls.spec.ts` against a staging DB.
2. Real `KEY_ENCRYPTION_SECRET` set **before** any key import; backed up.
3. Service-role key present only in the server runtime; a grep of built
   client chunks must not contain it (CI step recommended).
4. Admin enrolled with MFA; audit log shows nothing unexpected.
5. Storage bucket `payment-proofs` is **private** with public access disabled.
6. Rate limiting active (production build), plus consider a shared store
   (Redis) in multi-instance deployments.
7. Review `verifyPaymentAction` flow with real money once in staging before
   enabling the store for buyers.
