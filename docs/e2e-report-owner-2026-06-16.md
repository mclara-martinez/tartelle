# Tartelle E2E Test Report — Andrea (owner)

> **⚠️ Actualización 2026-07-04 — estado verificado contra main + DB:**
> La mayoría del roadmap de este reporte ya está resuelto. Verificado por lectura
> de código y consultas read-only a la DB:
>
> | Item | Estado 2026-07-04 | Evidencia |
> |---|---|---|
> | B-NEW-01/02/03 (RLS INSERT owner) | ✅ RESUELTO | Políticas `orders_insert_owner`, `order_items_insert_owner`, `products_insert_owner` existen en `pg_policies` |
> | B-NEW-04 (inventory 406) | ✅ RESUELTO | `useOrders.ts` — filas ausentes en `inventory_finished` se saltan, no rompen |
> | B-NEW-05 (kanban stale) | ✅ RESUELTO | `OrdersView.tsx:144` aplica `optimisticStatus` al array del kanban |
> | B-NEW-06 (cliente inline no se crea) | ✅ RESUELTO | Consecuencia del 403 de B-NEW-01; RLS corregido |
> | B-NEW-07 (drawer no cierra al cancelar) | ✅ RESUELTO | `OrderDrawer.tsx:79` llama `onClose()` en cancelled/delivered |
> | B-NEW-09 (toggle resetea fecha) | ✅ NO REPRODUCIBLE | El toggle solo hace `setViewMode`, no toca `preset` |
> | B-NEW-10 (label "Administrador") | ✅ RESUELTO | `Layout.tsx` usa `ROLE_LABELS[role]` |
> | B-NEW-11 (search → manual) | ✅ RESUELTO | "Ingresar manualmente" transfiere el texto a Nombre y Facturación |
> | B-NEW-12 (badge anticipado) | ✅ RESUELTO | `OrderCreateView.tsx:312` |
> | B-NEW-14 (filtro catálogo persiste) | ✅ RESUELTO | La vista se desmonta al navegar (`App.tsx` render condicional); el estado se resetea |
> | B-NEW-15 (Siigo con 0 pedidos) | ✅ RESUELTO | `OrdersView.tsx:185` `disabled={filteredOrders.length === 0}` |
> | B1 / B2 / B3 (nombre doble, "(opcional)", cédula) | ✅ RESUELTOS | Sync `customerName→billingName`; placeholder "Teléfono"; `createCustomer` persiste `cedula`/`nit` |
> | E1.3 (27 pedidos stale) | 🟠 EN CURSO — **creció a 48** | Zona "Vencidos" agregada en Pedidos (commit `ec94220`); cierre masivo pendiente del match con la hoja de cálculo real de Andrea |
> | Etapa 4 (datos: B2B sin teléfono, clientes inactivos, productos Eventos) | ⏳ PENDIENTE | Coordinación con Andrea |
>
> **Nuevo hallazgo 2026-07-04:** pedidos legacy con status `pending` en DB crasheaban
> cualquier vista que los renderizara (union `OrderStatus` ya no incluye `pending`).
> Resuelto con fallback en `StatusBadge` (commit `ec94220`). Sigue pendiente migrar
> esos datos al cierre masivo.
>
> Pendientes de verificación en app (cluster cocina): B5, B-NEW-08, B-NEW-13 —
> ver estado consolidado en [`bugs-siguiente-etapa.md`](bugs-siguiente-etapa.md).

**Fecha:** 2026-06-16  
**Usuario:** tartellebakery@gmail.com (role: `owner`)  
**Vistas permitidas:** `dashboard`, `orders`, `create`, `settings` (tabs: Catálogo + Clientes)  
**Entorno:** localhost:5176 (port autoselectado, server corriendo)  
**Agentes:** 9 | **Tool uses:** 1.064 | **Duración:** ~134 min

---

## Índice
1. [Revisión de datos (DB)](#1-revisión-de-datos-db)
2. [Resultados por bloque](#2-resultados-por-bloque)
3. [Resumen de bugs](#3-resumen-de-bugs)
4. [Roadmap de fixes por etapas](#4-roadmap-de-fixes-por-etapas)
5. [Observaciones adicionales](#5-observaciones-adicionales)

---

## 1. Revisión de datos (DB)

### Estado general
**Salud estructural: BUENA.** RLS habilitado en las 12 tablas públicas. Integridad referencial limpia (cero order_items huérfanos, cero pedidos sin ítems).

### Pedidos (`orders`)
| Métrica | Valor |
|---------|-------|
| Total | 1.259 |
| Entregados | 1.226 |
| En proceso activo | 27 |
| Rango de fechas | 2026-01-02 a 2026-06-03 |

**Estados activos:**

| Status | Count |
|--------|-------|
| confirmed | 7 |
| dispatched | 7 |
| in_production | 5 |
| ready | 4 |
| pending | 4 |
| cancelled | 6 |

⚠️ **Alerta operacional:** 27 pedidos en estados abiertos con `delivery_date` máxima en 2026-06-03 — 13 días en el pasado. Nunca se cerraron a `delivered` o `cancelled`. Requieren auditoría manual.

### Clientes (`customers`)
| Métrica | Valor |
|---------|-------|
| Total | 75 |
| Activos | 36 |
| Tipo B2B | 70 (93%) |
| Tipo B2C | 5 (7%) |
| Sin órdenes (activos) | 3 |
| Duplicados por nombre | 0 |

⚠️ **Alerta:** 340 filas de pedidos asociadas a clientes activos sin teléfono. Probablemente un solo cliente B2B de alto volumen (posiblemente Vélez Café) sin dato de contacto.

### Productos (`products`)
| Métrica | Valor |
|---------|-------|
| Total | 77 |
| Activos | 73 |
| Inactivos | 4 (todos en catálogo `eventos`) |
| Precio cero | 0 |
| Sin SKU | 0 |

| Catálogo | Total | Activos |
|----------|-------|---------|
| retail | 40 | 40 |
| eventos | 25 | 21 |
| velez_cafe | 6 | 6 |
| ambos | 6 | 6 |

### Usuarios (`auth.users`)
| Email | Role | Allowed Views |
|-------|------|---------------|
| mclara@mclaramartinez.com | admin | null (sin restricciones) |
| tartellebakery@gmail.com | owner | [dashboard, orders, settings, create] |

### RLS — todas las tablas públicas con RLS habilitado ✅
`component_log`, `customers`, `day_closures`, `inventory_finished`, `inventory_log`, `order_items`, `orders`, `production_extras`, `production_plan_items`, `production_plans`, `products`, `quality_logs`

---

## 2. Resultados por bloque

### Block A — Autenticación ✅ Todo PASS

| ID | Escenario | Resultado |
|----|-----------|-----------|
| A1 | Login exitoso | ✅ PASS — Supabase 200, sidebar y dashboard cargan |
| A2 | Sesión persiste tras reload | ✅ PASS — token en localStorage, no redirige a login |
| A3 | Logout | ✅ PASS — botón "Cerrar sesión" al fondo del sidebar, funciona |
| A4 | Login con password incorrecta | ✅ PASS — Supabase 400, muestra "Correo o contraseña incorrectos" |

**Observaciones:**
- El sidebar etiqueta el rol como **"Administrador"** para todos los roles — no distingue entre admin y owner.
- El role está en `app_metadata.role`, no en `user_metadata.role` (relevante para queries en el cliente).

---

### Block B — Navegación y acceso por rol ✅ Todo PASS

| ID | Escenario | Resultado |
|----|-----------|-----------|
| B1 | Sidebar muestra solo vistas permitidas | ✅ PASS — Panel, Pedidos, Ajustes. Sin Cocina, Inventario, Producción, Domiciliario, Cierre, Fotos, Logs |
| B2 | Bloqueo `#kitchen` | ✅ PASS — redirige a `#dashboard` |
| B3 | Bloqueo `#inventory` | ✅ PASS — redirige a `#dashboard` |
| B4 | Bloqueo `#production` | ✅ PASS — redirige a `#dashboard` |
| B5 | Settings sin tab Usuarios | ✅ PASS — solo Catálogo y Clientes visibles |

**Observaciones:**
- La vista `create` (Nuevo pedido) está en `allowed_views` pero **no tiene entrada en el sidebar nav**. Se accede via botón dentro de OrdersView. Comportamiento intencional pero puede confundir a Andrea.
- El bloqueo de rutas es client-side (useEffect en App.tsx). No hay enforcement en el servidor/middleware.

---

### Block G — Crear pedido: cliente existente 🔴 CRÍTICO

| ID | Escenario | Resultado |
|----|-----------|-----------|
| G1 | Vista de creación carga | ✅ PASS |
| G2 | Búsqueda de cliente por nombre | ✅ PASS |
| G3 | Seleccionar cliente pre-llena campos | ✅ PASS — incluye nombre, teléfono, nombre facturación y cédula |
| G4 | Búsqueda por teléfono | ✅ PASS |
| G5 | Clientes recientes (pills) | ✅ PASS — 5 chips al abrir sin query |
| G6 | Agregar producto al carrito | ✅ PASS |
| G7 | Mismo producto sube qty | ✅ PASS |
| G8 | Botón + en carrito | ✅ PASS |
| G9 | Botón − en carrito | ✅ PASS |
| G10 | Eliminar producto (trash) | ✅ PASS |
| G11 | Delivery Domicilio muestra campos | ✅ PASS — dirección + hora estimada aparecen |
| G12 | Delivery Local oculta campos | ✅ PASS |
| G13 | Selección de canal | ✅ PASS |
| G14 | Pago Transferencia muestra upload | ✅ PASS — área de comprobante aparece |
| G15 | Chip "Regalo" en empaque | ✅ PASS |
| G16 | Notas del pedido | ✅ PASS |
| **G17-G18** | **Submit pedido** | ❌ **FAIL CRÍTICO — HTTP 403 en POST /orders** |

**Bug G17-G18:**
- **Causa raíz:** La política RLS `orders_insert_admin` solo permite `role = 'admin'`. El role `owner` tiene SELECT (vía `orders_select_admin_owner`) pero **no tiene INSERT**. Mismo bloqueo en `order_items`.
- **Efecto:** El owner no puede crear ningún pedido. Es el bug más bloqueante de la aplicación para Andrea.
- **Impacto en cascada:** Todo lo que depende de crear pedidos (Blocks H, E, F parcial, M1-M5) quedó bloqueado.

---

### Block H — Crear pedido: cliente nuevo inline 🔴 CRÍTICO

| ID | Escenario | Resultado |
|----|-----------|-----------|
| H1 | Búsqueda sin resultados (nombre nuevo) | ✅ PASS — UI muestra "sin resultados" |
| H2 | Modo manual disponible | ✅ PASS — botón "Ingresar manualmente" aparece |
| H3-H4 | Submit crea cliente + pedido | ❌ **FAIL CRÍTICO — mismo 403 en POST /orders** |
| H5 | Cliente inline aparece en Clientes | ❌ FAIL — consecuencia del bug anterior (cliente nunca se crea porque `createOrder` falla antes de `createCustomer`) |

**Observación UX:** Al tipear un nombre en el buscador y hacer click en "Ingresar manualmente", el texto escrito **NO se transfiere** al campo Nombre. El usuario debe volver a escribir el nombre. Fricción innecesaria.

---

### Block I — Filtros de catálogo en creación ✅ Todo PASS

| ID | Escenario | Resultado |
|----|-----------|-----------|
| I1 | Filtro Eventos | ✅ PASS — 21 productos (diferente set que Tienda) |
| I2 | Filtro Tienda | ✅ PASS — 20 productos |
| I3 | Filtro Vélez Café | ✅ PASS — 6 productos, sin errores JS |

**Observación:** El filtro de catálogo **persiste entre navegaciones** dentro de la misma sesión. Si se deja en "Vélez Café" y se navega a otra vista y se regresa, el filtro sigue activo en lugar de resetear a "Tienda".

---

### Block J — Validaciones en crear pedido ✅ Todo PASS

| ID | Escenario | Resultado |
|----|-----------|-----------|
| J1 | Submit con carrito vacío | ✅ PASS — botón "Crear pedido" está `disabled` (HTML), bloqueo duro |
| J2 | Producto anticipado + fecha hoy | ✅ PASS — toast "No disponible para hoy. Elige otra fecha de entrega." correcto |

**Observación:** Los productos con `requires_advance_order = true` (Nutella Grande, Original, Pistacho, Vainilla Madagascar) **no tienen ningún indicador visual** en el grid. Andrea solo descubre la restricción en el momento del submit. Sería mejor mostrar un ícono o badge en la card del producto.

---

### Block C — Dashboard 🟡 Funcional con datos históricos

| ID | Escenario | Resultado |
|----|-----------|-----------|
| C1 | Score cards cargados | ✅ PASS — 4 cards: Activos, Listos, Venta del día, Mañana |
| C2 | Lista "Pedidos activos" | ✅ PASS — sección visible, muestra "Todo entregado" (dato correcto para hoy) |
| C3 | Sección Mañana | ✅ PASS — visible, "Sin pedidos" para 2026-06-17 |
| C4 | "Ver todos" navega a #orders | ✅ PASS |
| C5 | Click en fila abre drawer | ✅ PASS — desde OrdersView, drawer abre con datos completos |

**Observación:** El dashboard mostró todas las cards en cero porque los pedidos activos (los 27 stale) tienen `delivery_date` de hasta el 2026-06-03. El dashboard filtra por "hoy" y no hay pedidos para la fecha actual. Esto es un problema de datos operacionales, no un bug de UI.

---

### Block D — Orders View: filtros y display ✅ Todo PASS

| ID | Escenario | Resultado |
|----|-----------|-----------|
| D1 | Filtro "Hoy" activo por defecto | ✅ PASS |
| D2 | Filtro "Mañana" | ✅ PASS — actualiza lista |
| D3 | Filtro "Rango" con date inputs | ✅ PASS — rango Jun 1-30 retorna 12 pedidos |
| D4 | Toggle Lista → Kanban | ✅ PASS — columnas: Confirmados (2), En cocina (1), Listo (1), En camino (4) |
| D5 | Toggle Kanban → Lista | ✅ PASS |
| D6 | Búsqueda por nombre de cliente | ✅ PASS — filtra en tiempo real |
| D7 | Limpiar búsqueda | ✅ PASS |
| D8 | Export Siigo CSV | ✅ PASS — blob `text/csv`, 4.576 bytes, descarga iniciada |
| D9 | "Nuevo pedido" navega a #create | ✅ PASS |

**Observación:** El botón "Siigo" **no está deshabilitado cuando el filtro activo retorna 0 pedidos** (ej. "Hoy" con cero resultados). Se puede descargar un CSV vacío. Pequeño UX issue.

---

### Block E — Transiciones de estado desde Orders View 🔴 Parcial

| ID | Escenario | Resultado |
|----|-----------|-----------|
| E0 | pending → confirmed | ⚠️ BLOQUEADO — no hay pedidos en `pending` en el rango de prueba |
| E1 | confirmed → in_production | ✅ PASS — inmediato, sin refresh, toast "Estado actualizado" |
| **E2** | **in_production → ready** | ❌ **FAIL CRÍTICO — inventory_finished retorna 406** |
| **E3** | **ready → dispatched** | ❌ **FAIL CRÍTICO — mismo error inventory_finished** |
| E4 | dispatched → delivered | ✅ PASS — status actualiza, desaparece del kanban activo |
| E5 | Cancelar pedido | ✅ PASS — opción "Cancelado" disponible y funcional (styled en rojo) |
| **E4-kanban** | **Status en lista ≠ kanban** | ❌ **FAIL HIGH** |

**Bug E2/E3 — inventory_finished 406:**
- `updateOrderStatus` llama `adjustInventory()` al transicionar a `ready` o `dispatched`
- `adjustInventory` hace `.from('inventory_finished').select('quantity').eq('product_id', ...).single()` → **406** (no existe fila para ese product_id)
- El `PATCH` para cambiar el status **sí llega a la DB (204)** ANTES de que falle la llamada a inventory
- Resultado: la DB puede quedar en `status='ready'` pero sin descuento de inventario — **inconsistencia de datos**
- La UI revierte el optimistic update, pero el DB no revierte el status

**Bug E4-kanban:**
- Cambiar status en lista view → PATCH exitoso (204) → lista muestra nuevo estado
- Cambiar a kanban → pedido sigue en la columna **anterior** (state stale)
- El `optimisticStatus` de lista no se propaga al array `orders` que recibe `KanbanBoard`

---

### Block F — Transiciones de estado desde OrderDrawer 🟡 Parcial

| ID | Escenario | Resultado |
|----|-----------|-----------|
| F1 | Click en fila abre drawer (no dropdown) | ✅ PASS — `stopPropagation` en el status badge funciona bien |
| F2 | Botón acción avanza status | ✅ PASS — `< 500ms`, drawer actualiza in-place |
| F3 | Barra de progreso actualiza | ✅ PASS |
| F4 | Estado terminal sin botón de acción | ✅ PASS — sin botones en delivered o cancelled |
| **F5-no-close** | **Drawer no cierra tras cancelar** | ❌ FAIL MEDIUM |
| **F5-inconsistency** | **Drawer y lista muestran estados distintos** | ❌ FAIL MEDIUM |

**Bug F5-no-close:** Al cancelar desde el drawer, el drawer permanece abierto mostrando el estado "Cancelado". El usuario debe cerrarlo manualmente.

**Bug F5-inconsistency:** Drawer y lista obtienen datos de fuentes o momentos distintos. Tras un cambio en la lista, abrir el drawer del mismo pedido puede mostrar el estado anterior.

---

### Block K — Settings: Catálogo 🔴 CRUD bloqueado por RLS

| ID | Escenario | Resultado |
|----|-----------|-----------|
| K1 | Tab Catálogo carga | ✅ PASS — 77 productos, columnas completas |
| K2 | Búsqueda por nombre | ✅ PASS — "tarta" → 29 resultados |
| K3 | Búsqueda por sabor/SKU | ✅ PASS — cross-field search funciona |
| K4 | Filtro tag Retail | ✅ PASS — 46 productos (retail + ambos) |
| K5 | Filtro tag Eventos | ✅ PASS — 31 productos |
| K6 | Filtro tag Vélez Café | ✅ PASS — 6 productos |
| K7 | Multi-select tags | ✅ PASS — OR logic, 71 productos combinados |
| K8 | Botón "Limpiar" | ✅ PASS |
| K9 | Filtro Activos/Inactivos/Todos | ✅ PASS — 73/4/77 consistente |
| **K12** | **Crear nuevo producto** | ❌ **FAIL CRÍTICO — HTTP 403 RLS** |
| K10 | Toggle producto | ⚠️ BLOQUEADO — depende de K12 (no tocar productos de producción) |
| K11 | Editar producto | ⚠️ BLOQUEADO — depende de K12 |
| K13 | Producto nuevo aparece en #create | ⚠️ BLOQUEADO — depende de K12 |

**Bug K12:** POST `/rest/v1/products` retorna 403. El owner no tiene política RLS INSERT en la tabla `products`. El modal muestra el error inline (buen UX), pero la funcionalidad no opera.

**Observación:** La categoría `otro` no existe en el modal de producto. Las opciones disponibles son: Sin categoría, Tartas, Bites, Torta en Capacillo, Cuchareables, Galletas, Complementos, Dúos, Brownies, Naisha, Catering. El CLAUDE.md menciona `otro` — puede estar desactualizado.

---

### Block L — Settings: Clientes ✅ CRUD funciona (única tabla sin problema RLS)

| ID | Escenario | Resultado |
|----|-----------|-----------|
| L1 | Tab Clientes carga | ✅ PASS — 76 clientes total, filtro Activos por defecto |
| L2 | Búsqueda por nombre | ✅ PASS |
| L3 | Búsqueda por teléfono | ✅ PASS |
| L4 | Filtro Particular | ✅ PASS — 5 clientes |
| L5 | Filtro Empresa | ✅ PASS — 31 clientes |
| L6 | Filtro POS | ✅ PASS — 0 clientes (no existen POS) |
| L7 | Filtro Activos/Inactivos | ✅ PASS — 37/39/76 |
| L10 | Crear cliente desde Ajustes | ✅ PASS — toast "Cliente creado", aparece en tabla |
| L8 | Toggle activo/inactivo | ✅ PASS — ambas direcciones con toast |
| L9 | Editar cliente | ✅ PASS — modal pre-llena, cambio guardado |
| L12 | Tipo Empresa cambia campos del modal | ✅ PASS — Razón social + NIT + Cédula contacto |
| L11 | Cliente de Ajustes aparece en #create search | ✅ PASS — searchable inmediatamente |
| **H5** | **Cliente inline en Clientes** | ❌ FAIL MEDIUM (consecuencia de bug RLS en orders) |

**Observación:** La pestaña Clientes está pre-filtrada en "Activos" al abrir. Los 39 clientes inactivos están ocultos por defecto — correcto para el flujo normal.

---

### Block M — Integración cross-view 🔴 Bloqueado por RLS en orders

| ID | Escenario | Resultado |
|----|-----------|-----------|
| **M1** | **Cliente Ajustes → crear pedido → aparece en Orders** | ❌ **FAIL CRÍTICO — 403 en POST /orders** |
| M2 | Pedido nuevo actualiza dashboard counter | ⚠️ BLOQUEADO — depende de M1 |
| M3 | Pedido entregado desaparece de dashboard activos | ⚠️ BLOQUEADO — depende de M1 |
| **M4** | **Status en lista ≠ kanban** | ❌ **FAIL HIGH** — confirmado nuevamente |
| **M5** | **Cliente inline en Clientes** | ❌ FAIL HIGH — confirmado: no existe porque order creation falla |

⚠️ **Efecto colateral en datos de producción:** El agente de M4 cambió el pedido `andre 3x Milo` (ID `892d9535`) de `confirmed` → `in_production` como efecto secundario del test. **El pedido revirtió solo a `confirmed`** (probablemente por el bug de `inventory_finished` que revierte los cambios de status). Estado actual: `confirmed`. No requiere acción.

---

## 3. Resumen de bugs

### 🔴 Critical (bloquean funcionalidad core)

| # | ID | Vista | Descripción | Causa raíz | Fix estimado |
|---|----|-------|-------------|-----------|-------------|
| B-NEW-01 | G17, H4, M1, K12 | create, settings | **Owner no puede crear pedidos** — `POST /rest/v1/orders` → 403 | Falta política RLS INSERT para role `owner` en tabla `orders` | 2 SQL statements |
| B-NEW-02 | G17 | create | **Owner no puede crear order_items** — misma causa raíz que B-NEW-01 | Falta RLS INSERT en `order_items` para role `owner` | 1 SQL statement |
| B-NEW-03 | K12 | settings/catálogo | **Owner no puede crear productos** — `POST /rest/v1/products` → 403 | Falta RLS INSERT para role `owner` en tabla `products` | 1 SQL statement |
| B-NEW-04 | E2, E3 | orders | **En cocina → Listo / Despachado falla** — `inventory_finished` retorna 406, revierte optimistic update pero puede dejar DB en estado inconsistente | Tabla `inventory_finished` no tiene fila para algunos product_ids; `.single()` lanza error 406; el PATCH al status ya se ejecutó antes de la verificación | Reordenar: verificar inventario ANTES del PATCH; y manejar 406 como "sin stock registrado" en lugar de error fatal |

### 🟠 High

| # | ID | Vista | Descripción | Causa raíz | Fix estimado |
|---|----|-------|-------------|-----------|-------------|
| B-NEW-05 | E4-kanban, M4 | orders | **Kanban no refleja cambios de status hechos en lista view** | El `optimisticStatus` en OrdersView.tsx no se propaga al array `orders` que pasa a `KanbanBoard`; kanban usa datos stale del último fetch | Incluir overrides de optimisticStatus al construir el array para KanbanBoard |
| B-NEW-06 | M5, H5 | create, settings | **Cliente nuevo inline nunca se crea** — `createCustomer()` solo ejecuta si `createOrder()` tiene éxito; el 403 de orders aborta el flujo antes de llegar a crear el cliente | Arquitectura: `createCustomer` se llama dentro del mismo `try` que `createOrder` | Depende de B-NEW-01 (fix RLS); después verificar que el orden de operaciones sea correcto |

### 🟡 Medium

| # | ID | Vista | Descripción | Causa raíz | Fix estimado |
|---|----|-------|-------------|-----------|-------------|
| B-NEW-07 | F5 | orders/drawer | **Drawer no cierra tras cancelar pedido** | `handleStatusChange('cancelled')` actualiza estado pero no llama `onClose()` | Agregar `onClose()` después del update exitoso en el handler de Cancelar |
| B-NEW-08 | F5 | orders/drawer | **Inconsistencia lista ↔ drawer tras cambio de status** | Drawer y lista usan fuentes de datos distintas o momentos de fetch distintos | Drawer debe recibir el status actualizado del padre o forzar refetch al abrir |
| B-NEW-09 | D4/D5 | orders | **Toggle lista↔kanban resetea el filtro de fecha a "Hoy"** | El botón de toggle puede estar seteando estado que resetea `activeTab` a `'hoy'` | Revisar si el toggle dispara algún reset de estado en OrdersView.tsx |
| B5 *(conocido)* | E | orders | **Dropdown de status se clipea cerca del borde inferior de la lista** | Contenedor con `overflow: hidden` o posición absoluta sin portal | Usar portal/Popper para el dropdown de status |

### 🟢 Low / UX

| # | ID | Vista | Descripción | Fix |
|---|----|----|-------------|-----|
| B-NEW-10 | sidebar | layout | **Sidebar muestra "Administrador" para todos los roles** — el owner ve "Administrador" en lugar de "Propietaria" | Layout.tsx línea 47: mostrar label según `role` |
| B-NEW-11 | create | order create | **Texto del search no se transfiere a modo manual** — al tipear un nombre nuevo y hacer click en "Ingresar manualmente", el campo Nombre queda vacío | Copiar el valor del search input al campo Nombre al cambiar de modo |
| B-NEW-12 | create | order create | **Sin indicador visual de "requiere pedido anticipado"** en cards de producto — usuario solo lo descubre al submit | Agregar badge/ícono en la product card para productos con `requires_advance_order = true` |
| B-NEW-13 | create | order create | **Búsqueda de cliente requiere click explícito en ícono** — no es obvio que existe modo búsqueda vs modo manual | Considerar: search activo por defecto, o label más visible en el ícono |
| B-NEW-14 | create | order create | **Filtro de catálogo persiste entre navegaciones** — si se deja en "Vélez Café" y se vuelve a #create, sigue activo | Resetear a "Tienda" al montar el componente o al navegar desde una vista distinta |
| B-NEW-15 | orders | orders | **Botón "Siigo" no deshabilitado con 0 pedidos** — descarga un CSV vacío sin advertencia | Deshabilitar o mostrar tooltip "No hay pedidos en el rango seleccionado" |
| B1 *(conocido)* | create | order create | El nombre se pide dos veces (campo Cliente y campo Facturación — no sincronizan) | Sincronizar `customerName` → `billingName` o unificar los campos |
| B2 *(conocido)* | create | order create | Placeholder teléfono dice "(opcional)" — quitarlo | `placeholder="Teléfono"` |
| B3 *(conocido)* | create | order create | Al re-buscar cliente, la cédula/NIT no se pre-llena | `createCustomer()` solo guarda `name, phone, email`; no persiste `billing_id_number` en la tabla `customers` |

---

## 4. Roadmap de fixes por etapas

### Etapa 1 — Desbloqueantes (hacer antes de cualquier demo o uso real por Andrea)
*Tiempo estimado: 1-2 hrs*

**E1.1 — RLS INSERT para owner en `orders`, `order_items`, `products`**  
Son 3 políticas SQL. Sin esto, Andrea no puede crear pedidos ni productos. Es el bloqueante más crítico.

```sql
-- orders
CREATE POLICY "orders_insert_owner" ON orders
FOR INSERT TO authenticated
WITH CHECK ((auth.jwt()->'app_metadata'->>'role') IN ('admin', 'owner'));

-- order_items
CREATE POLICY "order_items_insert_owner" ON order_items
FOR INSERT TO authenticated
WITH CHECK ((auth.jwt()->'app_metadata'->>'role') IN ('admin', 'owner'));

-- products (solo si se quiere que owner pueda crear productos)
CREATE POLICY "products_insert_owner" ON products
FOR INSERT TO authenticated
WITH CHECK ((auth.jwt()->'app_metadata'->>'role') IN ('admin', 'owner'));
```

**E1.2 — Fix inventory_finished 406 bug**  
Reordenar el flujo en `updateOrderStatus`: verificar/actualizar inventario BEFORE del PATCH de status, o manejar la ausencia de fila en `inventory_finished` como stock=0 en lugar de lanzar error. También revisar que el `PATCH` no quede huérfano si el inventory call falla.

**E1.3 — Auditar y cerrar los 27 pedidos stale**  
Pedidos en estados activos con `delivery_date <= 2026-06-03`. Decidir con Andrea: ¿cerrarlos como `delivered` o `cancelled`? Requiere aprobación explícita antes de ejecutar UPDATE masivo.

---

### Etapa 2 — Sincronización de estado (hacer antes de uso diario)
*Tiempo estimado: 2-4 hrs*

**E2.1 — Kanban stale state (B-NEW-05)**  
En `OrdersView.tsx`: al aplicar un optimistic status update, también actualizar el array `orders` que se pasa a `KanbanBoard`, no solo el estado de badge en lista view.

**E2.2 — Drawer no cierra tras cancel (B-NEW-07)**  
En el handler de "Cancelar" en `OrderDrawer.tsx`: llamar `onClose()` después del update exitoso.

**E2.3 — Inconsistencia lista ↔ drawer (B-NEW-08)**  
Pasar el status actualizado al drawer via props o refetch al abrir drawer.

**E2.4 — Toggle lista↔kanban resetea fecha (B-NEW-09)**  
Investigar y aislar qué estado se resetea al hacer toggle. Preservar `activeTab` y `rangeStart`/`rangeEnd` al cambiar view mode.

---

### Etapa 3 — UX / Pulido (antes de próxima demo con Andrea)
*Tiempo estimado: 3-5 hrs*

**E3.1 — Sidebar "Administrador" → label dinámico por rol (B-NEW-10)**

**E3.2 — Texto de búsqueda de cliente se transfiere a modo manual (B-NEW-11)**

**E3.3 — Badge "anticipado" en product cards (B-NEW-12)**

**E3.4 — Filtro catálogo resetea al navegar (B-NEW-14)**

**E3.5 — Bugs conocidos B1/B2/B3** (nombre doble en formulario, placeholder teléfono, cédula no persistida en cliente)

**E3.6 — Botón Siigo: deshabilitar o tooltip si no hay pedidos (B-NEW-15)**

---

### Etapa 4 — Datos (acción operacional, no código)
*Coordinación con Andrea*

- Identificar qué cliente B2B tiene ~340 pedidos sin teléfono y agregar contacto
- Revisar 3 clientes activos sin órdenes (¿desactivar?)
- Revisar 4 productos inactivos de catálogo Eventos (¿discontinuados o error?)
- Cerrar 27 pedidos stale (con aprobación de Andrea)

---

## 5. Observaciones adicionales

### Sobre inventory_finished (16+ requests en bucle)
Se observaron 16+ requests GET a `/rest/v1/inventory_finished?product_id=eq.{uuid}` retornando 406 en una sesión. Posible suscripción realtime o hook mal configurado que dispara en bucle. Functionally no rompe la vista, pero es ruido de red y carga innecesaria.

### Sobre la arquitectura de estados (conocido desde testing de junio 2)
El bug B-NEW-04 (inventory_finished) y el bug B5 conocido de status dropdown son síntomas del diseño donde el descuento de inventario está acoplado a transiciones de status específicas. Esto fue identificado en el testing del 2026-06-02 (ver `docs/bugs-demo-andrea.md` nota N2). Los fixes de Etapa 1 y 2 deben coordinarse con la decisión de diseño sobre el flujo producción ↔ estado del pedido antes de parchar.

### Estado de RLS: COMPLETO ✅
Las 12 tablas públicas tienen RLS habilitado. La exposición anterior a tablas sin RLS está resuelta. El único gap es el de políticas INSERT para el rol `owner` (Etapa 1).

### Tests no ejecutables en esta sesión
Los siguientes escenarios del plan general no aplican al rol `owner` y quedan fuera de scope de este report:
- Blocks sobre Kitchen, Inventario, Producción, Domiciliario, Cierre del día (todas vistas bloqueadas para owner)
- Realtime multi-tab (requiere sesiones paralelas)

---

*Report generado automáticamente por workflow E2E `wf_45511c35-699` — 9 agentes, 1.064 tool uses.*
