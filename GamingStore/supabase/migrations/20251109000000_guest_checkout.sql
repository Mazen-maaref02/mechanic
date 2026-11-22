-- ============================================================================
-- GamingStore — 0006: guest checkout
-- Clients no longer need accounts; only the admin signs in. place_order now
-- accepts anonymous callers and stores the order with a NULL profile_id.
-- Guests track orders / submit payments via server actions that verify the
-- order number/email pair (no direct anon API access is granted).
-- ============================================================================

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
  v_uid        uuid := auth.uid(); -- null for guest checkout (by design)
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
  -- NOTE: guests are allowed since 0006. v_uid stays null for anonymous
  -- callers and orders.profile_id is nullable — no auth_required here.
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
    jsonb_build_object('currency', p_currency, 'subtotal', v_subtotal,
                       'discount', v_discount, 'guest', v_uid is null));

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_no,
    'currency', p_currency,
    'subtotal_amount', v_subtotal,
    'discount_amount', v_discount,
    'total_amount', v_subtotal - v_discount
  );
end $$;
