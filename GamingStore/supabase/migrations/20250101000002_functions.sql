-- ============================================================================
-- GamingStore — 0002: functions & triggers
-- Profile bootstrap, order placement (validated SECURITY DEFINER transaction),
-- race-safe automatic key allocation, order-number generation, audit hooks.
-- ============================================================================

-- ── Auto-create profile on signup ────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Role helpers (stable + fast for RLS) ─────────────────────────────────────
create or replace function public.profile_role()
returns user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select true from public.profiles where id = auth.uid() and role = 'admin'), false);
$$;

create or replace function public.is_staff_if_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select true from public.profiles where id = auth.uid() and role in ('admin','staff')), false);
$$;

-- ── Audit helper ─────────────────────────────────────────────────────────────
create or replace function public.audit(p_action text, p_entity_type text default null, p_entity_id uuid default null, p_metadata jsonb default null)
returns void language sql security definer set search_path = public as $$
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_metadata);
$$;

-- ── Order status change audit ────────────────────────────────────────────────
create or replace function public.order_status_audit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.status is distinct from old.status) then
    insert into public.audit_logs (action, entity_type, entity_id, metadata)
    values ('order.status_change', 'order', new.id,
      jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  return new;
end $$;

drop trigger if exists trg_order_status_audit on public.orders;
create trigger trg_order_status_audit
  after update of status on public.orders
  for each row execute function public.order_status_audit();

-- ── Cancel / refund housekeeping: restock counted stock, revoke keys ────────
create or replace function public.order_release_inventory()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_order_id uuid := new.id;
begin
  if new.status not in ('cancelled','refunded') or old.status = new.status then
    return new;
  end if;

  -- return counted stock (variants with integer stock)
  update public.product_variants pv
  set stock = pv.stock + oi.quantity
  from public.order_items oi
  where oi.order_id = v_order_id
    and oi.variant_id = pv.id
    and pv.stock is not null;

  -- revoke any sold/reserved keys belonging to this order
  update public.digital_keys dk
  set status = 'available', order_item_id = null, reserved_at = null, sold_at = null
  where dk.order_item_id in (select id from public.order_items where order_id = v_order_id)
    and dk.status in ('sold','reserved');

  return new;
end $$;

drop trigger if exists trg_order_release on public.orders;
create trigger trg_order_release
  after update of status on public.orders
  for each row execute function public.order_release_inventory();

-- ── place_order ──────────────────────────────────────────────────────────────
-- Validates EVERYTHING against the database (prices are never trusted from
-- the client). Single transaction: order + items + coupon + stock decrement.
-- p_items: [{"variant_id":"...","quantity":2}, ...]
create or replace function public.place_order(
  p_currency    currency_code,
  p_items       jsonb,
  p_coupon_code text,
  p_name        text,
  p_email       text,
  p_phone       text,
  p_note        text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_variant    product_variants%rowtype;
  v_product    products%rowtype;
  v_item       jsonb;
  v_qty        integer;
  v_unit_price bigint;
  v_available  bigint;
  v_order_id   uuid;
  v_order_no   text;
  v_subtotal   bigint := 0;
  v_discount   bigint := 0;
  v_coupon     coupons%rowtype;
  v_coupon_id  uuid;
  v_line_total bigint;
begin
  if v_uid is null then
    raise exception 'auth_required';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_cart';
  end if;
  if p_currency not in ('TND','USD') then
    raise exception 'invalid_currency';
  end if;

  -- validate coupon up-front (row locked for the whole tx)
  if p_coupon_code is not null and length(trim(p_coupon_code)) > 0 then
    select * into v_coupon from public.coupons
    where lower(code) = lower(trim(p_coupon_code)) for update;
    if not found
      or v_coupon.is_active is false
      or (v_coupon.starts_at is not null and v_coupon.starts_at > now())
      or (v_coupon.expires_at is not null and v_coupon.expires_at < now())
      or (v_coupon.max_uses is not null and v_coupon.used_count >= v_coupon.max_uses) then
      raise exception 'invalid_coupon';
    end if;
    v_coupon_id := v_coupon.id;
  end if;

  -- generate order number (uniqueness enforced by constraint; app retries on collision)
  v_order_no := 'GS-' || to_char(now(),'YYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 6));

  insert into public.orders (
    order_number, profile_id, currency, status, subtotal_amount, discount_amount,
    total_amount, coupon_id, customer_name, customer_email, customer_phone, customer_note
  ) values (
    v_order_no, v_uid, p_currency, 'pending_payment', 0, 0, 0, v_coupon_id,
    p_name, p_email, p_phone, p_note
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;

    select * into v_variant from public.product_variants
    where id = (v_item->>'variant_id')::uuid for update;
    if not found then raise exception 'unknown_variant'; end if;

    select * into v_product from public.products where id = v_variant.product_id;
    if not found or v_product.status <> 'active' or v_variant.is_active is false then
      raise exception 'variant_unavailable';
    end if;

    v_unit_price := case p_currency when 'TND' then v_variant.price_tnd else v_variant.price_usd end;
    if v_unit_price is null or v_unit_price < 0 then
      raise exception 'price_unavailable';
    end if;

    -- availability: counted stock, or key inventory, or manual service
    if v_variant.stock is not null then
      if v_variant.stock < v_qty then raise exception 'out_of_stock'; end if;
      update public.product_variants set stock = stock - v_qty where id = v_variant.id;
      v_available := v_variant.stock - v_qty;
    else
      select count(*) into v_available from public.digital_keys
      where variant_id = v_variant.id and status = 'available';
      if v_available < v_qty then raise exception 'out_of_stock'; end if;
    end if;

    insert into public.order_items (
      order_id, variant_id, product_title, variant_label, platform, region,
      unit_price, quantity, line_total, requires_key
    ) values (
      v_order_id, v_variant.id, v_product.name, v_variant.label,
      v_product.platform, v_product.region,
      v_unit_price, v_qty, v_unit_price * v_qty,
      (v_variant.stock is null)
    )
    returning line_total into v_line_total;

    v_subtotal := v_subtotal + v_line_total;
  end loop;

  -- coupon discount (round half-up integer math, minor units)
  if v_coupon_id is not null then
    if v_coupon.type = 'percentage' then
      v_discount := (v_subtotal * v_coupon.value + 50) / 100;
    else -- fixed
      if v_coupon.currency is null or v_coupon.currency <> p_currency then
        raise exception 'invalid_coupon';
      end if;
      if v_coupon.min_order_amount is not null and v_subtotal < v_coupon.min_order_amount then
        raise exception 'coupon_min_order';
      end if;
      v_discount := least(v_coupon.value, v_subtotal);
    end if;

    update public.coupons set used_count = used_count + 1 where id = v_coupon_id;
  end if;

  update public.orders
  set subtotal_amount = v_subtotal,
      discount_amount = v_discount,
      total_amount    = v_subtotal - v_discount
  where id = v_order_id;

  perform public.audit('order.placed', 'order', v_order_id,
    jsonb_build_object('currency', p_currency, 'subtotal', v_subtotal, 'discount', v_discount));

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_no,
    'currency', p_currency,
    'subtotal_amount', v_subtotal,
    'discount_amount', v_discount,
    'total_amount', v_subtotal - v_discount
  );
end $$;

-- ── allocate_keys_for_order ──────────────────────────────────────────────────
-- Race-safe automatic delivery. Payment must already be verified.
-- SELECT ... FOR UPDATE SKIP LOCKED guarantees no duplicate allocation
-- even under parallel calls.
create or replace function public.allocate_keys_for_order(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item         record;
  v_reserved     integer;
  v_total        integer := 0;
  v_order_status order_status;
  v_count_items  integer;
  v_count_deliv  integer;
begin
  select status into v_order_status from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order_status not in ('payment_verified','processing') then
    raise exception 'order_not_verified';
  end if;

  for v_item in
    select oi.*
    from public.order_items oi
    where oi.order_id = p_order_id
      and oi.requires_key
      and oi.delivery_status = 'pending'
    for update skip locked
  loop
    with candidate as (
      select id from public.digital_keys
      where variant_id = v_item.variant_id
        and status = 'available'
      order by created_at
      for update skip locked
      limit v_item.quantity
    )
    update public.digital_keys dk
    set status = 'reserved', reserved_at = now(), order_item_id = v_item.id
    where dk.id in (select id from candidate);

    get diagnostics v_reserved = row_count;
    if v_reserved < v_item.quantity then
      raise exception 'insufficient_inventory_item_%', v_item.id;
    end if;

    update public.digital_keys
    set status = 'sold', sold_at = now()
    where order_item_id = v_item.id and status = 'reserved';

    insert into public.deliveries (order_item_id, key_id, method, content)
    select v_item.id, dk.id, 'automatic', 'AUTO-' || dk.id
    from public.digital_keys dk
    where dk.order_item_id = v_item.id and dk.status = 'sold';

    update public.order_items
    set delivery_status = 'delivered', delivered_at = now()
    where id = v_item.id;

    v_total := v_total + v_reserved;
  end loop;

  select count(*), count(*) filter (where delivery_status = 'delivered')
  into v_count_items, v_count_deliv
  from public.order_items where order_id = p_order_id;

  if v_count_deliv = v_count_items then
    update public.orders set status = 'completed' where id = p_order_id;
  else
    update public.orders set status = 'processing' where id = p_order_id;
  end if;

  return v_total;
end $$;
