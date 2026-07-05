-- Conteo nocturno de producto terminado DISPONIBLE, por fecha de producción.
-- La operadora digita el neto (conteo físico de cocina menos lo reservado a
-- pedidos 'ready' sin entregar). Snapshot por (date, product_id) — misma
-- metodología de production_extras. quantity = 0 es válido (se contó cero).
--
-- Aplicada 2026-07-04 vía Supabase MCP con OK explícito de M Clara.

create table public.production_counts (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  product_id uuid not null references public.products(id),
  quantity integer not null default 0 check (quantity >= 0),
  created_at timestamptz default now(),
  unique (date, product_id)
);

alter table public.production_counts enable row level security;

create policy production_counts_select_admin_kitchen on public.production_counts
  for select using (((auth.jwt() -> 'app_metadata') ->> 'role') in ('admin', 'kitchen'));

create policy production_counts_insert_admin_kitchen on public.production_counts
  for insert with check (((auth.jwt() -> 'app_metadata') ->> 'role') in ('admin', 'kitchen'));

create policy production_counts_update_admin_kitchen on public.production_counts
  for update using (((auth.jwt() -> 'app_metadata') ->> 'role') in ('admin', 'kitchen'))
  with check (((auth.jwt() -> 'app_metadata') ->> 'role') in ('admin', 'kitchen'));

create policy production_counts_delete_admin on public.production_counts
  for delete using (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin');

-- Realtime para el refetch debounced del hook useProductionCounts
alter publication supabase_realtime add table public.production_counts;

-- PENDIENTE (fase 2, tras validación con cuenta admin): políticas para
-- 'operator' en production_counts Y TAMBIÉN en production_extras (hoy solo
-- admin/kitchen). Descomentar y aplicar solo con OK explícito:
--
-- create policy production_counts_all_operator on public.production_counts
--   for all using (((auth.jwt() -> 'app_metadata') ->> 'role') = 'operator')
--   with check (((auth.jwt() -> 'app_metadata') ->> 'role') = 'operator');
--
-- create policy production_extras_all_operator on public.production_extras
--   for all using (((auth.jwt() -> 'app_metadata') ->> 'role') = 'operator')
--   with check (((auth.jwt() -> 'app_metadata') ->> 'role') = 'operator');
