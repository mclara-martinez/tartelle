# Tartelle Ops — Phase 1: Workflow Completo

## Resumen

Phase 1 es el **Centro de Operaciones**: una sola plataforma que reemplaza Excel, los 4 grupos de WhatsApp, y el seguimiento manual. Accesible desde tablet (cocina), computador (admin) y celular.

---

## Roles y Acceso

| Rol | Persona | Dispositivo | Qué ve |
|-----|---------|-------------|--------|
| **Admin** | Andrea / Asistente | Computador / Celular | Todo: Dashboard, Pedidos, Inventario, Produccion |
| **Cocina** | 3 operarias | Tablet / iPad | Kitchen Display: pedidos activos, inventario, despacho |
| **Domiciliario** | 1 fijo + inDrive | Celular (futuro) | N/A en Phase 1 (coordinado por WhatsApp aun) |

---

## Flujo Completo: Paso a Paso

### 1. INTAKE — Llega un Pedido

**Quien:** Admin (Andrea o asistente de servicio al cliente)
**Cuando:** Todo el dia, a medida que llegan por los canales
**Donde:** Vista "Pedidos" → Boton "Nuevo Pedido"

#### Paso 1.1 — Recibir la solicitud
El pedido llega por uno de 5 canales (todos manuales en Phase 1):
- **WhatsApp** — cliente escribe, admin lee y transcribe
- **Rappi** — cocina acepta en Rappi, manda foto + 4 digitos al grupo, admin registra
- **Instagram** — DM, admin transcribe
- **Presencial (walk-in)** — venta directa en cocina o punto de venta
- **B2B (restaurantes)** — admin escribe 2x/semana a restaurantes, ellos responden con cantidades

#### Paso 1.2 — Crear el pedido en el sistema
Admin abre el formulario "Nuevo Pedido" y llena:

| Campo | Detalle |
|-------|---------|
| **Cliente** | Nombre + celular (obligatorio) |
| **Canal** | WhatsApp / Rappi / Instagram / Presencial / B2B |
| **Fecha de entrega** | Hoy (entrega inmediata) o fecha futura (agendado) |
| **Tipo de entrega** | Domicilio ($8,000 COP) o Recoge en local |
| **Direccion** | Solo si es domicilio |
| **Productos** | Seleccionar del catalogo (nombre + sabor + tamano) con cantidad |
| **Notas** | Instrucciones especiales, velas, dedicatoria, etc. |

**Logica de precios:**
- Precio base por producto (ya configurado por sabor + tamano)
- Si el cliente es B2B con descuento, se aplica automaticamente (% configurado por cliente)
- Domicilio = +$8,000 COP fijo
- Total = subtotal - descuento + domicilio

**Validaciones:**
- No se puede crear un pedido con fecha pasada
- No se puede crear un pedido sin al menos 1 producto
- Si el producto `requires_advance_order = true`, la fecha debe ser minimo manana
- Warning (no bloqueo) si el inventario disponible < cantidad pedida

#### Paso 1.3 — El pedido entra como "Pendiente"
- Status inicial: **Pendiente** (amarillo)
- Aparece inmediatamente en:
  - Dashboard (conteo + lista)
  - Vista de Pedidos (lista con filtro de fecha)
  - Kitchen View (si es para hoy)
- Real-time: todos los que estan viendo el sistema lo ven aparecer al instante

---

### 2. CONFIRMACION — Admin valida el pedido

**Quien:** Admin
**Cuando:** Despues de confirmar pago o acuerdo con el cliente
**Donde:** Vista "Pedidos"

#### Paso 2.1 — Revisar y confirmar
- Admin revisa los datos del pedido
- Confirma que el cliente pago o tiene credito (restaurantes)
- Hace click en "Confirmar" → status cambia a **Confirmado** (azul/teal)

**Que pasa:**
- El pedido queda firme para produccion
- Si la fecha de entrega es manana o despues, entra en la cola de produccion
- Si es para hoy y hay inventario, salta directo a la cola de despacho

---

### 3. PRODUCCION — 6pm Cierre y Plan del Dia Siguiente

**Quien:** Admin genera → Cocina ejecuta
**Cuando:** Todos los dias a las 6pm (corte)
**Donde:** Vista "Produccion" (admin) → Kitchen Display (cocina)

#### Paso 3.1 — Cierre de pedidos (6pm)
- Admin revisa todos los pedidos confirmados para manana
- El sistema genera automaticamente la **lista de produccion**:
  - Pedidos agendados confirmados para manana (cantidades exactas por producto)
  - + Estimado de entrega inmediata (configurable por producto, basado en historial)
  - = Total a producir por producto/sabor/tamano

#### Paso 3.2 — Admin envia plan a cocina
- En Phase 1: el plan se genera en el sistema y admin lo envia por WhatsApp al grupo de produccion (manual)
- En Phase 2: se enviara automaticamente a las 6pm via WhatsApp Business API
- El plan tambien queda visible en el Kitchen Display para la manana siguiente

#### Paso 3.3 — Cocina produce (6am - durante el dia)
- Primera operaria llega a las 6am
- Ve en el Kitchen Display la lista de produccion del dia
- Produce las tartas → refrigeracion overnight → listas para manana
- A medida que termina, registra produccion en el sistema:
  - Kitchen Display → Inventario → boton "+" por producto
  - Esto actualiza `inventory_finished` en tiempo real
  - Se logea en `inventory_log` con razon "produccion"

---

### 4. DIA DE ENTREGA — Despacho y Seguimiento

**Quien:** Cocina despacha → Admin coordina domicilio → Admin notifica cliente
**Cuando:** Todo el dia de entrega
**Donde:** Kitchen Display (cocina) + Vista Pedidos (admin)

#### Paso 4.1 — Pedido entra "En Produccion"
- Si el pedido requiere produccion (no es de stock existente):
  - Admin o cocina marca como **En Produccion** (morado)
  - Aparece destacado en Kitchen Display

#### Paso 4.2 — Pedido "Listo"
- Cocina termina de preparar/empacar el pedido
- Marca como **Listo** (verde) en Kitchen Display
- El pedido se destaca con borde verde en la lista
- Admin ve el cambio en tiempo real

#### Paso 4.3 — Despacho
- **Si es domicilio:**
  - Admin coordina con domiciliario (WhatsApp, manual en Phase 1)
  - Cocina entrega al domiciliario
  - Cocina marca como **Despachado** (azul) en Kitchen Display → "Despachar"
  - (Phase 2: dispara notificacion automatica al cliente "tu pedido va en camino")

- **Si recoge en local:**
  - Cliente llega, cocina entrega
  - Cocina marca como **Despachado** directamente

#### Paso 4.4 — Entregado
- Domiciliario confirma entrega (WhatsApp a admin, manual)
- Admin marca como **Entregado** (verde oscuro)
- (Phase 2: dispara notificacion "tu pedido fue entregado" + foto)
- (Phase 3: dispara facturacion automatica en Siigo)

#### Paso 4.5 — Descuento de inventario
- Al despachar un pedido, el sistema **automaticamente** descuenta las cantidades del inventario:
  - Por cada item del pedido: `inventory_finished[product_id].quantity -= item.quantity`
  - Se logea en `inventory_log` con razon "sale" y `reference_id = order.id`
- Si el inventario llega a 0 o al minimo (2 unidades):
  - **Alerta visual** en Kitchen Display y Dashboard
  - Texto: "⚠️ [Producto] agotado — desactivar en Rappi"

---

### 5. INVENTARIO — Control Continuo

**Quien:** Cocina (durante el dia) + Admin (revision)
**Cuando:** Todo el dia + cierre nocturno
**Donde:** Kitchen Display (sidebar) + Vista Inventario (admin)

#### 5.1 — Ajustes de inventario
Cocina puede ajustar inventario en cualquier momento:
- **Produccion (+):** Termino un batch → agrega unidades
- **Merma/Waste (-):** Se dano un producto → resta con razon "waste"
- **Ajuste manual:** Conteo fisico no coincide → corregir con razon "adjustment"
- **Venta directa:** Cliente compra en local sin pedido formal → restar con razon "sale"

#### 5.2 — Alertas de stock bajo
- Umbral configurable (default: 2 unidades)
- Alerta aparece en:
  - Kitchen Display (banner rojo arriba)
  - Dashboard (card de alerta)
  - Inventario (producto en rojo)
- Texto claro: nombre del producto + cantidad restante + "desactivar en Rappi"

#### 5.3 — Cierre nocturno
- Cocina hace conteo fisico al final del dia
- Compara contra lo que dice el sistema
- Si hay diferencia, hace ajuste manual con nota explicativa
- (Esto reemplaza el mensaje de WhatsApp al grupo de inventario)

---

### 6. DASHBOARD — Vision General

**Quien:** Admin (Andrea)
**Cuando:** Todo el dia, vista principal
**Donde:** Dashboard (home)

#### Que muestra:
- **Pedidos de hoy:** conteo total + lista con estado
- **Pendientes:** cuantos faltan por confirmar/despachar
- **Ingresos del dia:** suma de pedidos entregados
- **Pedidos de manana:** preview de lo que viene
- **Por canal:** distribucion WhatsApp / Rappi / Instagram / Presencial / B2B
- **Alertas de stock bajo:** productos que necesitan atencion
- **Produccion de manana:** resumen de lo que hay que producir (si ya se genero el plan)

---

## Flujo de Estados (Order Lifecycle)

```
PENDIENTE ──→ CONFIRMADO ──→ EN PRODUCCION ──→ LISTO ──→ DESPACHADO ──→ ENTREGADO
    │
    └──→ CANCELADO (desde cualquier estado pre-despacho)
```

| Estado | Color | Quien lo cambia | Cuando |
|--------|-------|-----------------|--------|
| Pendiente | Amarillo | Sistema (automatico al crear) | Pedido recien creado |
| Confirmado | Teal | Admin | Pago verificado o credito aprobado |
| En Produccion | Morado | Admin o Cocina | Se empieza a preparar |
| Listo | Verde | Cocina | Producto empacado y listo |
| Despachado | Azul | Cocina | Entregado a domiciliario o al cliente |
| Entregado | Verde oscuro | Admin | Domiciliario confirma entrega |
| Cancelado | Rojo | Admin | Cliente cancela o no-show |

**Reglas de transicion:**
- Solo se puede avanzar al siguiente estado (no saltar)
- Cancelar es posible desde: Pendiente, Confirmado, En Produccion
- No se puede cancelar si ya esta Listo, Despachado o Entregado
- Al cancelar, si ya se descontó inventario, se revierte automaticamente

---

## Catalogo de Productos

Basado en la entrevista con Andrea:

| Producto | Sabores disponibles | Tamanos | Requiere agenda previa |
|----------|--------------------|---------|-----------------------:|
| Tarta de Queso | Original, Lotus, Pistacho, Frutos Rojos, Chocolate, Maracuya, Oreo | Grande, Mediana, Mini | Grande/Mediana: Si. Mini: No |
| Otros (por definir) | ... | ... | ... |

**Nota sobre tamanos:**
- **Grande** — solo por pedido agendado (dia anterior)
- **Mediana** — algunos sabores agendados, otros inmediatos
- **Mini** — siempre disponible para entrega inmediata (si hay stock)

---

## Timeline Diario

| Hora | Actividad | Quien | Donde |
|------|-----------|-------|-------|
| Todo el dia | Recibir y crear pedidos | Admin | Vista Pedidos |
| Todo el dia | Produccion + registro inventario | Cocina | Kitchen Display |
| Todo el dia | Despachar pedidos listos | Cocina + Admin | Kitchen Display + Pedidos |
| 6:00 PM | Cierre de pedidos para manana | Admin | Vista Produccion |
| 6:00 PM | Generar plan de produccion | Sistema | Automatico |
| 6:00 PM | Enviar plan a cocina | Admin (manual) | WhatsApp grupo produccion |
| Noche | Conteo fisico inventario | Cocina | Kitchen Display → Inventario |
| Noche | Cierre del dia | Admin | Dashboard |
| Sabado | Cierre semanal: caja, cartera, materia prima | Admin | Dashboard + Reportes |

---

## Que NO incluye Phase 1

- Notificaciones automaticas por WhatsApp (Phase 2)
- Chatbot WhatsApp (Phase 5)
- Follow-up automatico a clientes (Phase 2)
- Integracion Rappi (Phase 5)
- Facturacion Siigo automatica (Phase 5)
- Inventario de materia prima (Phase 3)
- CRM / historial de clientes (Phase 4)
- Reportes avanzados / analytics (Phase 4)
- Multi-sede / punto de venta como sede separada (futuro)

Estos se coordinan manualmente por ahora (WhatsApp), como se hace hoy.
