# Plan de Implementación — Tartelle Ops
**Versión:** Junio 2026  
**Preparado por:** MClara Martínez  
**Contexto:** Documento interno de trabajo — complementa el Cronograma Roadmap 2026 (mayo 2026)

---

## Objetivo

Implementar el sistema de operaciones de Tartelle de forma pausada y controlada, sin interrumpir la operación actual. El equipo sigue sus procesos habituales mientras el sistema se valida en paralelo, y solo se migra cada función cuando hay certeza de que el sistema hace exactamente lo que debe hacer.

**Principio guía:** primero duplicamos el trabajo, luego reemplazamos — nunca al revés.

---

## Relación con el Cronograma Original

El roadmap de mayo 2026 define 6 módulos. Este documento desglosa el **Módulo 2 — Lanzamiento y Equipo (Jun 16 – Jul 25)** en 5 sub-fases validadas:

```
MÓDULO 2 original:  ├──────────── Lanzamiento y Equipo (Jun 16 – Jul 25) ───────────┤

Desglose nuevo:     ├─ 2a ─┤─ 2b ──┤─── 2c ───┤─── 2d ───┤──── 2e ────┤
                    16-22   23-29   30–Jul 6    Jul 7-13   Jul 14-25
                    Pedidos Cocina  Cocina       Driver +   Flujo
                    doble   visual  completa     Inventario completo
                    ingreso
```

Los módulos 1 y 3 no cambian. El Módulo 3 (CRM con WhatsApp, Jul 12 – Ago 10) arranca en tiempo.

---

## Estado del Sistema — Qué está listo hoy (3 jun 2026)

| Módulo | Estado | Observación |
|--------|--------|-------------|
| Pedidos — crear, editar, estados | Listo | Todos los campos del Excel de Andrea mapeados |
| Búsqueda y creación de clientes | Listo | Clientes recurrentes, descuentos B2B |
| Vista cocina — Producción | Listo | Totales del día, control de calidad, componentes |
| Vista cocina — Ventas (Rappi/Presencial) | Listo | Descuenta inventario en tiempo real |
| Vista cocina — Despacho | Listo con gap | Ver pendiente: flujo "Listo" desde tablet |
| Vista domiciliario (John) | Listo | URL directa Chrome, foto factura B2B |
| Cierre del día | Listo | Producido / Vendido / En nevera + ajuste manual |
| Inventario producto terminado | Listo | Alertas de stock bajo |
| Siigo CSV export | Listo | Archivo plano para carga manual |
| Realtime entre dispositivos | Listo | ~1 segundo de latencia |

**Bug crítico pendiente:** Posible doble descuento de inventario cuando un pedido transita entre estados (Escenario 3 del guión E2E). Debe resolverse antes del 16 jun.

---

## Cronograma Detallado

### MÓDULO 1 — Plataforma Revisada
**Fechas:** Jun 6–15  
**Quién:** MClara  
**Objetivo:** Sistema listo para recibir operación real el día 16.

#### Pendientes obligatorios antes del 16:
- [ ] Resolver bug de doble descuento de inventario
- [ ] Verificar catálogo de precios 1:1 contra el Excel de Andrea (nombres, tamaños, precios)
- [ ] Configurar accesos: email/password para Andrea, cocina y John en Supabase Auth
- [ ] Configurar URL de cocina en la tablet (`tartelle.onrender.com/#kitchen`)
- [ ] Configurar URL de domiciliario en el celular de John (`tartelle.onrender.com/#domiciliario`)
- [ ] Sesión de entrenamiento de 30 min con Andrea — práctica creando pedidos
- [ ] Definir el proceso de comparación Excel vs. sistema cada 2 días (¿quién lo hace? ¿formato?)

---

### FASE 2a — Pedidos en Paralelo (Doble Ingreso)
**Fechas:** Jun 16–22 (mín. 1 semana)  
**Quién:** Admin (Andrea o asistente)  
**Dispositivo:** Computador

**Qué cambia:** Nada en la operación. Andrea sigue usando el Excel exactamente igual. Adicionalmente, ingresa cada pedido en el sistema.

**Proceso:**
```
Pedido llega → se registra en Excel (como siempre)
             → se registra igual en el sistema
Jun 18, 20, 22 → revisión de cierre: Excel vs. sistema
```

**Criterio para avanzar a Fase 2b:** Cero discrepancias en 3 revisiones consecutivas, o discrepancias < 2% explicadas y documentadas.

**Qué registra el sistema que el Excel no hace:**
- Canal de origen (WhatsApp, Rappi, Instagram, presencial, B2B)
- Foto del comprobante de pago adjunta
- Estado del pedido en tiempo real (visible para todos)
- Exportación automática a Siigo (CSV)

---

### FASE 2b — Cocina Visual (Producción)
**Fechas:** Jun 23–29 (mín. 1 semana)  
**Quién:** Operarias de cocina  
**Dispositivo:** Tablet en cocina

**Qué cambia:** Las operarias ven la pantalla de producción del día. El admin sigue enviando la lista al grupo de WhatsApp (como hoy) — la pantalla es adicional, no reemplaza nada todavía.

**Proceso:**
```
6pm día anterior → admin genera lista en sistema
                 → admin sigue enviando lista al grupo de WhatsApp
Día de producción → operarias ven pantalla Y leen el grupo
                  → producen igual que hoy, marcan en pantalla
Jun 25, 27, 29 → revisión: inventario del sistema = conteo físico en nevera
```

**Criterio para avanzar a Fase 2c:** El inventario del sistema refleja lo que hay físicamente en nevera al cierre de cada día de la semana.

#### Pendientes obligatorios antes del 23:
- [ ] Eliminar botón "producir" del panel de cocina (confunde al personal — acordado 14 mayo)
- [ ] Bites y galletas van directo a cocina sin confirmación manual del admin
- [ ] Aclarar y resolver el flujo de cómo cocina marca un pedido como "Listo" desde la tablet
- [ ] Sesión de entrenamiento con las 3 operarias (máx. 20 min)
- [ ] Recibir y cargar lista de componentes de producción de Tartelle (mermelada, caramelo salado, galletas para bites — pendiente desde 14 mayo)
- [ ] Definir y construir el flujo de superávit por producto para venta directa / entrega inmediata

**Flujo de superávit (pendiente de diseño):**
```
Superávit disponible = stock en nevera
                     − unidades comprometidas en pedidos confirmados de hoy
                     = unidades libres para Rappi / presencial / entrega inmediata
```
Afecta: panel de ventas de cocina, alertas de stock, bloqueo de nuevos pedidos para hoy.

---

### FASE 2c — Cocina Completa (Despacho + Ventas en Sitio)
**Fechas:** Jun 30 – Jul 6  
**Quién:** Operarias de cocina + admin  

**Qué se activa:**
- Cocina marca pedidos como "Listo" y "Despachado" desde la tablet
- Foto de evidencia de despacho
- Ventas en sitio (Rappi, Didi, Presencial) registradas en pestaña Ventas — inventario baja automáticamente
- Grupos de WhatsApp de despacho e inventario pasan a ser respaldo, no canal principal

**Coordinación con domiciliario:** Admin sigue avisando a John por WhatsApp — él no entra al sistema todavía.

---

### FASE 2d — Domiciliario + Cierre de Inventario
**Fechas:** Jul 7–13  
**Quién:** John + admin  

**Qué se activa:**
- John usa `tartelle.onrender.com/#domiciliario` en su celular (sin instalar nada)
- Marca "Recogido" y "Entregado" con timestamp exacto
- B2B: foto de factura firmada desde el celular
- Admin monitorea estado de entregas en Dashboard sin coordinar por WhatsApp

**Cierre diario de inventario:**
```
Final del día → cocina hace conteo físico (como hoy)
             → compara con "Cierre del día" en el sistema
             → si hay diferencia, ajusta con nota explicativa
             → reemplaza el mensaje al grupo de inventario
```

---

### FASE 2e — Flujo Completo
**Fechas:** Jul 14–25  
**Quién:** Todo el equipo  

**Qué se activa:**
- Vista Producción (admin): lista generada automáticamente desde pedidos confirmados
- Grupos de WhatsApp pasan a ser respaldo de emergencia, no canal operativo
- Siigo: se evalúa si el CSV manual es suficiente o se construye integración directa (Módulo 6)

---

### MÓDULO 3 — CRM con WhatsApp
**Fechas:** Jul 12 – Ago 10 (sin cambios del roadmap original)

---

## Preguntas Abiertas — Reunión Andrea 4 jun

1. ¿Quién hace la comparación Excel vs. sistema cada 2 días en Fase 2a? ¿Andrea comparte el Excel o lo hace junto a MClara?
2. ¿El catálogo de precios del sistema ya está 1:1 con el Excel? ¿Andrea valida el CSV?
3. ¿Cuáles productos requieren producción anticipada vs. entrega inmediata? — define la lógica del superávit
4. ¿Cuándo puede John tener 5 min para configurar su celular con la URL?
5. ¿Rappi sigue igual hasta Módulo 6 o hay intención de tocar el flujo antes?
6. Lista de componentes de producción — ¿cuándo la envía el equipo?

---

## Entregables — Reunión Andrea 4 jun 2026

- [ ] CSV del catálogo de productos para revisión detallada por Andrea (nombres, sabores, tamaños, precios, categorías)
- [ ] Este plan de implementación (visual — ver deck complementario)

---

## Criterios de Validación por Fase

| Fase | Criterio de paso |
|------|-----------------|
| 2a Pedidos | 0 discrepancias en 3 revisiones consecutivas (o < 2% explicado) |
| 2b Cocina visual | Inventario sistema = físico en nevera al cierre de cada día |
| 2c Cocina completa | Despachos y ventas en sitio registrados sin errores 3 días seguidos |
| 2d Driver + inventario | John opera autónomamente, cierre diario cuadra sin intervención manual |
| 2e Flujo completo | Todo el equipo opera sin WhatsApp operativo por 5 días seguidos |

---

## Plan de Rollback

Si en cualquier fase hay errores que no se pueden resolver el mismo día:
1. El equipo vuelve al proceso anterior (Excel + WhatsApp) — no hay dependencia del sistema todavía
2. Se documenta el error con detalle
3. Se corrige el sistema antes de retomar la fase
4. No se avanza a la siguiente fase hasta que la actual pase el criterio de validación

El sistema es **aditivo**, no destructivo. Nada se apaga mientras se valida.
