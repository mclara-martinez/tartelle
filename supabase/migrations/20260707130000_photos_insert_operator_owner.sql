-- La operadora (rol operator) no podía subir comprobantes de pago: la política
-- de INSERT en storage.objects para el bucket order-photos solo cubría
-- admin/driver/kitchen (se creó antes de que existiera el rol operator).
-- Los intentos devolvían HTTP 400 por violación de RLS y la UI mostraba
-- "No se pudo subir la imagen. Intenta de nuevo.".
--
-- Se recrea la política incluyendo operator y owner.
--
-- Aplicada 2026-07-07 vía Supabase MCP.

drop policy "photos_insert_admin_driver_kitchen" on storage.objects;

create policy photos_insert_staff on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'order-photos'
    and ((auth.jwt() -> 'app_metadata') ->> 'role') = any (array['admin', 'driver', 'kitchen', 'operator', 'owner'])
  );
