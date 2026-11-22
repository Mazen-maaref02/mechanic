-- ============================================================================
-- GamingStore — 0005: staff write policies for fulfillment APIs
-- The automatic path uses SECURITY DEFINER functions; these policies cover
-- manual fulfillment by authenticated staff through server actions.
-- ============================================================================

-- staff can mark items delivered / failed
drop policy if exists p_order_items_staff_update on public.order_items;
create policy p_order_items_staff_update on public.order_items
  for update to authenticated
  using (public.is_staff_if_admin()) with check (public.is_staff_if_admin());

-- staff can insert/update deliveries (manual fulfillment records)
drop policy if exists p_deliveries_staff_insert on public.deliveries;
create policy p_deliveries_staff_insert on public.deliveries
  for insert to authenticated
  with check (public.is_staff_if_admin());

drop policy if exists p_deliveries_staff_update on public.deliveries;
create policy p_deliveries_staff_update on public.deliveries
  for update to authenticated
  using (public.is_staff_if_admin()) with check (public.is_staff_if_admin());
