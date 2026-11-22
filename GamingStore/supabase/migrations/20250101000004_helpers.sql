-- ============================================================================
-- GamingStore — 0004: public helpers
-- Stock availability lookup used by the storefront (counts only — never keys).
-- ============================================================================

create or replace function public.available_stock(variant_ids uuid[])
returns table (
  variant_id uuid,
  stock      integer,
  key_stock  integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pv.id,
    pv.stock,
    (select count(*)::integer
     from public.digital_keys k
     where k.variant_id = pv.id and k.status = 'available')
  from public.product_variants pv
  where pv.id = any(variant_ids);
$$;

-- Anonymous shoppers may compute availability; no secrets are returned.
revoke execute on function public.available_stock(uuid[]) from anon;
grant execute on function public.available_stock(uuid[]) to public;
