-- ============================================================================
-- GamingStore — 0009: record the off-site payment method on each order
-- Payments are arranged outside the site; the admin records WHICH method the
-- customer used (D17, Flouci, cash, WafaCash, other) when marking payment
-- received, so every order shows how it was paid.
-- ============================================================================

alter table public.orders
  add column payment_method payment_method null;
