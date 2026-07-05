# Bugs y pendientes — Siguiente etapa

> Consolidado 2026-07-04, verificado contra main + DB (no contra los docs viejos).
> Reemplaza como fuente de verdad a las secciones de roadmap de
> [`bugs-demo-andrea.md`](bugs-demo-andrea.md) y
> [`e2e-report-owner-2026-06-16.md`](e2e-report-owner-2026-06-16.md), que quedan
> como registro histórico con nota de actualización.
>
> Contexto: piloto Módulo 2 arranca el **14 de julio de 2026** (cronograma).

---

## Etapa A — Antes del piloto (14 jul)

| # | Item | Detalle | Esfuerzo | Requiere |
|---|------|---------|----------|----------|
| A1 | **Cierre masivo de 48 pedidos vencidos + legacy `pending`** 🟠 PENDIENTE | Esperando la hoja de cálculo real de Andrea para hacer el match. UPDATE masivo en `orders`. La zona "Vencidos" ya los expone en la UI mientras tanto. | 1–2 h | Hoja de Andrea + OK explícito de M Clara (UPDATE masivo, tabla `orders`) |
| A2 | **B11 — Despacho muestra pedidos no listos** ✅ RESUELTO 2026-07-04 | Tablero separado: cola de despacho (listo/en camino, con botón) + sección atenuada "En preparación — aún no salen" (confirmado/en cocina). Verificado en app. Commit `19ddc2f`. | — | — |
| A3 | **Error boundary global** ✅ RESUELTO 2026-07-04 | `ErrorBoundary` envuelve toda la app; fallback con Reintentar/Recargar. Probado forzando un crash en dev. Commit `19ddc2f`. | — | — |
| A4 | **Race de respuestas stale en `useOrders`** ✅ RESUELTO 2026-07-04 | Guard de `requestId` en hooks con refetch por parámetro. PR #3 mergeado (`e4dc5e3`). | — | — |
| A5 | **Decisión: `INVENTORY_SYNC_ENABLED`** 🟠 PENDIENTE | El ajuste automático de inventario está apagado (`useOrders.ts`). No es bug, pero hay que alinear expectativas del piloto: el stock NO se mueve al cambiar estados. Decidir si el piloto corre así (recomendado) y cuándo entra la fase de inventario. | Decisión | M Clara + Andrea |

## Etapa B — Durante el piloto (14–25 jul)

| # | Item | Detalle | Esfuerzo |
|---|------|---------|----------|
| B1 | **B16 — Modal de stock bajo no re-dispara** | Cooldown de 2 h en `localStorage` impide re-alertar si el stock vuelve a caer dentro de la ventana. Re-evaluar la condición al cambiar inventario, manteniendo el cooldown solo por producto ya confirmado. | 2 h |
| B2 | **B-NEW-08 — Consistencia lista ↔ drawer** | Por confirmar en uso real: el drawer refetchea al abrir y `onStatusChange` refresca la lista, así que probablemente ya está resuelto. Confirmar durante piloto y cerrar. | Verificación |
| B3 | **B-NEW-13 — Búsqueda de cliente poco descubrible** | Decisión de UX: search activo por defecto vs. label más visible. Tomar con feedback de la operaria en piloto. | 1–2 h |
| B4 | **Datos (Etapa 4 del reporte E2E)** | Cliente B2B con ~340 pedidos sin teléfono; 3 clientes activos sin órdenes; 4 productos Eventos inactivos. Coordinación con Andrea, no código. | Coordinación |

## Etapa C — Post-piloto (cierre Módulo 2)

| # | Item | Detalle |
|---|------|---------|
| C1 | **B23 — Rediseño UX inventario** | Buscador/filtros/agrupación; referentes de UI pendientes. Ligado a la fase de inventario (A5). |
| C2 | **Deuda estructural** | Patrón `set-state-in-effect` en los 12+ hooks (14 errores de lint); code splitting (bundle >500 kB); suite mínima de smoke tests. |
| C3 | **Fase de inventario** | Activar `INVENTORY_SYNC_ENABLED` con el modelo ready(+)/dispatched(−), migrar los movimientos históricos si aplica, y resolver B16/B23 en conjunto. |

---

## Resuelto y verificado (no volver a trabajar)

- Todo el roadmap E1/E2/E3 del reporte E2E del 16 jun (RLS owner, kanban stale,
  drawer cancel, inventory 406, labels, badges, Siigo, B1/B2/B3).
- B5, B6, B7, B9, B10, B12, B14, B15, B17, B18, B19, B20, B21, B22 del doc de la demo.
- Tiers 1–3 del feedback de la operaria, incluyendo edición de pedidos verificada
  E2E con guardado real (2026-07-04) y toppings en pedidos reales.
- Crash por estados legacy `pending` (fallback en `StatusBadge`, commit `ec94220`).
- Guards de guardado: fecha vacía y descuento > total (commit `ad962e1`).
