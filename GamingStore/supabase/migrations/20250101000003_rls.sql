-- ============================================================================
-- GamingStore — 0003: Row Level Security
-- Enabled on ALL exposed tables. Security definer functions are the ONLY way
-- to insert orders; digital_keys are never readable through RLS by anyone
-- (plaintext delivered only via trusted server flow after payment verification).
-- ============================================================================

alter table public.profiles        enable row level security;
alter table public.categories      enable row level security;
alter table public.products        enable row level security;
alter table public.product_variants enable row level security;
alter table public.digital_keys    enable row level security;
alter table public.coupons         enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;
alter table public.payments        enable row level security;
alter table public.payment_proofs  enable row level security;
alter table public.deliveries      enable row level security;
alter table public.topup_requests  enable row level security;
alter table public.exchange_rates  enable row level security;
alter table public.store_settings  enable row level security;
alter table public.audit_logs      enable row level security;

-- ── profiles ─────────────────────────────────────────────────────────────────
drop policy if exists p_profiles_self on public.profiles;
create policy p_profiles_self on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_staff_if_admin());

-- role and mfa_enforced can NEVER be changed by the user themselves —
-- with-check enforces equality with the stored values:
drop policy if exists p_profiles_self_update on public.profiles;
create policy p_profiles_self_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from public.profiles where id = auth.uid())
    and mfa_enforced = (select mfa_enforced from public.profiles where id = auth.uid())
  );

-- ── catalog: public read, staff/admin write ──────────────────────────────────
drop policy if exists p_categories_read on public.categories;
create policy p_categories_read on public.categories
  for select to public using (is_active or public.is_staff_if_admin());

drop policy if exists p_categories_write on public.categories;
create policy p_categories_write on public.categories
  for all to authenticated
  using (public.is_staff_if_admin()) with check (public.is_staff_if_admin());

drop policy if exists p_products_read on public.products;
create policy p_products_read on public.products
  for select to public
  using (status = 'active' or public.is_staff_if_admin());

drop policy if exists p_products_write on public.products;
create policy p_products_write on public.products
  for all to authenticated
  using (public.is_staff_if_admin()) with check (public.is_staff_if_admin());

drop policy if exists p_variants_read on public.product_variants;
create policy p_variants_read on public.product_variants
  for select to public
  using (public.is_staff_if_admin() or exists (
    select 1 from public.products
    where products.id = product_variants.product_id and products.status = 'active'
  ));

drop policy if exists p_variants_write on public.product_variants;
create policy p_variants_write on public.product_variants
  for all to authenticated
  using (public.is_staff_if_admin()) with check (public.is_staff_if_admin());

-- ── digital_keys: NO direct read/write for anyone through RLS ────────────────
-- Access only via service role (server-side, after verification) or the
-- dedicated SECURITY DEFINER functions.
drop policy if exists p_keys_deny_all on public.digital_keys;
create policy p_keys_deny_all on public.digital_keys
  for select to public using (false);

-- ── orders: customer reads own; creates via place_order function ─────────────
drop policy if exists p_orders_select_own on public.orders;
create policy p_orders_select_own on public.orders
  for select to authenticated
  using (profile_id = auth.uid() or public.is_staff_if_admin());

drop policy if exists p_orders_update_staff on public.orders;
create policy p_orders_update_staff on public.orders
  for update to authenticated
  using (public.is_staff_if_admin()) with check (public.is_staff_if_admin());

-- ── order_items ──────────────────────────────────────────────────────────────
drop policy if exists p_order_items_select on public.order_items;
create policy p_order_items_select on public.order_items
  for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_items.order_id and (o.profile_id = auth.uid() or public.is_staff_if_admin())
  ));

-- ── payments ────────────────────────────────────────────────────────────────
drop policy if exists p_payments_select on public.payments;
create policy p_payments_select on public.payments
  for select to authenticated
  using (public.is_staff_if_admin() or exists (
    select 1 from public.orders o
    where o.id = payments.order_id and o.profile_id = auth.uid()
  ));

drop policy if exists p_payments_insert_own on public.payments;
create policy p_payments_insert_own on public.payments
  for insert to authenticated
  with check (exists (
    select 1 from public.orders o
    where o.id = payments.order_id
      and o.profile_id = auth.uid()
      and o.status in ('pending_payment','payment_submitted')
  ));

drop policy if exists p_payments_update_staff on public.payments;
create policy p_payments_update_staff on public.payments
  for update to authenticated
  using (public.is_staff_if_admin()) with check (public.is_staff_if_admin());

-- ── payment_proofs ──────────────────────────────────────────────────────────
drop policy if exists p_proofs_select on public.payment_proofs;
create policy p_proofs_select on public.payment_proofs
  for select to authenticated
  using (public.is_staff_if_admin() or exists (
    select 1 from public.orders o
    join public.payments p on p.order_id = o.id
    where p.id = payment_proofs.payment_id and o.profile_id = auth.uid()
  ));

drop policy if exists p_proofs_insert_own on public.payment_proofs;
create policy p_proofs_insert_own on public.payment_proofs
  for insert to authenticated
  with check (exists (
    select 1 from public.payments p
    join public.orders o on o.id = p.order_id
    where p.id = payment_proofs.payment_id
      and o.profile_id = auth.uid()
      and payment_proofs.uploaded_by = auth.uid()
  ));

drop policy if exists p_proofs_admin on public.payment_proofs;
create policy p_proofs_admin on public.payment_proofs
  for update to authenticated
  using (public.is_staff_if_admin()) with check (public.is_staff_if_admin());

-- ── deliveries ──────────────────────────────────────────────────────────────
drop policy if exists p_deliveries_select on public.deliveries;
create policy p_deliveries_select on public.deliveries
  for select to authenticated
  using (exists (
    select 1 from public.orders o
    join public.order_items oi on oi.order_id = o.id
    where oi.id = deliveries.order_item_id
      and (o.profile_id = auth.uid() or public.is_staff_if_admin())
  ));

-- ── topup_requests ──────────────────────────────────────────────────────────
drop policy if exists p_topups_select on public.topup_requests;
create policy p_topups_select on public.topup_requests
  for select to authenticated
  using (profile_id = auth.uid() or public.is_staff_if_admin());

drop policy if exists p_topups_insert_own on public.topup_requests;
create policy p_topups_insert_own on public.topup_requests
  for insert to authenticated
  with check (profile_id = auth.uid());

drop policy if exists p_topups_staff on public.topup_requests;
create policy p_topups_staff on public.topup_requests
  for update to authenticated
  using (public.is_staff_if_admin()) with check (public.is_staff_if_admin());

-- ── exchange_rates / store_settings: public read, staff write ────────────────
drop policy if exists p_rates_read on public.exchange_rates;
create policy p_rates_read on public.exchange_rates
  for select to public using (true);

drop policy if exists p_rates_write on public.exchange_rates;
create policy p_rates_write on public.exchange_rates
  for all to authenticated
  using (public.is_staff_if_admin()) with check (public.is_staff_if_admin());

drop policy if exists p_settings_read on public.store_settings;
create policy p_settings_read on public.store_settings
  for select to public using (true);

drop policy if exists p_settings_write on public.store_settings;
create policy p_settings_write on public.store_settings
  for all to authenticated
  using (public.is_staff_if_admin()) with check (public.is_staff_if_admin());

-- ── coupons: no public read; staff only ─────────────────────────────────────
drop policy if exists p_coupons_staff on public.coupons;
create policy p_coupons_staff on public.coupons
  for all to authenticated
  using (public.is_staff_if_admin()) with check (public.is_staff_if_admin());

-- ── audit_logs: admin read-only, insert via functions only ──────────────────
drop policy if exists p_audit_admin_read on public.audit_logs;
create policy p_audit_admin_read on public.audit_logs
  for select to authenticated
  using (public.is_admin());

-- ── storage buckets ─────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, avif_autodetection, allowed_mime_types, file_size_limit)
values ('payment-proofs', 'payment-proofs', false, true,
        array['image/jpeg','image/png','image/webp','application/pdf'], 5242880)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- customers may upload into their own folder only; objects never publicly listed
drop policy if exists p_storage_proof_upload on storage.objects;
create policy p_storage_proof_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists p_storage_proof_select on storage.objects;
create policy p_storage_proof_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'payment-proofs'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff_if_admin())
  );

drop policy if exists p_storage_image_read on storage.objects;
create policy p_storage_image_read on storage.objects
  for select to public using (bucket_id = 'product-images');

drop policy if exists p_storage_image_upload on storage.objects;
create policy p_storage_image_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_staff_if_admin());
