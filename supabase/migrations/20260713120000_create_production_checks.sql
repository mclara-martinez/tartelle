-- Checks de línea del plan de producción: cocina marca una línea (producto)
-- del plan de una fecha como hecha. Check = fila existe; desmarcar = delete.
-- date = fecha objetivo del plan (= fecha de entrega), igual que
-- production_extras y production_counts.
create table public.production_checks (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  product_id uuid not null references public.products(id),
  user_id uuid,
  user_email text,
  created_at timestamptz not null default now(),
  unique (date, product_id)
);

alter table public.production_checks enable row level security;

create policy production_checks_select_admin_kitchen on public.production_checks
  for select to authenticated
  using (((auth.jwt() -> 'app_metadata') ->> 'role') = any (array['admin', 'kitchen']));

create policy production_checks_insert_admin_kitchen on public.production_checks
  for insert to authenticated
  with check (
    (((auth.jwt() -> 'app_metadata') ->> 'role') = any (array['admin', 'kitchen']))
    and (user_id = auth.uid() or user_id is null)
  );

-- kitchen también borra: desmarcar una línea es delete de su check
create policy production_checks_delete_admin_kitchen on public.production_checks
  for delete to authenticated
  using (((auth.jwt() -> 'app_metadata') ->> 'role') = any (array['admin', 'kitchen']));

create policy production_checks_all_operator on public.production_checks
  for all
  using (((auth.jwt() -> 'app_metadata') ->> 'role') = 'operator')
  with check (((auth.jwt() -> 'app_metadata') ->> 'role') = 'operator');

-- La publicación realtime es explícita (no FOR ALL TABLES)
alter publication supabase_realtime add table public.production_checks;
