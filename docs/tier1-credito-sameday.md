# Tier 1 — Método "Crédito" + Same-day a confirmación

> Spec ejecutable para una sesión dedicada. Parte del plan en [`feedback-operaria-plan.md`](feedback-operaria-plan.md) (items #1 y #4).
> Stack: React 19 + TS + Vite + Tailwind 4 + Supabase. App en `/app`.

Dos cambios independientes y de bajo riesgo. No tocan `order_items`.

---

## Item #1 — Método de pago "Crédito"

### Objetivo
Los restaurantes no pagan por anticipado sino a los días de recibir el producto y la
factura. Falta un método de pago "Crédito" para ese caso.

### Estado actual (verificado)
- `app/src/lib/types.ts` (~línea 12): `export type PaymentMethod = 'transfer' | 'cash' | 'bold' | 'rappi'`
- `app/src/lib/constants.ts` (~líneas 99–104): `PAYMENT_METHOD_LABELS` mapea cada método a su label en español. Cerca (~87–97) están los colores de `payment_status`.
- `app/src/views/OrderCreateView.tsx` (~líneas 537–578): renderiza un botón por cada método desde `PAYMENT_METHOD_LABELS`. Al elegir transfer/bold muestra el `PhotoUpload` del comprobante y al cambiar de método resetea `setPaymentReceiptUrl(null)` (~544). `payment_status` se setea `paymentReceiptUrl ? 'paid' : 'pending'` (~181).
- `app/src/views/kitchen/KitchenSalesMode.tsx` (~línea 98): auto-asigna método según canal (`walk_in → cash`, else `rappi`). No requiere cambios.

> Verificar números de línea al abrir; pueden haber corrido.

### ⚠️ Primer paso — verificar el tipo de columna en Postgres
Antes de tocar código, confirmar si `orders.payment_method` es un **enum de Postgres** o
un **`text`**:
- Si es **`text`** (o varchar): no se necesita migración, solo cambios de front.
- Si es **enum**: hay que agregar el valor con `ALTER TYPE ... ADD VALUE 'credit'` →
  esto es una **migración de Supabase** y requiere **OK explícito de M Clara**
  (proyecto tartelle, migración, columna `orders.payment_method`) antes de aplicar.

Usar `list_tables` / introspección de esquema para verificar (lectura de metadata, no de datos de tabla).

### Cambios de front
- `types.ts`: agregar `'credit'` al union `PaymentMethod`.
- `constants.ts`: agregar `credit: 'Crédito'` a `PAYMENT_METHOD_LABELS` (con su color si aplica al patrón existente).
- `OrderCreateView.tsx`:
  - "Crédito" **visible siempre** en el selector (no restringido a B2B).
  - Crédito **no** muestra el `PhotoUpload` del comprobante (igual que cash/rappi).
  - El pedido a crédito queda en `payment_status: 'pending'` (paga después). Verificar que la lógica de `payment_status` no lo marque `paid` por error.
- Revisar que cualquier `switch`/render que dependa de `PaymentMethod` maneje el nuevo valor (TS lo va a marcar si falta un caso).

### Fuera de alcance
- No agregar drag-drop ni obligatoriedad de comprobante (eso es Tier 2).

### Criterios de aceptación
- [ ] "Crédito" aparece como opción de método de pago en la creación de pedidos, siempre.
- [ ] Elegir Crédito no pide comprobante.
- [ ] El pedido a crédito se guarda con `payment_status: 'pending'`.
- [ ] `npm run build` (tsc -b) pasa. `npm run lint` limpio.
- [ ] Si la columna era enum: migración aplicada solo tras OK explícito; tipos regenerados (`generate_typescript_types`) y `app/src/lib/types.ts` actualizado.

---

## Item #4 — Bloqueo same-day → confirmación

### Objetivo
El bloqueo físico de pedidos para el mismo día debería ser solo una notificación: que le
avise a la operaria que debe confirmar con cocina antes de montar ese pedido, no que se lo
impida.

### Estado actual (verificado)
Doble bloqueo:
- `app/src/views/OrderCreateView.tsx` (~línea 489): `min={today()}` en el `<input type="date">` impide elegir hoy desde el date picker. Default de fecha = `tomorrow()` (~39).
- `app/src/hooks/useOrders.ts` (~líneas 7–21): `validateOrderStock(items, deliveryDate)` devuelve los productos con `requires_advance_order: true` cuando `deliveryDate === today()`.
- `OrderCreateView.tsx` (~líneas 133–146): si `blocked.length > 0`, muestra toast de error **"No disponible para hoy. Elige otra fecha de entrega."** y aborta el submit (`return`).

> Verificar números de línea al abrir; pueden haber corrido.

### Cambios
- Quitar `min={today()}` del date input para permitir elegir hoy.
- Reemplazar el rechazo duro por una **confirmación explícita**:
  - Cuando `validateOrderStock` devuelva productos bloqueados (mismo alcance: solo `requires_advance_order` en el día), mostrar un **diálogo de confirmación** del tipo
    **"Este pedido es para hoy y hay productos que requieren anticipación. Confirma con cocina antes de montarlo. ¿Continuar?"**
  - Si la operaria acepta → continuar con el guardado normal.
  - Si cancela → no guardar (sin error).
- Mantener `tomorrow()` como fecha por defecto (no cambiar el default; solo dejar de prohibir hoy).
- Usar el patrón de diálogo/confirmación ya presente en la app si existe; si no, uno simple consistente con el estilo (CSS vars, touch targets `min-h-[44px]`/`min-h-[48px]`).

### Criterios de aceptación
- [ ] Se puede seleccionar la fecha de hoy en el date picker.
- [ ] Crear un pedido para hoy con productos que requieren anticipación muestra la confirmación; al aceptar, guarda.
- [ ] Cancelar la confirmación no guarda y no muestra error.
- [ ] Pedidos para hoy sin productos `requires_advance_order` guardan sin fricción.
- [ ] Pedidos para fechas futuras no muestran ninguna confirmación.
- [ ] `npm run build` pasa. `npm run lint` limpio.

---

## Verificación (ambos items)

Desde `/app`: `npm run dev`. En el preview:
1. Crear pedido → ver "Crédito" en métodos; elegirlo → no pide comprobante; guardar → `payment_status` pending.
2. Cambiar fecha de entrega a hoy con un producto que requiere anticipación → aparece confirmación; aceptar → guarda; repetir y cancelar → no guarda.
3. Pedido para hoy con producto que NO requiere anticipación → sin confirmación.

## Supabase
- Item #4: ningún cambio de datos/esquema.
- Item #1: cambio de esquema **solo si** `payment_method` es enum → requiere OK explícito de M Clara antes de `apply_migration`. Si es `text`, no se toca la base.
