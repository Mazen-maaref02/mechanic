# GamingStore — Agent & Developer Guide

> **Read this before touching anything.** This document is the single source of
> truth for architecture, security rules and verification procedures.

## Project overview

NexLevel Gaming Store — a production-oriented digital gaming e-commerce platform
(gift cards, Steam/Epic/Xbox/PSN keys, RedotPay / Binance / Rizon charging
services) targeting Tunisia (TND) and international markets (USD).

Stack: **Next.js 16 (App Router, Turbopack)** · **React 19** · **TypeScript
strict** · **Tailwind CSS 4** · **Framer Motion** · **Supabase**
(PostgreSQL + Auth + Storage) · **Zod** · **React Hook Form** · **Vitest** ·
**Playwright**.

## Directory map

```
src/
  app/
    (storefront)/          # public-facing site (shared header/footer layout)
    admin/                 # admin dashboard (sidebar layout, strict guards)
    api/                   # only webhooks/health live here; logic in server actions
    actions/               # server actions (auth, cart, checkout, admin ops)
  components/
    ui/                    # primitives (button, field, badge, modal…) — no business logic
    store/                 # storefront-specific components
    admin/                 # admin-specific components
  lib/
    auth/                  # session/role guards (getCurrentUser, requireAdmin …)
    catalog/               # product queries, exchange rate
    security/              # key encryption, rate limiting, file validation
    supabase/              # client.ts (browser) / server.ts (cookies) / admin.ts (service role)
    validation/schemas.ts  # every zod schema — single source of inputs
    money.ts               # integer minor-unit money (TND millimes, USD cents)
  middleware.ts            # session refresh + light route gating
supabase/
  migrations/              # SQL schema — append-only, never edit applied migrations
  seed.sql                 # dev seed (local only)
scripts/                   # local env bootstrap, seed helpers
```

## Hard rules

1. **Never trust the client.** Prices, totals, roles, payment status, inventory
   are always computed/validated server-side (DB or privileged functions).
2. **Money is integer minor units.** TND → millimes (1/1000 K)? no: 1 TND =
   1000 millimes; USD → cents (1/100 $). Never use floats. All math through
   `lib/money.ts`.
3. **Order currency is immutable.** An order stores its currency + exchange-rate
   snapshot at creation; nothing silently converts it later.
4. **Digital keys are opaque.** `digital_keys.key_ciphertext` is AES-256-GCM
   (`lib/security/key-cipher.ts`, secret from `KEY_ENCRYPTION_SECRET` env).
   Plaintext exists only in a server-layer decrypt path for the owner's order
   page or the admin's delivery view. No keys in logs, no keys in public APIs,
   no keys in the React tree beyond the owner's own delivered item.
5. **Payments are manual-verified.** A screenshot is never sufficient. Admin
   verifies via the dashboard against their own RedotPay/Binance/D17 dashboard.
   There is NO automatic payment detection and NO crypto custody code.
6. **RLS everywhere.** All tables have RLS; digital_keys deny-all to clients.
   Role changes happen exclusively server-side (`profiles.role` is not
   writable by any user-facing path). Admin bootstrapping is a console/SQL task.
7. **Server actions validate via zod, then rate-limit, then authorize.**
   Guards order: rate limit → input schema → auth (`requireUser`/`requireAdmin`).
8. **Every mutation writes an audit trail** (`audit_logs` via `audit()` or
   service-role inserts).
9. **Server-first.** Server Components by default; `"use client"` only for
   interactivity (cart, forms, animations, filters). No data-fetching in
   browsers except public catalog data.
10. **Destructive admin actions require confirmation dialogs** and write audit entries.

## Phases & verification discipline

| Phase | Scope | Gate |
|-------|-------|------|
| 1 | Scaffold, design tokens, DB schema, seed, docs | `tsc` + lint + `supabase db reset` |
| 2 | Storefront shell (header/footer/home/listings/product) | dev server + Playwright smoke |
| 3 | Cart, checkout, payment submission | unit tests (money, schema) + e2e checkout |
| 4 | Auth, accounts, order tracking, RLS proof | e2e registration/login + RLS SQL tests |
| 5 | Payment verification + delivery engine | e2e admin verify → key delivered |
| 6 | Admin dashboard (all modules) | e2e: product CRUD, guard tests |
| 7 | Inventory: encrypted keys, CSV import, concurrency | SQL race tests (`FOR UPDATE SKIP LOCKED`) |
| 8 | Security hardening + full test suite | lint + tsc + vitest + Playwright + audit |
| 9 | Deployment docs, CI, env templates | production build |

Run gates locally: `npm run typecheck`, `npm run lint`, `npm test`,
`npm run test:e2e`, `npm run build`.

## Local development

```bash
npm install
supabase start        # local stack (needs Docker)
npm run env:local     # writes .env.local from `supabase status` (see scripts/)
npm run db:reset      # applies migrations + seed.sql
npm run db:types      # regenerate canonical DB types
npm run dev           # http://localhost:3000
```

Dev logins (created by seed.sql): `admin@gamingstore.dev / Admin123!`,
`customer@gamingstore.dev / Customer123!`.

## Security invariants (checked by tests, not vibes)

- Customer A cannot read/act on customer B's orders (RLS + server guards).
- Anonymous users cannot read orders, payments, proofs, keys.
- Non-admin users cannot reach admin server actions (double-check in action).
- Pending order cannot have two verified payments (DB unique partial index).
- An order cannot be auto-delivered before `payment_verified` (SQL guard).
- Concurrent key allocation never double-sells (`FOR UPDATE SKIP LOCKED`).
- Uploaded proofs: MIME whitelist, 5MB cap, stored in private bucket,
  reachable only by owner/admin via signed URLs.
- No service-role key in any client bundle (`server-only` import discipline).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
