-- ============================================================================
-- GamingStore — 0001: core schema
-- Tables, enums, indexes and constraints.
-- Monetary values are ALWAYS integer minor units:
--   TND → millimes (1/1000), USD → cents (1/100)
-- ============================================================================

create extension if not exists pgcrypto;

-- ── Enums ────────────────────────────────────────────────────────────────────
create type user_role           as enum ('customer', 'staff', 'admin');
create type product_status      as enum ('draft', 'active', 'inactive');
create type delivery_type       as enum ('manual', 'automatic');
create type currency_code       as enum ('TND', 'USD');
create type order_status        as enum ('pending_payment','payment_submitted','payment_verified','processing','completed','cancelled','refunded','delivery_failed');
create type item_delivery_status as enum ('pending','processing','delivered','failed');
create type payment_method      as enum ('redotpay','binance','d17_edinar','other');
create type payment_status      as enum ('pending','submitted','verified','rejected','refunded');
create type key_status          as enum ('available','reserved','sold','revoked');
create type delivery_method     as enum ('automatic','manual');
create type coupon_type         as enum ('percentage','fixed');
create type topup_service       as enum ('redotpay','binance','rizon','other');
create type topup_status        as enum ('submitted','processing','completed','rejected');

-- ── profiles ─────────────────────────────────────────────────────────────────
-- 1:1 with auth.users; role can ONLY be changed by trusted server-side SQL
-- (no client-facing update path).
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  full_name     text,
  phone         text,
  role          user_role not null default 'customer',
  mfa_enforced  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_profiles_role on public.profiles(role);

-- ── categories ───────────────────────────────────────────────────────────────
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  image_url   text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

-- ── products ─────────────────────────────────────────────────────────────────
create table public.products (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references public.categories(id) on delete restrict,
  name          text not null,
  slug          text not null unique,
  description   text,
  image_url     text,
  platform      text,
  region        text,
  delivery_type delivery_type not null default 'manual',
  status        product_status not null default 'draft',
  is_featured   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint products_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index idx_products_category on public.products(category_id);
create index idx_products_status on public.products(status);
create index idx_products_featured on public.products(is_featured) where is_featured;
create index idx_products_search on public.products using gin (to_tsvector('simple', name || ' ' || coalesce(description, '')));

-- ── product_variants ─────────────────────────────────────────────────────────
create table public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  label       text not null,
  sku         text not null unique,
  price_tnd   bigint not null check (price_tnd >= 0),
  price_usd   bigint not null check (price_usd >= 0),
  -- null stock → managed by digital_keys inventory; integer → counted units
  stock       integer check (stock is null or stock >= 0),
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_variants_product on public.product_variants(product_id);

-- ── digital_keys ─────────────────────────────────────────────────────────────
-- `key_ciphertext` is AES-256-GCM (server-side envelope, secret in env).
-- No plaintext key is ever stored or served outside delivery flows.
create table public.digital_keys (
  id             uuid primary key default gen_random_uuid(),
  variant_id     uuid not null references public.product_variants(id) on delete cascade,
  key_ciphertext text not null,
  status         key_status not null default 'available',
  order_item_id  uuid, -- FK added after order_items exist (see below)
  batch          text,
  reserved_at    timestamptz,
  sold_at        timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_keys_variant_status on public.digital_keys(variant_id, status);
create unique index uq_keys_order_item on public.digital_keys(order_item_id) where order_item_id is not null;

-- ── coupons ──────────────────────────────────────────────────────────────────
create table public.coupons (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique,
  type              coupon_type not null,
  -- percentage: 1..100 (whole %). fixed: minor units in `currency`.
  value             bigint not null check (value > 0),
  currency          currency_code,
  min_order_amount  bigint,
  max_uses          integer,
  used_count        integer not null default 0,
  is_active         boolean not null default true,
  starts_at         timestamptz,
  expires_at        timestamptz,
  created_at        timestamptz not null default now(),
  constraint coupons_pct_range check (type <> 'percentage' or value between 1 and 100),
  constraint coupons_fixed_currency check (type <> 'fixed' or currency is not null)
);

-- ── orders ───────────────────────────────────────────────────────────────────
create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     text not null unique,
  profile_id       uuid references public.profiles(id) on delete set null,
  currency         currency_code not null,
  status           order_status not null default 'pending_payment',
  subtotal_amount  bigint not null check (subtotal_amount >= 0),
  discount_amount  bigint not null default 0 check (discount_amount >= 0),
  total_amount     bigint not null check (total_amount >= 0),
  exchange_rate    numeric(18,6), -- snapshot used at checkout, null if no conversion applied
  coupon_id        uuid references public.coupons(id) on delete set null,
  customer_name    text not null,
  customer_email   text not null,
  customer_phone   text,
  customer_note    text,
  admin_notes      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint orders_totals_consistent check (total_amount = subtotal_amount - discount_amount)
);

create index idx_orders_profile on public.orders(profile_id);
create index idx_orders_status on public.orders(status);
create index idx_orders_created on public.orders(created_at desc);

-- ── order_items ──────────────────────────────────────────────────────────────
create table public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  variant_id      uuid references public.product_variants(id) on delete set null,
  product_title   text not null,
  variant_label   text not null,
  platform        text,
  region          text,
  unit_price      bigint not null check (unit_price >= 0),
  quantity        integer not null check (quantity between 1 and 100),
  line_total      bigint not null check (line_total >= 0),
  requires_key    boolean not null default false,
  delivery_status item_delivery_status not null default 'pending',
  delivered_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index idx_order_items_order on public.order_items(order_id);
create index idx_order_items_variant on public.order_items(variant_id);
create index idx_order_items_pending_keys on public.order_items(order_id) where requires_key and delivery_status = 'pending';

-- now the FK from digital_keys → order_items can be declared
alter table public.digital_keys
  add constraint fk_keys_order_item foreign key (order_item_id) references public.order_items(id) on delete set null;

-- ── payments ─────────────────────────────────────────────────────────────────
create table public.payments (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders(id) on delete cascade,
  method         payment_method not null,
  amount         bigint not null check (amount >= 0),
  currency       currency_code not null,
  reference      text, -- customer-supplied transaction reference
  status         payment_status not null default 'pending',
  verified_by    uuid references public.profiles(id) on delete set null,
  verified_at    timestamptz,
  rejected_reason text,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_payments_order on public.payments(order_id);
create index idx_payments_status on public.payments(status);
-- only ONE verified payment per order — makes duplicate processing impossible
create unique index uq_payments_verified on public.payments(order_id) where status = 'verified';

-- ── payment_proofs ───────────────────────────────────────────────────────────
create table public.payment_proofs (
  id            uuid primary key default gen_random_uuid(),
  payment_id    uuid not null references public.payments(id) on delete cascade,
  storage_path  text not null,
  mime_type     text not null check (mime_type in ('image/jpeg','image/png','image/webp','application/pdf')),
  size_bytes    integer not null check (size_bytes <= 5242880),
  checksum      text,
  uploaded_by   uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index idx_proofs_payment on public.payment_proofs(payment_id);

-- ── deliveries ───────────────────────────────────────────────────────────────
create table public.deliveries (
  id            uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  key_id        uuid references public.digital_keys(id) on delete set null,
  method        delivery_method not null,
  content       text, -- manual: fulfillment details entered by staff; automatic: filled with masked reference
  delivered_by  uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index idx_deliveries_item on public.deliveries(order_item_id);

-- ── topup_requests ───────────────────────────────────────────────────────────
-- Charging services (RedotPay / Binance / Rizon / other).
-- Collects ONLY service identifiers (phone/account id) — never secrets,
-- never seed phrases, never passwords, never private keys.
create table public.topup_requests (
  id             uuid primary key default gen_random_uuid(),
  order_number   text not null unique,
  profile_id     uuid not null references public.profiles(id) on delete cascade,
  service        topup_service not null,
  recipient_ref  text not null, -- account phone number / UID — never a secret
  amount         bigint not null check (amount > 0),
  currency       currency_code not null,
  fee_amount     bigint not null default 0 check (fee_amount >= 0),
  total_amount   bigint not null check (total_amount > 0),
  payment_method payment_method not null,
  reference      text,
  status         topup_status not null default 'submitted',
  admin_notes    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint topup_total_consistent check (total_amount = amount + fee_amount)
);

create index idx_topups_profile on public.topup_requests(profile_id);
create index idx_topups_status on public.topup_requests(status);

-- ── exchange_rates ───────────────────────────────────────────────────────────
-- Historical rates; the active rate is the latest row (base USD → quote TND).
create table public.exchange_rates (
  id             uuid primary key default gen_random_uuid(),
  base           currency_code not null,
  quote          currency_code not null,
  rate           numeric(18,6) not null check (rate > 0),
  effective_from timestamptz not null default now(),
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  constraint uq_rate_effective unique (base, quote, effective_from)
);

-- ── store_settings ───────────────────────────────────────────────────────────
create table public.store_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

-- ── audit_logs ───────────────────────────────────────────────────────────────
create table public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles(id) on delete set null,
  action      text not null,
  entity_type text,
  entity_id   uuid,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index idx_audit_actor on public.audit_logs(actor_id);
create index idx_audit_entity on public.audit_logs(entity_type, entity_id);
create index idx_audit_created on public.audit_logs(created_at desc);

-- ── updated_at maintenance ───────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','categories','products','product_variants','digital_keys','orders','payments','topup_requests']
  loop
    execute format('create trigger trg_%s_updated before update on public.%I
                    for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;
