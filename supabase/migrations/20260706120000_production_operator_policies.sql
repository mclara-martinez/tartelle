-- Fase 2 de production_counts: la operadora usa la pestaña Produccion.
-- CRUD completo sobre conteos y extras — el upsert del hook requiere
-- insert+update, y el botón X de la UI requiere delete.
--
-- Junto con esta migración se actualizó allowed_views de la operadora en
-- auth.users a ["dashboard","orders","create","production"].
--
-- Aplicada 2026-07-06 vía Supabase MCP con OK explícito de M Clara.

create policy production_counts_all_operator on public.production_counts
  for all using (((auth.jwt() -> 'app_metadata') ->> 'role') = 'operator')
  with check (((auth.jwt() -> 'app_metadata') ->> 'role') = 'operator');

create policy production_extras_all_operator on public.production_extras
  for all using (((auth.jwt() -> 'app_metadata') ->> 'role') = 'operator')
  with check (((auth.jwt() -> 'app_metadata') ->> 'role') = 'operator');
