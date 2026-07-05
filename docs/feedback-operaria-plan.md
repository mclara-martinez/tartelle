# Plan — Feedback de la operaria (Tartelle)

> Capturado: 2026-06-29. Origen: feedback de la operaria de pedidos.
> Estado: blueprint aprobado, pendiente de ejecutar por tiers en sesiones separadas.

Cada item fue aterrizado contra el código real. Las decisiones de alcance ya están
tomadas (ver "Decisiones"). No ejecutar fuera del tier que corresponda a la sesión.

---

## Tiers

| Tier | Items | Estado | Notas |
|---|---|---|---|
| **Tier 1** | #1 Método "Crédito" · #4 Same-day → confirmación | ✅ **EN CÓDIGO** | Verificado por lectura directa 2026-06-29. Migración del CHECK constraint aplicada (permite `credit` y `bold`). |
| **Tier 2** | #2 Comprobante drag-drop + obligatorio | ✅ **EN CÓDIGO** | `PhotoUpload` con drag/paste + validación transfer/bold. |
| **Tier 3** | #3 Edición de pedidos · #5 Toppings | ✅ **VERIFICADO E2E 2026-07-04** | #3 probado en app corriendo incluyendo guardado real en DB (con OK de M Clara) y revertido; campos fecha/dirección/descuento agregados (commits `c6b7597`, guards en `ad962e1`). #5: los toppings ya aparecen en pedidos reales de clientes (p.ej. "Original + Frutos Rojos"). |

> **Nota 2026-06-29**: al implementar #3 se descubrió que Tier 1 y Tier 2 ya estaban
> implementados en `main` (probablemente commit `0e88bd3` "fix: varios bugs UX"). Los
> reportes de los agentes exploradores estaban desactualizados. Estado confirmado por
> lectura directa de: `types.ts`, `constants.ts` (`PAYMENT_METHOD_LABELS`),
> `PhotoUpload.tsx`, `OrderCreateView.tsx`. Solo queda **verificar en la app corriendo**.

Orden restante: **#3 (en curso) → #5**.

---

## Decisiones tomadas

- **#1 Crédito**: visible **siempre** (no restringido a B2B).
- **#2 Comprobante**: obligatorio para guardar en **transferencia y Bold**. Agregar drag-and-drop **y pegar (Ctrl+V)**.
- **#3 Edición**: **edición completa de líneas** (agregar/quitar productos, cambiar cantidad y precio por línea, domicilio editable incl. $0, notas, campo tarjeta).
- **#4 Same-day**: **confirmación explícita** (deja elegir hoy; diálogo "Confirma con cocina antes de montar" que la operaria acepta para continuar).
- **#5 Toppings**: **productos add-on separados** (encaja con la arquitectura actual).

---

## Item #1 — Método de pago "Crédito"  · Tier 1

**Para qué**: los restaurantes no pagan por anticipado sino a los días de recibir producto+factura.

**Estado actual**: 4 métodos `transfer | cash | bold | rappi` en
[`types.ts:12`](../app/src/lib/types.ts) y [`constants.ts:99`](../app/src/lib/constants.ts).

**Cambios**:
- Agregar `'credit'` al union `PaymentMethod` → label "Crédito" + color en `PAYMENT_METHOD_LABELS`.
- Crédito **no** pide comprobante y deja el pedido en `payment_status: 'pending'` (paga después).
- Visible siempre en el selector de método de pago.

**⚠️ Primer paso de la sesión**: verificar si la columna `payment_method` en Postgres es
`enum` (→ migración, pide OK Supabase) o `text` (→ sin migración).

---

## Item #4 — Bloqueo same-day → confirmación  · Tier 1

**Para qué**: el bloqueo físico impide montar pedidos de hoy; debería solo avisar que confirme con cocina.

**Estado actual**: doble bloqueo —
- `min={today()}` en el date picker ([`OrderCreateView.tsx:489`](../app/src/views/OrderCreateView.tsx)) impide elegir hoy.
- `validateOrderStock` rechaza con toast de error los productos `requires_advance_order` el mismo día ([`useOrders.ts:7`](../app/src/hooks/useOrders.ts), [`OrderCreateView.tsx:133`](../app/src/views/OrderCreateView.tsx)).

**Cambios**:
- Quitar `min={today()}` para permitir elegir hoy.
- Reemplazar el rechazo por un **diálogo de confirmación** "Confirma con cocina antes de montar este pedido" que la operaria acepta para continuar. Mantener el disparo solo en productos `requires_advance_order` (mismo alcance, pero ya no bloquea).

---

## Item #2 — Comprobante: drag-drop + obligatorio  · Tier 2

Detalle completo y ejecutable en **[`tier2-comprobante-dragdrop.md`](tier2-comprobante-dragdrop.md)**.

Resumen: el `PhotoUpload` hoy es solo click → file picker ([`PhotoUpload.tsx:65`](../app/src/components/PhotoUpload.tsx)) y el comprobante es **opcional** ([`OrderCreateView.tsx:555`](../app/src/views/OrderCreateView.tsx)).
- Agregar zona drag-and-drop **y pegar (Ctrl+V)**.
- Bloquear guardado si método es `transfer` o `bold` y no hay comprobante.

---

## Item #3 — Edición completa de pedidos  · Tier 3  ✅ IMPLEMENTADO 2026-06-29 (pendiente verificación en app con login)

**Implementación**:
- `useOrders.ts` → nueva función `updateOrderItems(orderId, items, fields)`: reemplaza
  `order_items` (delete + insert), recalcula `subtotal`/`total` y persiste `delivery_fee`,
  `discount`, `notes`. Solo se llama con el pedido antes de `ready` (gate `canEditItems`).
- `OrderDrawer.tsx` → modo edición (botón "Editar" en el header):
  - Líneas editables (cantidad ±, precio c/u, agregar producto vía buscador, eliminar a 0)
    **solo en estados `confirmed`/`in_production`**; en `ready`+ se muestran bloqueadas con aviso.
  - Domicilio (`delivery_fee`) editable siempre, incl. $0.
  - Notas/tarjeta editables siempre (reusa `notes`, sin esquema nuevo).
  - Recálculo en vivo de subtotal/total. Guardar/Cancelar en el footer.
- Cocina: `KitchenDispatchMode` ya muestra `order.notes` → la tarjeta (en notes) ya es visible ahí.

**Limitación v1 conocida**: el `discount` se conserva como valor absoluto; si se editan
líneas no se recalcula proporcionalmente al % del cliente. Aceptable para v1.

**Verificación hecha**: `tsc -b` OK, Vite sirve sin errores, bundle renderiza. Falta probar
el flujo interactivo con sesión iniciada (requiere credenciales).

---

### Diseño original (referencia)

**Para qué**: domicilio gratis para algunos clientes, productos adicionales después de montar el pedido, notas/tarjeta agregadas a las horas.

**Estado actual**: todo **read-only** tras crear. `OrderDrawer` es informativo, sin UI de edición
([`OrderDrawer.tsx:129`](../app/src/components/OrderDrawer.tsx)). `updateOrderFields` existe pero sin interfaz
([`useOrders.ts:120`](../app/src/hooks/useOrders.ts)). `delivery_fee` fijo $8.000, no editable. **No existe campo "tarjeta"** (solo `notes`).

**Cambios**:
- UI de edición en `OrderDrawer`: agregar/quitar productos, editar cantidad y **precio por línea**, domicilio editable (incl. $0), notas.
- Recálculo de `subtotal`/`total`; alta/baja/update en `order_items`.
- Campo dedicado **`card_message`** para la tarjeta (no mezclar con `notes`) → cambio de esquema, pide OK Supabase.

---

## Item #5 — Toppings como productos  · Tier 3  ✅ IMPLEMENTADO 2026-06-29

**Implementación**: se crearon 16 productos en `products` (proyecto tartelle), SKU `PT92`–`PT107`,
con aprobación explícita de M Clara (SELECT + INSERT). Sabor base Original + topping, categoría
`tartas`, catalog `retail`, `tax_type` null, `requires_advance_order` = true en mediana/grande y
false en porción/mini (igual que las tartas Original). Tamaño `porcion` ya existía en el enum.

| SKU | Topping | Porción 22k | Mini 53k | Mediana 123k | Grande 163k |
|---|---|---|---|---|---|
| PT92-95 | Original + Arequipe | ✓ | ✓ | ✓ | ✓ |
| PT96-99 | Original + Frutos Rojos | ✓ | ✓ | ✓ | ✓ |
| PT100-103 | Original + Crema de Milo | ✓ | ✓ | ✓ | ✓ |
| PT104-107 | Original + Nutella | ✓ | ✓ | ✓ | ✓ |

**Sin cambio de front-end**: la grilla de pedidos (`OrderCreateView`) es data-driven — agrupa por
categoría `tartas` y tamaño, y la etiqueta de cada card es el `flavor`. Los nuevos aparecen
automáticamente bajo Tartas (pestañas porción/mini/mediana/grande) como "Original + Arequipe", etc.

**Pendiente de verificar en app con login**: que se vean en la grilla y se puedan agregar a un pedido.

---

### Diseño original (referencia)

**Para qué**: las tartas con topping no aparecen en el catálogo y tienen precio distinto a la tarta original.

**Estado actual**: los toppings **no existen como producto**. Los sabores completos (Milo, Pistacho…) sí son SKUs propios, pero los toppings sobre tarta base solo viven como texto libre en `packaging_notes`. Sin SKU, sin precio, sin UI.

**Datos confirmados por la operaria**:

Toppings: **arequipe, frutos rojos, crema de milo, nutella** (mismo precio entre ellos).

Precio de la tarta **con topping**, por tamaño:

| Tamaño | Precio con topping |
|---|---|
| Porción individual | $22.000 |
| Mini | $53.000 |
| Mediana | $123.000 |
| Grande | $163.000 |

**Semántica confirmada por la operaria (2026-06-29)**:
- Los precios son el **precio total** de la tarta ya con topping (no un recargo que se suma).
- El topping va **solo sobre la tarta Original** (sabor base original), no sobre otros sabores.
- Los 4 toppings (arequipe, frutos rojos, crema de milo, nutella) **comparten precio** por tamaño.
- Por tanto el modelado real NO es "add-on en línea aparte" sino **productos variante
  "Tarta Original con [topping]" por tamaño**, cada uno con su precio. El topping es la
  selección de sabor y no cambia el precio.

**Modelado resultante** (resolver detalles al ejecutar):
- Productos a crear = 4 toppings × 4 tamaños = **16 SKUs** (o 4 productos por tamaño con
  selector de topping, ya que el precio no cambia — decidir UI al inicio de la sesión).
- Precios por tamaño: porción individual $22.000 · mini $53.000 · mediana $123.000 · grande $163.000.
- **"Porción individual" es un tamaño nuevo** que no existe en `ProductSize` hoy — agregarlo.
- Categoría `tarta`, catalog `retail` (como las tartas actuales).
- Crear productos en Supabase = `INSERT` → **pide OK explícito** en esa sesión.
