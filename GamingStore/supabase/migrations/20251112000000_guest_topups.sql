-- ============================================================================
-- GamingStore — 0007: guest top-up requests
-- The storefront has no client accounts (0006). Top-up requests (RedotPay /
-- Binance / Rizon) now work for guests: profile_id becomes nullable and the
-- customer's contact details are stored on the request row itself.
-- Guests cannot touch this table directly — the server action inserts with
-- the service-role client (same pattern as guest payment submissions).
-- ============================================================================

alter table public.topup_requests
  alter column profile_id drop not null;

alter table public.topup_requests
  add column customer_name text,
  add column contact_email text,
  add column contact_phone text;

-- Guests have no profiles: the authenticated insert-own policy is meaningless
-- now. The server action writes through the service-role client; anon/authed
-- clients keep read access limited to own rows / staff (unchanged).
drop policy if exists p_topups_insert_own on public.topup_requests;
