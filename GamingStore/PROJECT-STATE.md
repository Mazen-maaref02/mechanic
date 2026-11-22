# PROJECT-STATE — handoff for any new session

> New agent: read `AGENTS.md` first, then THIS file, then continue from
> "Next steps". Do not start over; everything below is already done and live.

## What this is
Digital gaming e-commerce platform "TuniXpay" (formerly GamingStore/NexLevel) —
Next.js 16 + Supabase + Vercel. Lives in `C:\Users\spirit\garagepro\GamingStore`
(never touch the parent `garagepro` app).

## ⚠️ Version control status (2026-11-13)
The `garagepro` git repo has NO tracked files — the whole GamingStore tree is
untracked (history is from an unrelated dashboard project). No git safety net.
Consider `git init` inside GamingStore + an initial commit ASAP.

## Live state (verified, do not redo)
- **Production:** https://tunixpay.vercel.app (health: `/api/health` → `{"status":"ok","db":"ok"}`)
- **Supabase project:** `hpjotozzaupyvyukjspi` (hosted) — MCP tools available under `tools.supabase.*` (execute_sql, apply_migration, …)
- **Migrations 0001–0008 pushed.** 0007 = guest top-up requests. **0008
  (20251112000100_accounts_delivery_email) = accounts back + delivery email +
  no stock limits:**
  - `orders.delivery_email text not null default ''` — the address the
    key/code is SENT to (chosen at checkout; may differ from contact email).
  - `place_order` rewritten: NO stock checks/decrements (owner fulfills every
    order manually), `requires_key = products.delivery_type = 'automatic'`,
    captures `p_delivery_email`. Profile link kept via `auth.uid()`.
- **Customer accounts are BACK (owner decision 2026-11-12):** checkout
  requires sign-in ("register every client into the database").
  - Restored: `/register`, `LoginForm`+`RegisterForm` in
    `components/store/auth-forms.tsx`, `/account` dashboard (orders inline),
    register/reset actions in `actions/auth.ts` (customers redirect
    `/account` after login), `requireUser` in `lib/auth/session.ts`
    (redirects `/login?next=…`), schemas in `validation/schemas.ts`
    (register/reset/profile + `deliveryEmail` in checkoutSchema).
  - Middleware protects `/admin` AND `/account`; `/checkout` calls
    `requireUser("/checkout")` server-side and prefills from the profile.
  - `/login` page copy: sign-in is for checkout/order history (not admin-only).
- **Payment methods = D17 / Flouci / Cash / WafaCash only** (`lib/payment-methods.ts`
  canonical keys `d17_edinar, flouci, cash, wafacash`; DB enum already had
  them; legacy `redotpay`/`binance` exist in the enum only to label old rows —
  rejected by `paymentMethodSchema`). Payment form + top-up form + Admin →
  Settings all updated. Placeholder receivers "000000000" still in
  `store_settings.payment_methods` — owner must set real IDs.
- **Payments are OFF-SITE (owner decision 2026-11-13):** clients never pay on
  the site. Checkout → order placed → `/payment/[orderId]` is now an ORDER
  CONFIRMATION page ("nothing to pay now, the team contacts you"); no
  reference submission form (PaymentForm/submitPaymentAction unused by the
  storefront, kept in code). Admin confirms with the client directly, clicks
  **Payment received** (`OrderStatusControls`, uses setOrderStatusAction →
  `payment_verified`) in Admin → Orders → [order], then delivers via the
  Fulfillment section (manual text or automatic key allocation); delivery
  auto-completes the order and emails the key to `delivery_email`. The
  `/admin/payments` page is obsolete (always empty). D17/Flouci/Cash/WafaCash
  in Admin → Settings are now just reference info for the team; receivers are
  placeholders ("000000000") — update or leave, nothing enforces them.
- **Checkout flow:** login → checkout (contact details + **receiving email**
  field under the summary order list, defaults to account email) →
  order-confirmation page → admin contacts client → payment off-site →
  admin marks paid + delivers; key-email goes to
  `orders.delivery_email || customer_email` (`queueKeyDeliveryEmail` in
  `actions/admin.ts`). Keys visible in track-order + account.
- **Owner admin account EXISTS in production:** auth.users uid
  `479ba02c-92e2-4d6d-9fd9-e69dfb3290a7`, email `mazenmaaref@gmail.com`,
  `profiles.role='admin'`. Password is the owner's choice (ask the owner,
  do NOT store it here). Sign-in verified via REST (200 + session). Fix used:
  manually inserted auth rows must have `confirmation_token`/`recovery_token`
  = `''` (not NULL) or GoTrue returns 500 "Database error querying schema".
  Owner should enroll TOTP: sign in → Admin → MFA.
- **Top-up requests stay guest-based** (`TR-…` numbers, contact details on
  the row, IP rate limit) — login is NOT required to request a top-up.
- **Verified 2026-11-13:** tsc clean, eslint clean, 30/30 vitest, `npm run build` OK.
- **Catalog seeded in production:** 9 products / 15 variants (slugs+SKUs match `supabase/seed.sql`).
- **Images:** in `product-images` bucket (public): steam, playstation, xbox, fortnite=Epic logo, rockstar, binance → `https://hpjotozzaupyvyukjspi.supabase.co/storage/v1/object/public/product-images/<name>.png`. Products WITHOUT images: It Takes Two, RedotPay, Rizon (all fallbacks failed).
- **Store settings + exchange rate 3.10 USD→TND** inserted in production.
- **Email verification removed project-wide** via Management API (`PATCH /v1/projects/hpjotozzaupyvyukjspi/config/auth` `{"mailer_autoconfirm": true}` — verified true). Sign-in needs no email confirmation.
- **Order notifications implemented & deployed:** `src/lib/notify/order-notify.ts` (pure builders + env-gated Brevo email + CallMeBot WhatsApp, `after()`-scheduled in `src/app/actions/checkout.ts`, never blocks/fails checkout).
- **Security incident fixed:** 10 leftover PascalCase legacy tables (Service, Session, …) had no RLS + public API access → granted revoked for anon/authenticated (data preserved). **Pending user decision:** keep hidden / export / drop.
- **Legacy table data counts:** 115 services, 251 packages, 14 audit rows, etc.

## Credentials & where they live (do NOT put secrets in this repo)
- **Vercel:** project `tunixpay` (mazen-maaref02s-projects). Deploy:
  `npx vercel deploy --prod --yes --token <USER PASTES VERCEL TOKEN>` (token provided by user in-session; verify env with `npx vercel env ls`).
- **Production env vars already set on Vercel (all 5):**
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `KEY_ENCRYPTION_SECRET`, `NEXT_PUBLIC_SITE_URL=https://tunixpay.vercel.app`.
- **Supabase secret key** (for Storage/admin REST): in `.env.local` / Vercel env (`sb_secret_…`).
- **Supabase access token** (Management API + MCP): already in `~/.config/opencode/opencode.json` (global MCP config).
- **Notification env vars NOT set anywhere yet** (that's the pending work): `BREVO_API_KEY`, `NOTIFY_EMAIL_TO=mazenmaaref@gmail.com`, `NOTIFY_EMAIL_FROM=mazenmaaref@gmail.com`, `CALLMEBOT_API_KEY`, `NOTIFY_WHATSAPP_TO=21654471843`.
- Owner email: mazenmaaref@gmail.com — owner WhatsApp: +216 54471843.

## Next steps (in order)
1. **Deploy this session's work (needs USER's Vercel token):** `npx vercel deploy --prod --yes --token <TOKEN>` from `GamingStore/`. Migration 0008 is ALREADY applied to production, so the deploy is safe to do at any time. Code is expected to be deployed from GamingStore's own git repo once created (see version-control note) — otherwise deploy from the working tree.
2. **Owner sign-in + MFA (owner action):** sign in at https://tunixpay.vercel.app/login with the owner's credentials → Admin → MFA → enroll TOTP. Password resets go through the agent/Supabase dashboard (no forgot-password page restored).
3. **Brevo API key (user action):** register free at app.brevo.com with the Gmail → click Brevo's verification email in their inbox (mandatory: verifies `mazenmaaref@gmail.com` as sender) → SMTP & API → API key (v3) → paste to agent. Agent then: `npx vercel env add BREVO_API_KEY production`, same for `NOTIFY_EMAIL_TO`/`NOTIFY_EMAIL_FROM`, redeploy, test-send an email.
4. **CallMeBot apiKey (user action from their phone):** WhatsApp "I allow callmebot to send me messages" to **+34 644 51 95 23** → they reply with apiKey → paste to agent. Agent adds `CALLMEBOT_API_KEY` + `NOTIFY_WHATSAPP_TO` to Vercel prod, redeploy, test-send.
5. **Verify live notifications end-to-end:** place a real order on production (sign in first — checkout requires it); confirm the key email arrives at the RECEIVING email entered at checkout, and the WhatsApp message arrives with all order fields.
6. **Payment receiving config (optional now):** payments are off-site, so the D17/Flouci/WafaCash receivers in Admin → Settings are only reference text for the team. Update them with real IDs if you want customers to see them on the order-confirmation page instructions — nothing enforces or validates them.
7. **Delivery flow without stock:** no key inventory is required to order. For `automatic` products the admin can still import keys (Admin → Inventory) and `Retry automatic delivery` allocates them; otherwise use **Fulfill → Manual fulfillment** (paste the key/code/top-up note) — it auto-completes the order and emails the customer at `delivery_email`.
8. **Legacy bare tables:** user must decide: keep hidden (current state) / export data / drop. Then execute.
9. Optional cleanup: `scripts/fetch-product-images*.mjs`, first image unknown-product fallback; find a real "It Takes Two" image.

## Gotchas that cost time (read before acting)
- **DB types:** only via `npm run db:types`. supabase-js v2.119 quirks: optional SQL args, snake_case mapping, `mfa.verify` needs factorId+challengeId, `enroll` returns `totp.uri`.
- **Vercel build failure mode #1:** dep declared in code but not in `package.json` → typecheck fails on remote only. Local build with clean env reproduced it once.
- **Playwright:** uses system Chrome (`channel: "chrome"`). RLS tests use raw fetch to PostgREST; deny-all = HTTP 200 + zero rows (assert zero rows).
- **Rate limiting** is bypassed when `NODE_ENV !== "production"` (dev/e2e convenience).
- **Money:** integer minor units only (TND millimes, USD cents) through `lib/money.ts`.
- **Never edit applied migrations**; DB types + `npm run db:types` after any schema change.
- Windows PowerShell: no `??` operator in one-liners; use node scripts for JSON APIs.
- Local dev stack: `supabase start` + `npm run env:local` + `npm run db:reset` + `npm run dev`.
- local agent-generated help scripts may appear in `scripts/`; they are fine to leave.
