# Contexto del proyecto: Tartelle

## Qué es
Tartelle es una plataforma de gestión de pedidos y producción para una pastelería artesanal (tartas de queso, tartas, bites) en Medellín, Colombia. Reemplaza el caos de Excel + 4 grupos de WhatsApp + POS Siigo con un sistema de operaciones en tiempo real. La dueña se llama Andrea.

**Problema que resuelve:** sobreventas (mismo producto vendido en WhatsApp Y Rappi), inventario ciego, facturación manual (50+/semana), sin trazabilidad de clientes ni entregas.

**Fases:** Fase 1 construida (pedidos, inventario, cocina, panel admin, vista domiciliario). Fases 2–5 pendientes: WhatsApp API, materias primas, CRM, sync Rappi, automatización Siigo.

---

## Stack técnico
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS 4
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime)
- **Proyecto Supabase ID:** `tnxhjvmkoplfyynicajn`
- **Dev server:** `npm run dev` desde `/app` → localhost:5173
- **No hay tests.** `tsc -b` es el type check.

---

## Arquitectura

**Routing:** Hash-based — `#dashboard`, `#orders`, `#kitchen`, `#inventory`, `#production`, `#create`. Definido en `app/src/App.tsx`.

**Auth y roles:** Supabase email/password. Rol en `user_metadata.role`: `'admin' | 'kitchen' | 'driver'`.
- Cocina → va directo a KitchenView
- Domiciliario → va a DomiciliarioView (URL standalone, sin sidebar, sin auth en Fase 1)
- Admin → ve todo con sidebar

**Capa de datos — patrón de hooks:**
```
Vista → hook → supabase.from(...) → canal realtime (debounced 400ms)
```
Las vistas NUNCA llaman Supabase directamente. Todo va por hooks en `app/src/hooks/`.

**Hooks principales:**
- `useOrders(startDate, endDate)` → `orders`, `loading`, `refetch`, `createOrder`, `updateOrderStatus`, `updateOrderFields`
- `useInventory()` → `inventory`, `refetch`, `adjustInventory(productId, change, reason)`
- `useProducts()` → `products`, `loading` (productos activos, ordenados por sabor/tamaño)
- `useCustomerSearch` / `useRecentCustomers` / `createCustomer`

---

## Flujo de estados de pedido
```
pending → confirmed → in_production → ready → dispatched → delivered
```
Definido en `NEXT_STATUS_ACTION` y `ORDER_STATUS_FLOW` en `app/src/lib/constants.ts`.

---

## Cocina — dos modos distintos

**Modo Producción (mañana):** La cocina trabaja en lotes totalizados por producto. Ejemplo: "10 grandes original, 5 medianas pistacho". NO ven pedidos individuales durante producción. Se pueden agregar ítems al vuelo ("añadir a producción" para productos del día como bites).

**Modo Despacho (tras producción):** Vista por pedido con nombre del cliente, pickup/domicilio, estado de pago, instrucciones de empaque (regalo, "marcada por 10 porciones"), dirección. Aquí sí hay detalle por orden.

**Regla crítica:** KitchenView siempre tiene estos dos modos. Nunca mostrar datos por pedido en modo producción.

---

## Catálogo de productos

Campo `catalog`: `'retail' | 'eventos' | 'ambos' | 'cafe_velez'`
- `retail` — tienda/WhatsApp/walk-in
- `eventos` — catering/B2B (Bites x16, etc.)
- `ambos` — aparece en ambos (torta en capacillo unitaria, tarta de queso)
- `cafe_velez` — productos exclusivos Café Vélez (tienen "CAFE VELEZ" en el nombre)

Orden de categorías en la grilla: `['tarta', 'bites', 'torta', 'cucheareable', 'galleta', 'complemento', 'otro', 'brownie']`

---

## Domiciliario (John)
Vista standalone accesible desde Chrome (sin instalar app). Muestra entregas del día, botones "Recogido" y "Entregado" con timestamps, subida de foto de factura firmada (B2B), dirección con link a Google Maps, teléfono con tap-to-call. Mobile-first, botones grandes.

---

## Storage (fotos de pedidos)
Bucket: `order-photos`. Paths: `{orderId}/{type}-{timestamp}.jpg`. Tipos: `dispatch`, `receipt`, `invoice`.

---

## Precios y moneda
COP (pesos colombianos). Siempre usar `formatCOP()` → formatea enteros como `$ 154.000`.

---

## Archivos clave

| Archivo | Qué hace |
|---|---|
| `app/src/lib/types.ts` | Todos los interfaces y tipos |
| `app/src/lib/constants.ts` | Labels, colores, flujo de estados, orden de categorías |
| `app/src/lib/utils.ts` | `formatCOP`, `formatDate`, `today()`, `tomorrow()`, `cn()` |
| `app/src/lib/storage.ts` | Upload/download fotos con compresión client-side |
| `app/src/lib/orderParser.ts` | Parser NLP para pedidos de WhatsApp (fechas en español, match difuso de productos) |
| `app/src/index.css` | Tailwind + variables CSS (paleta de colores, colores de estado) |

---

## Convenciones de estilos
- Colores via variables CSS (`var(--color-accent)` para el teal de Tartelle, `var(--color-bg)` para fondo) — no hex hardcodeado.
- Colores de estado en `STATUS_COLORS` en `constants.ts`.
- Vistas de cocina/domiciliario usan dark mode hardcodeado: `bg-[#111827]` / `bg-[#1F2937]` / `border-[#374151]`.
- Touch targets mínimos: `min-h-[44px]` botones normales, `min-h-[48px]` acciones primarias.

---

## Cambios de schema
Supabase MCP → `apply_migration`. Cambios de datos → `execute_sql`. Tras cambio de schema: regenerar tipos con `generate_typescript_types` y actualizar `app/src/lib/types.ts`.
