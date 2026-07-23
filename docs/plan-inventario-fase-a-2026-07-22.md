# Plan — Inventario de producto terminado, Fase A (sin cocina)

**Fecha:** 2026-07-22 · **Blanqueo objetivo:** fin de semana 24–26 jul
**Principio:** todo producto terminado en nevera tiene dueño (pedido `ready` sin entregar) o es disponible visible que cubre extras/pedidos nuevos. Cocina NO alimenta el inventario hasta validar el cálculo de producción (Fase B).

## Estado actual del código

- `INVENTORY_SYNC_ENABLED = false` en `app/src/hooks/useOrders.ts:144`. Con el flag encendido ya existe la lógica completa de pedidos: `ready` suma (producción inferida), `dispatched` resta (venta), cancelación post-despacho devuelve.
- **Ventas (vitrina) ya descuenta sin flag** — `KitchenSalesMode.tsx:116` llama `adjustInventory(-qty, 'sale')` incondicionalmente.
- **Bug encontrado:** `adjustInventory` lanza error si el producto no tiene fila en `inventory_finished` (`.single()` falla). En Ventas eso ocurre *después* de crear el pedido → el pedido queda creado pero la operaria ve "Error al registrar". El blanqueo debe sembrar fila para TODO producto retail/ambos, y el código debe tolerar la falla (warn, no abortar) como ya hace `updateOrderStatus`.
- Existe `DayClosureView` (cierre del día): concilia sobrante declarado vs. stock del sistema con ajustes. Solapa con el conteo nocturno de `production_counts` — decidir cuál queda como flujo único.

## Fase 0 — Blanqueo — ✅ EJECUTADO 2026-07-22 (adelantado por decisión de M Clara)

- Snapshot en BD: `inventory_finished_snapshot_20260722` (72 filas, suma 94 uds) — restaurable.
- Todo a 0 + 21 asientos de ajuste en `inventory_log` (notes "Blanqueo inventario 2026-07-22").
- Sembradas 21 filas faltantes → 93 filas, todo producto activo tiene fila (elimina el error falso de Ventas por fila faltante).
- Baseline en ceros (sin conteo físico): las cantidades reales se cargan al arrancar el testeo vía tab Inventario / conteo.
- Código listo local: `INVENTORY_SYNC_ENABLED = true` + fix de tolerancia en Ventas. **Pendiente deploy con OK explícito.**

## Fase A — Alimentación sin cocina (desde el blanqueo)

| Movimiento | Fuente | Efecto en inventario |
|---|---|---|
| Pedido pasa a `ready` | Flujo de pedidos (automático) | +cantidad (producción inferida) |
| Pedido pasa a `dispatched` | Flujo de pedidos (automático) | −cantidad |
| Venta de vitrina (Ventas: walk-in/Rappi/Didi) | Ya activo | −cantidad |
| Cancelación post-despacho | Automático | +cantidad (devolución) |
| Conteo nocturno "Terminado disponible" | Operadora (digitación única) | Fija el valor absoluto del producto (corrige drift diario) |
| Checks de "Producir hoy" (cocina) | — | **No mueve nada** (Fase B) |

Drift conocido y aceptado en Fase A: los extras horneados entran al inventario solo cuando la operadora los registra en el conteo — durante el día el stock de vitrina puede quedar subestimado. Lo corrige el conteo nocturno; si molesta para la alerta Rappi, se activa la suma automática de extras (decisión D3).

## Fase B — Cocina alimenta (cuando HACER esté validado)

Criterio de entrada: ≥2 semanas de plan de producción sin discrepancias reportadas. Los checks de Producir suman al inventario y se apaga la suma inferida por `ready` (evitar doble conteo). Se puede reactivar `RAPPI_ALERT_ENABLED`.

## Decisiones pendientes (M Clara / operaria)

- **D1.** Fecha y responsable del conteo físico del blanqueo (¿viernes 24 noche o sábado 25 post-cierre?).
- **D2.** ¿El conteo nocturno de Terminado disponible fija también el inventario (recomendado: una sola digitación) y retiramos/pausamos el Cierre del día, o mantenemos ambos?
- **D3.** ¿Extras del plan suman automáticamente al inventario en la mañana de su fecha (recomendado si queremos alerta Rappi útil) o solo vía conteo?

## Trabajo de código para Fase A (pendiente de aprobación)

1. Fix Ventas: tolerar falla de `adjustInventory` sin marcar la venta como error.
2. Mirror del conteo nocturno → `inventory_finished` (según D2).
3. Flip del flag + (según D3) suma automática de extras.
4. SQL de blanqueo (ejecutar solo con OK explícito por operación).
