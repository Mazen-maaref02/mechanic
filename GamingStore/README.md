# NexLevel Gaming Store

A production-oriented digital gaming e-commerce platform: gift cards (Steam,
PlayStation, Xbox), game keys (Steam/Epic/RDR2) and mobile top-up services for
Tunisia (TND) and international customers (USD).

Stack: **Next.js 16 (App Router, Turbopack)** · **React 19** · **TypeScript
strict** · **Tailwind CSS 4** · **Framer Motion** · **Supabase**
(PostgreSQL + Auth + Storage) · **Zod** · **Vitest** · **Playwright**.

Read [`AGENTS.md`](./AGENTS.md) for architecture rules and
[`SECURITY.md`](./SECURITY.md) for the invariants this codebase enforces and
how they are proven by tests.

---

## Feature overview

### Storefront

- Catalog: categories, listings, search, product detail with variants
  (TND + USD pricing side by side).
- Two pricing currencies, driven by an **admin-controlled USD→TND exchange
  rate**; every order snapshots the rate at creation and never re-converts.
- Cart (client-side, localStorage), checkout with coupon support and
  server-side re-validation of every price/stock.
- Auth: register, sign in, password reset, profile, order tracking.
- Order payment page where the buyer picks a payment method and registers a
  transaction reference + optional screenshot proof.
- Delivered digital keys are revealed **per require decision of the owner** on
  their order page (masked until "Reveal key"; decrypt path is server-only).

### Payment model — manual human verification only

Payment methods supported: **RedotPay**, **Binance (BNB/USDT)**,
**D17 / e-Dinar (La Poste Tunisienne)**.

- Payments are **never verified automatically** — there is no webhook, no
  crypto custody, and no auto-approve path anywhere in the codebase.
- Admin verifies each submission against their own exchange/bank dashboard
  from the **Payments queue** in the admin dashboard.
- Approval marks the payment `verified` (DB partial unique index makes
  double-verification per order impossible) and flips the order to
  `payment_verified`.
- For `automatic`-delivery products, verification triggers
  `allocate_keys_for_order` (Postgres, `FOR UPDATE SKIP LOCKED`) which
  atomically assigns one available encrypted key per item.
- If key inventory is short, the order moves to `processing` and the admin can
  import keys then press **Retry delivery**.

### Digital key delivery (encrypted at rest)

- Keys are stored `AES-256-GCM` encrypted (`digital_keys.key_ciphertext`,
  secret from `KEY_ENCRYPTION_SECRET`).
- Plaintext exists only inside a server-side decrypt path for:
  the buyer's own delivered order page (key table is RLS-deny-all even to
  authenticated clients) and the admin's delivery view.
- Allocation is race-safe: concurrent checkouts cannot double-sell a key.
- Production delivery_type products deliver automatically at verification;
  manual products are fulfilled through the admin Orders screen.

### Admin dashboard (`/admin`, role + optionally MFA gated)

Overview · Orders (+ verify/reject payment, retry delivery) · Payments queue
(with signed private proof screenshots) · Products (variant editor) ·
Categories · Inventory (CSV/bulk encrypted key import) · Customers (role
management) · Top-up requests · Coupons · Reports · Settings (payment
instructions, exchange rate) · Audit logs · MFA (TOTP enroll/verify/unenroll).

Every admin mutation writes to `audit_logs`.

---

## Quickstart

Requirements: Node 20+, Docker Desktop (for Supabase CLI stack), Supabase CLI.

```bash
npm install
supabase start        # local Postgres/Auth/Storage/Studio stack
npm run env:local     # (re)generate .env.local from supabase status
npm run db:reset      # apply migrations + dev seed
npm run db:types      # regenerate canonical DB types
npm run dev           # http://localhost:3000
```

Dev logins (created by `supabase/seed.sql`):

| Role     | Email                   | Password       |
| -------- | ----------------------- | -------------- |
| Admin    | `admin@gamingstore.dev` | `Admin123!`    |
| Customer | `customer@gamingstore.dev` | `Customer123!` |

> Production admin bootstrapping is a SQL/console task — see `SECURITY.md`.

## Scripts

| Script                 | Purpose                                        |
| ---------------------- | ---------------------------------------------- |
| `npm run dev`          | Dev server (Turbopack)                         |
| `npm run build`        | Production build                               |
| `npm run typecheck`    | `tsc --noEmit`                                 |
| `npm run lint`         | ESLint (`src`)                                 |
| `npm test`             | Vitest unit/integration tests                  |
| `npm run test:e2e`     | Playwright suite (system Chrome)               |
| `npm run db:reset`     | Recreate DB: migrations + seed                 |
| `npm run db:types`     | Regenerate `src/lib/database.types.ts`         |
| `npm run db:status`    | Show local Supabase URLs/keys                  |

## Money rules (critical)

- TND is stored as **millimes** (1 TND = 1000 millimes), USD as **cents**.
  Integer minor units everywhere — never floats, all math through
  `src/lib/money.ts`.
- The exchange rate is an admin setting; each order stores its own snapshot
  and currency and nothing ever converts an order after creation.

## Repository layout

See the "Directory map" section of [`AGENTS.md`](./AGENTS.md).

## Tests

18 Playwright e2e tests (catalog, auth/guards, the full checkout → manual
verification → automatic key delivery flow, and direct PostgREST RLS privacy
proofs) plus 23 Vitest unit/integration tests. See [`TESTING.md`](./TESTING.md).

## Deployment

Deployment is intentionally **not automated here** — before going live:

1. Provision a hosted Supabase project, run `supabase/migrations` in order.
2. Set all env vars from `.env.example` (real `KEY_ENCRYPTION_SECRET` and
   service role key, `NEXT_PUBLIC_SITE_URL` matching deployment).
3. Set `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` on the
   server runtime only (the anon key is safe in the client bundle; the service
   role key is not and must never be).
4. Bootstrap the first admin via SQL (`profiles.role = 'admin'`), enable MFA
   immediately, then verify with the audit log.
5. Review the production checklist in [`SECURITY.md`](./SECURITY.md).
