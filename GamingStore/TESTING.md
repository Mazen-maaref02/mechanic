# Testing guide

Everything below was executed as part of the final verification pass — all
gates are green. When you change something, re-run the relevant gates
**locally and read the results**; never claim a gate passed without having run
it.

## Gates

| Gate | Command | Status at last full pass |
| --- | --- | --- |
| Types | `npm run typecheck` | 0 errors |
| Lint | `npm run lint` | 0 problems |
| Unit/integration | `npm test` (Vitest) | 3 files / 23 tests passed |
| Production build | `npm run build` | success |
| E2E | `npm run test:e2e` (Playwright) | 18 tests passed |

Suggested order: `typecheck` → `lint` → `test` → `build` → `test:e2e`.

## What each suite proves

### Vitest unit tests (`src/**/*.test.ts`)

- `money.ts`: integer minor-unit math (TND millimes, USD cents), formatting,
  cross-currency conversion via snapshot rate — no float drift.
- Validation schemas: checkout payload shape (currency, contact, item cap),
  payment submission shape.
- Key cipher: AES-256-GCM encrypt/decrypt round-trip + tamper rejection
  (auth-tag) + truncation handling.

### Playwright e2e (`e2e/`, system Chrome, single worker, webServer on `/api/health`)

| Spec | Proves |
| --- | --- |
| `catalog.spec.ts` | Home hero + featured products render, shop listing shows seeded products, product detail exposes variant buy controls, unknown physical routes produce the branded 404 |
| `auth.spec.ts` | Anonymous `/admin` redirects to login; seeded customer signs in; customer cannot reach admin surfaces; seeded admin reaches the dashboard; admin sidebar lists all 12 modules |
| `order-flow.spec.ts` | **The full money path**: admin imports encrypted keys through the real Inventory UI → customer signs in, adds the `$10 USD` variant, checks out, places the order, registers a payment reference → admin sees it in the Payments queue and verifies → order completes with automatic key allocation → buyer opens their order page and reveals the *plaintext* key that was imported at step one |
| `rls.spec.ts` | Database-level privacy proofs over raw PostgREST (`fetch`), bypassing the app: anon reads only public catalog rows, orders/payments scoped strictly per customer, role escalation rejected (403), `digital_keys` deny-all even for a valid session, anon writes rejected |

The e2e suite is serial with shared credentials because it exercises real
state (seeded users + imported keys). Each `order-flow` run imports fresh
timestamped keys, so repeat runs stay independent.

## Test infrastructure notes (steal these)

- The browser project uses the **system Chrome channel** (`channel: "chrome"`
  in `playwright.config.ts`) — no browser download required.
- RLS tests deliberately use **raw `fetch` against PostgREST**, not
  supabase-js: the js client stores an `Authorization` header override in
  global client state which can leak `Bearer undefined` between signed-in
  clients and produce false PGRST301 failures.
- Deny-all RLS tables respond with HTTP 200 + `[]` — assertions check
  **zero rows**, not errors.
- Dev-mode vs production-mode differences that matter for tests:
  - React StrictMode double-runs mount effects in dev. `cart-context.tsx`
    hydration must therefore only persist after the hydrated values have
    **committed** (state-based `hydrated` flag, not a ref), otherwise a
    localStorage read can wipe a just-stored cart.
  - `checkout-view.tsx` fetches cart variant data in an effect keyed on
    `items` (mount happens pre-hydration; a `[]`-deps version renders
    "empty cart" on direct `/checkout` loads).
  - The client checkout form validates **contact fields only**
    (`checkoutSchema.omit({ items: true })`); `items` are injected at submit
    and authoritative validation happens in `placeOrderAction`.
- Rate limits don't apply to dev/e2e (`rateLimit()` short-circuits when
  `NODE_ENV !== "production"`) so repeated automated logins aren't throttled;
  production builds enforce the real windows.

## Useful commands

```bash
npm run test:e2e                              # whole suite
npx playwright test e2e/order-flow.spec.ts    # money path only
npx playwright show-report test-results       # reports/artifacts
npm test -- --watch                           # vitest watch
```

Playwright failure artifacts (traces + A11Y snapshots) land in
`test-results/<spec>-chrome/error-context.md` — the fastest way to diagnose a
failure. Clean them before committing (`test-results/` and `playwright-report/`
are git-ignored).
