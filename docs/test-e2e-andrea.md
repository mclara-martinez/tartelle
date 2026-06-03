# Guion de testing E2E — previo a demo Andrea (4 jun 2026)

App corriendo en `localhost:5173`. Login como **admin**. Desde admin puedes navegar a
cocina (`#kitchen`) y domiciliario (`#domiciliario`) por hash, sin necesidad de usuarios
aparte. Para probar realtime, abre una segunda ventana.

Modelo de inventario (para entender qué esperar):
- Marcar un pedido **"Listo"** en cocina (confirmed→ready) → SUMA stock (PT, producto terminado)
- **Despachar** un pedido (ready→dispatched) → RESTA stock
- **in_production** ya NO toca inventario y no es un paso visible en cocina
- **Venta** en modo Ventas (Rappi/Didi/Presencial) → RESTA stock una vez; la orden se crea como `delivered`
- **Cancelar** un pedido → DEVUELVE stock SOLO si estaba en `dispatched` o `delivered`

⚠️ = punto donde ya sospecho bug leyendo el código. Mira con atención.

---

## Escenario 0 — Preparación
- **0.1** Login como admin.
- **0.2** Ir a **Inventario**. Anotar el stock de 2–3 productos que vas a usar (ej. una tarta y un bites).
- **0.3** (Opcional) Abrir una segunda ventana/pestaña para dejar la cocina visible.

## Escenario 1 — Crear pedido retail (recoge en local)
- **1.1** Pedidos → **Nuevo pedido**.
- **1.2** Pestaña catálogo **Tienda**. Agregar 2 productos (una tarta + un bites). Verificar el contador del producto y que el total suma bien.
- **1.3** Cliente nuevo: escribir nombre + teléfono.
- **1.4** Entrega: **Local** · Fecha: **mañana** · Canal: **WhatsApp** · Medio de pago: **Efectivo**.
- **1.5** **Crear pedido** → toast "Pedido creado" y aparece en la lista (pestaña **Mañana**).
- **1.6** Crear otro pedido y, en Cliente, usar el buscador (ícono usuario) → el cliente de 1.3 debe aparecer guardado.

## Escenario 2 — Validación de stock (pedido anticipado para hoy)
- **2.1** Nuevo pedido con un producto que requiera producción anticipada y tenga stock 0, fecha = **HOY**.
- **2.2** Crear → debe **bloquear** con toast "Sin stock para hoy… Fecha mínima: mañana".
- **2.3** Cambiar fecha a **mañana** → ahora sí debe dejar crear.

## Escenario 3 — Estados + inventario (CRÍTICO: doble descuento)
- **3.1** Anotar el stock actual del producto del pedido de Esc.1.
- **3.2** En la lista, abrir el dropdown de estado del pedido → pasar a **"En cocina"**.
- **3.3** Ir a Inventario → el stock debe **bajar exactamente** por la cantidad del pedido.
- **3.4** ⚠️ Volver a Pedidos. Cambiar ese MISMO pedido de "En cocina" → **"Confirmado"**.
- **3.5** ⚠️ Inventario → ¿el stock **volvió a subir**? (Sospecho que NO devuelve — anótalo.)
- **3.6** ⚠️ Cambiar otra vez a **"En cocina"**.
- **3.7** ⚠️ Inventario → ¿bajó **de nuevo** (doble descuento)? Este es el bug más caro.
- **3.8** ⚠️ Otro pedido: pasarlo directo de "Confirmado" → **"Listo"** (saltando En cocina).
- **3.9** ⚠️ Inventario → ¿se descontó? (Sospecho que NO se descuenta si saltas En cocina.)

## Escenario 4 — Cancelación con devolución de stock
- **4.1** Un pedido en "En cocina" (ya descontó). Anotar stock.
- **4.2** Dropdown → **Cancelado**.
- **4.3** Inventario → el stock debe **volver a subir** por la cantidad del pedido.
- **4.4** El pedido cancelado debe **desaparecer** de la lista.

## Escenario 5 — Cocina: Producción + calidad + componentes
Ir a `#kitchen` → pestaña **Producción**.
- **5.1** Ver lista **"Por producir"** (calculada desde los pedidos de hoy, déficit = necesario − stock).
- **5.2** Tocar **+N** en un producto → abre modal **Control de calidad**.
- **5.3** Confirmar con todos los ítems OK → el stock sube y aparece en **"Ya producido hoy"**.
- **5.4** Producir otro lote pero marcar un ítem de calidad como **fallido** → debe exigir descripción (sin texto no deja confirmar).
- **5.5** Llenar descripción + foto opcional → confirmar.
- **5.6** **Añadir componente** (nombre + cantidad libre) → aparece en "Componentes producidos hoy".
- **5.7** Si hay stock bajo, debe salir el modal **"Stock bajo / Ya apagué Rappi"**.

## Escenario 6 — Cocina: Ventas (Rappi/Didi/Presencial) + inventario PT
Pestaña **Ventas**.
- **6.1** Anotar el stock de un producto en el panel **"Stock actual"** (abajo).
- **6.2** Canal **Presencial** → producto → cantidad **2** → Continuar → **Confirmar**.
- **6.3** "Stock actual" debe bajar en **2**. Toast "Pedido registrado".
- **6.4** Repetir con **Rappi**.
- **6.5** ⚠️ Verificar que NO haya doble descuento (baja solo una vez por venta).
- **6.6** ⚠️ Como admin (Pedidos → Hoy): ¿aparecen estas ventas? ¿con qué estado? ¿ensucian la lista de Despacho?

## Escenario 7 — Cocina: Despacho
- **7.1** ⚠️ Necesitas un pedido de hoy en **"Listo"**. Ojo: en modo Despacho solo hay botón **"Despachar"** para los que YA están en Listo — **no veo cómo cocina marca un pedido como Listo desde la tablet**. Verifica cómo se llega a "Listo" (¿solo admin por dropdown?). Esto importa para el demo.
- **7.2** Con un pedido en "Listo": subir **foto de despacho**.
- **7.3** Tocar **"Despachar"** → pasa a "En camino".

## Escenario 8 — Domiciliario John: entrega + factura B2B
Crear como admin un pedido **B2B**: canal **Restaurante**, entrega **Domicilio**, con **hora estimada**, fecha **hoy**, y pasarlo a **"Listo"**.
- **8.1** Ir a `#domiciliario` → pestaña **"Por recoger"**.
- **8.2** El pedido B2B debe aparecer con bloque **"Factura pendiente"** y botón **"Recogido" deshabilitado**.
- **8.3** Subir **foto de factura** O tocar **"Entregada en físico"** → "Recogido" se habilita.
- **8.4** Tocar **"Recogido"** → salta a pestaña "Entregando" y registra hora.
- **8.5** Tocar **"Entregado"** → registra hora y desaparece.
- **8.6** Crear un pedido retail **Domicilio** (no B2B) en Listo → "Recogido" debe estar habilitado sin factura.
- **8.7** Verificar que la **hora estimada** se muestra y que ordena por hora.
- **8.8** Probar navegación de día (◀ ▶): ayer / hoy / mañana.

## Escenario 9 — Cierre del día
Ir a `#day-closure` (admin) o pestaña **Cierre** en cocina.
- **9.1** Ver la tabla: **Producido hoy / Vendido hoy / En nevera** por producto con movimientos.
- **9.2** ⚠️ "Vendido hoy" debe cuadrar con las ventas reales (Esc. 3 y 6).
- **9.3** "Producido hoy" debe cuadrar con Esc. 5.
- **9.4** Llenar **"Sobrante no vendido"** en cada fila (el botón Cerrar se habilita solo cuando todas están llenas).
- **9.5** Declarar en una fila un sobrante **distinto** al de "En nevera" → al cerrar debe marcar **"Con ajustes"** y ajustar el inventario.
- **9.6** **Cerrar día** → vista de solo lectura.
- **9.7** Recargar la página → debe seguir en solo lectura (no permite cerrar dos veces).

## Escenario 10 — Admin: Siigo, Kanban, logs
- **10.1** Pedidos → botón **"Siigo"** descarga CSV. Abrirlo y revisar columnas/datos.
- **10.2** Cambiar a vista **Kanban** y mover estados.
- **10.3** Revisar **Inventory log** y **Kitchen log** (que carguen los registros del día).

## Escenario 11 — Realtime
- **11.1** Dos ventanas (admin Pedidos + cocina). Crear pedido en admin → debe aparecer en cocina sin refrescar (~1s).
- **11.2** Cambiar un estado en una ventana → se refleja en la otra.

---

## Bugs encontrados
(se registran en `docs/bugs-demo-andrea.md`)
