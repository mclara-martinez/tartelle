# Bugs — Testing E2E previo a demo Andrea

**Fecha testing:** 2026-06-02 · **Demo:** miércoles 4 junio 2026 (Módulo 1)
**Alcance:** flujo nuevo Tier 1–4 (máquina de estados, trazabilidad inventario, cierre del día, ventas cocina, factura B2B)

> **⚠️ Actualización 2026-07-04 — verificado contra el código actual de main.**
> La tabla de abajo se conserva como registro histórico; el estado real hoy es:
>
> - ✅ **RESUELTOS (19):** B1, B2, B3, B5, B6, B7, B9, B10, B12, B14, B15, B17, B18, B19, B20, B21, B22 + B4 y B8 (obsoletos: el bloqueo same-day se reemplazó por diálogo de confirmación en Tier 1, y B8 era comportamiento esperado — cocina muestra solo HOY).
> - ✅ **B11 — RESUELTO 2026-07-04:** el tablero de despacho ahora separa la cola real (listo/en camino) de una sección atenuada "En preparación — aún no salen" (commit `19ddc2f`).
> - 🟠 **PARCIAL (1):**
>   - **B16** — El modal de stock bajo no re-dispara dentro de la ventana de 2 h del cooldown en `localStorage`, aunque el inventario vuelva a caer.
> - ⚪ **OBSOLETO (1):** **B13** — el ajuste automático de inventario está **desactivado por diseño** (`INVENTORY_SYNC_ENABLED = false`, `useOrders.ts:137`, "hasta la fase de inventario"). Saltar estados ya no desincroniza stock porque el stock no se mueve solo.
> - 🔴 **ABIERTO (1):** **B23** — rediseño UX del inventario (decisión de diseño, post-piloto).
>
> Siguiente etapa de correcciones: ver [`bugs-siguiente-etapa.md`](bugs-siguiente-etapa.md).

## Cómo se llena
Tú pruebas en el navegador, me dictas el hallazgo en el chat, yo lo registro acá. Severidad:
- 🔴 **Bloqueante** — rompe el demo, hay que arreglar antes del miércoles
- 🟡 **Importante** — molesto pero hay workaround, arreglar si da tiempo
- 🟢 **Menor** — cosmético / nice-to-have, post-demo

---

## Bugs encontrados

| # | Sev | Paso | Pantalla / Flujo | Qué pasa | Causa raíz (confirmada en código) | Estado |
|---|-----|------|------------------|----------|-----------------------------------|--------|
| B1 | 🟢 | 1.3 | OrderCreateView — Cliente/Facturación | El nombre se pide dos veces (campo "Cliente" arriba y "Nombre completo o razón social" en Facturación). Debería pedirse una sola vez (o auto-rellenar facturación con el nombre del cliente). | Campos `customerName` y `billingName` separados; no se sincronizan | Abierto |
| B2 | 🟢 | 1.3 | OrderCreateView — teléfono | El placeholder del teléfono dice "(opcional)"; quitar el "(opcional)". | `placeholder="Telefono (opcional)"` | Abierto |
| B3 | 🟡 | 1.6 | OrderCreateView → cliente guardado | Al volver a buscar el cliente, se guardó nombre/teléfono/email pero NO la cédula/NIT. | `createCustomer()` solo envía `name, phone, email`; el `billing_id_number` se guarda en el pedido, no en el cliente | Abierto |
| B4 | 🟢 | 2.1 | OrderCreateView — validación stock | El mensaje "Sin stock para hoy: … Fecha mínima: mañana" da demasiado detalle. Solo debería decir que no se puede para hoy. | Toast arma `Sin stock para hoy: ${names}. Fecha mínima: mañana` | Abierto |
| B5 | 🔴 | 3.2 | OrdersView — dropdown estado (lista) | El dropdown de estado se ve cortado (clip) y al seleccionar una opción no se refleja el cambio en la UI de la lista. | Dropdown probablemente clippeado por overflow del contenedor; lista no re-renderiza el badge tras `handleStatusChange` | Abierto |
| B6 | 🔴 | 3.2 | OrderDrawer — cambio de estado | En el detalle del pedido sí se puede cambiar estado, pero tarda varios segundos en verse → el usuario hace múltiples clicks (riesgo de doble disparo / doble descuento). | Sin estado de "actualizando" inmediato; espera al refetch realtime (debounce 400ms + red) | Abierto |
| B7 | 🟡 | 3.5 | Inventario | El stock sí se descuenta al pasar a "En cocina", pero la vista de inventario no se recarga sola al confirmar producción (hay que refrescar manual). | Falta refetch/realtime en la vista que se está mirando | Por confirmar |
| B8 | 🔴 | 3.2 / 3.6 | Cocina (Producción) | Al poner el pedido "En cocina", no aparece nada en la pestaña Cocina, así que no se puede continuar el flujo. | **Probable causa NO-bug:** el pedido de Esc.1 se creó para MAÑANA y la cocina muestra solo HOY (`useOrders(today())`). Ver Nota N1 | Por confirmar |
| B9 | 🔴 | 3.8 | Cocina (todos los modos) | La ventana de cocina NO se actualiza al entrar un pedido nuevo; hay que refrescar manual. | Realtime de `orders` no está propagando a la cocina (subscripción no dispara o realtime deshabilitado en la tabla) | Abierto |
| B10 | 🔴 | 3.8 | Cocina → Despacho | El badge "Pendiente" en las tarjetas de Despacho NO es el estado del pedido — es el **estado de pago**. Se lee como si fuera estado de producción/listo y confunde. | `DispatchCard` muestra `PAYMENT_STATUS_LABELS[payment_status]` con ícono de tarjeta, no el `STATUS_LABELS` del pedido | Abierto |
| B11 | 🟡 | 3.8 | Cocina → Despacho | El tablero de Despacho muestra TODOS los pedidos activos (confirmado, en cocina, listo, despachado), pero solo los "listos" tienen botón Despachar. Los confirmados aparecen "en despacho" sin haberse producido → parecen listos. | `dispatchable` filtra `['confirmed','in_production','ready','dispatched']`; botón Despachar solo si `status==='ready'` | Abierto |
| B12 | 🟡 | 3.8 | Cocina (Producción ↔ Despacho) | Hay pedidos en Despacho que no aparecen en Producción ni como "por producir" ni como "producido". | Producción lista solo el **déficit** (necesario − stock); si el stock ya cubre, el pedido nunca aparece. No hay estado de producción por pedido — la producción es por lote/inventario, no por pedido. Ver N2 | Abierto |
| B13 | 🔴 | 3.8 / 3.9 | Estados ↔ inventario | Confirmado → Listo directo: el pedido "nunca pasó por cocina", el inventario NO se descuenta, y aparece en Despacho como despachable. | El descuento de inventario SOLO ocurre en la transición a `in_production`. Saltar ese estado = nunca descuenta. Confirma la sospecha de 3.9 | Abierto |
| B14 | 🟡 | 5.1 | Cocina → Producción | En "Por producir" no es claro qué producto es (muestra sabor + tamaño, ej. "Milo / Mini / Otro"); en "Ya producido hoy" sí sale el nombre completo. Naming inconsistente. | "Por producir" usa `flavor` + `SIZE_LABELS[size]`; "Ya producido hoy" usa `product.name` (SKU completo) | Abierto |
| B15 | 🟡 | 5.4 | Cocina → Control de calidad | Si un ítem NO pasa calidad, igual se suma al stock y queda disponible para despacho — no bloquea ni separa el lote. No es claro qué debería pasar. | `QualityCheckModal` registra el log de fallo pero igual ejecuta `handleProduce` (+stock). Requiere decisión de diseño | Abierto |
| B16 | 🟡 | 5.7 | Cocina → modal Stock bajo | El modal "Stock bajo / Ya apagué Rappi" solo aparece al cargar el tab por primera vez. Debería reaparecer automáticamente cuando un cambio de inventario re-dispare la condición. | Depende de re-render; ligado a que la cocina no refresca en realtime (B9) + flag `rappiDismissed` en estado local | Abierto |
| B17 | 🟡 | 6.2 | Cocina → Ventas | (a) No se puede quitar un producto si se seleccionó por error. (b) Solo deja 1 ítem por venta, pero una venta presencial/Rappi/Didi puede tener varios ítems. | `KitchenSalesMode` maneja `selectedProduct` único, sin carrito | Abierto |
| B18 | 🔴 | 6.2 | Cocina → Ventas / Despacho | Las ventas presenciales/Rappi/Didi se crean como `dispatched` y quedan colgadas en Despacho ("En camino — esperando confirmación"). Una venta presencial se entrega de inmediato → debería quedar `delivered`. Rappi/Didi igual: entregadas. | `handleConfirm` crea la orden con `status: 'dispatched'`; debería ser `delivered` | Abierto |
| B19 | 🔴 | 7.1 | Cocina → Despacho | No hay forma en cocina de marcar un PEDIDO como "Listo". Producir (+N) solo suma inventario; no cambia el estado del pedido. | Ningún botón de cocina hace `updateOrderStatus(...,'ready')`. Refuerza N2 | Abierto |
| B20 | 🟡 | 8.8 | Domiciliario | John solo ve domicilios en estado listo/en camino; las flechas de día tienen poco sentido. ¿Debería ver todos los domicilios del día sin importar estado? | Filtro `delivery_type==='delivery' && status ∈ [ready,dispatched]`. Decisión de diseño (ligada a N2) | Abierto |
| B21 | 🔴 | 9.1–9.7 / 10.3 | Cierre del día + Movimientos + Kitchen log | Salen VACÍOS pese a que hubo producción y ventas hoy ("Sin movimientos hoy" / "Sin movimientos para los filtros"). Bloquea probar todo el cierre. | **CONFIRMADO: bug de zona horaria.** `new Date('yyyy-MM-dd')` parsea el string como UTC-medianoche y luego `.setHours()` opera en local → la ventana se corre un día completo y consulta los movimientos de AYER. En `useDayClosure.ts:32-35` y `InventoryLogView.tsx:52-55`. Fix ~2 líneas c/u | Confirmado |
| B22 | 🟡 | UI | Inventario — modal/panel lateral izquierdo | No caben todos los ítems en pantalla; falla de spacing (se cortan los productos, no hay scroll claro o el alto del contenedor está mal). | Layout: contenedor del panel sin `overflow-y-auto` / alto fijo, o spacing excesivo por ítem | Abierto |
| B23 | 🟡 | UX | Inventario — navegación general | El inventario "parece incompleto" y la navegación no es intuitiva: difícil ubicar productos, no hay buscador/filtro/agrupación clara. Pregunta abierta: ¿qué referentes de UI usar para visualizar inventario? | Decisión de diseño UX — ver propuesta de referentes en Notas N3 | Abierto |

---

## Bloqueos de testing
- **B5/B6/B8 bloquean los pasos 3.4–3.9 y los escenarios 5, 7** (no se puede recorrer el flujo de estados ni ver la cocina). Hay que resolver el dropdown y la visibilidad en cocina antes de poder validar inventario/doble descuento.

## Notas / observaciones (no son bugs)
- **N1 (sobre B8):** La cocina (Producción y Despacho) muestra solo pedidos de HOY. El pedido de prueba se creó para mañana, por eso no aparece. Para probar el flujo de cocina, crear el pedido con fecha = HOY. Pendiente decidir con Andrea si la cocina debería ver también los pedidos del día siguiente (el cronograma dice "ver las cantidades a producir cada mañana").
- **N2 — DESCONEXIÓN DE DISEÑO (raíz de B11/B12/B13):** Hoy conviven DOS lógicas que no están conectadas:
  1. **Estado del pedido** = máquina de estados lineal (confirmado → en cocina → listo → despachado → entregado), que mueve Andrea/admin.
  2. **Producción** = por lote/inventario: cocina produce para cubrir el *déficit* total del día (necesario − stock), no pedido por pedido. El inventario solo se descuenta en la transición a "en cocina".
  
  Como no están ligadas: un pedido puede saltar a "listo" sin descontar stock ni "pasar por cocina"; el tablero de Despacho mezcla todos los estados; y un pedido puede estar en Despacho sin figurar en Producción. **Esta es probablemente LA conversación de diseño para la sesión del 4 con Andrea**: definir si el estado del pedido debe gobernar la producción/inventario, o si son flujos paralelos a propósito. No es un fix de una línea — afecta el modelo. Recomiendo decidir el flujo ideal ANTES de parchear B11/B12/B13.

- **N3 — Referentes para rediseño de Inventario (sobre B22/B23):** El catálogo de Tartelle es naturalmente una matriz **sabor × tamaño**, así que la lista plana actual no es la mejor visualización. Referentes a evaluar:
  1. **Shopify admin → Inventory**: tabla con buscador, filtros, columnas ordenables y edición inline de cantidad. El estándar de facto.
  2. **Square for Retail / Lightspeed**: "stock by variant" — destacan low-stock y par levels (umbral de reorden) con color.
  3. **Vista matriz sabor×tamaño**: filas = sabor, columnas = Grande/Mediana/Mini, celda = stock editable. Compacta, escaneable de un vistazo, encaja con el modelo de productos de Tartelle.
  4. **Airtable/Notion table**: agrupación por categoría colapsable + búsqueda global.
  Recomendación: matriz sabor×tamaño (#3) con buscador y resaltado low-stock (#2). Decisión de UX para Andrea.
