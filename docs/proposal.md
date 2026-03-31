# Tartelle Ops — Propuesta Comercial

---

## PÁGINA 1

### Header
**Tartelle Ops**
*Tu operación, simplificada.*

---

### Lo que escuchamos

4 dolores que identificamos:

- **Sobreventa** — WhatsApp, Rappi y el local no se hablan. Se vende lo mismo dos veces.
- **Inventario a ciegas** — El stock de producto terminado vive en WhatsApp y se actualiza tarde. No hay visibilidad en tiempo real.
- **Operación manual** — Pedidos en Excel, producción por grupos de WhatsApp, facturación una por una en Siigo. Demasiados pasos, demasiado margen de error.
- **Ventas perdidas** — Clientes que escriben y no completan su pedido. Sin seguimiento automático, esa venta se va.

---

### La solución

**Una sola plataforma. Todo conectado.**

Una aplicación a la medida — accesible desde tablet (cocina), computador (admin) y celular — que centraliza pedidos, inventario y comunicación en tiempo real.

**Fase 1 resuelve los 4 dolores:**

| Qué incluye | Qué reemplaza |
|---|---|
| Gestión de pedidos multicanal | Excel de pedidos |
| Inventario de producto terminado en tiempo real | Grupos de WhatsApp + Siigo manual |
| Dashboard de cocina en tablet | Mensajes al grupo de producción |
| Panel administrativo | Filtros manuales + seguimiento a ojo |
| Planeación de producción automática (6pm) | Lista manual de lo que se produce mañana |

---

## PÁGINA 2

### Hoja de ruta

| Fase | Nombre | Qué incluye |
|---|---|---|
| **1** | Centro de Operaciones | Pedidos, inventario PT, dashboard cocina, panel admin, producción automática |
| **2** | Comunicación Inteligente | Notificaciones WhatsApp al cliente, tracking de domicilios, follow-ups automáticos, alertas de stock |
| **3** | Control de Insumos | Inventario materia prima, órdenes de compra automáticas, verificación de entregas, mínimos por temporada |
| **4** | Conoce tu Cliente | CRM, historial de pedidos, analytics de ventas, email marketing |
| **5** | Automatización Avanzada | Chatbot WhatsApp (primeras interacciones), optimización de flujos Rappi y Siigo |

---

### Inversión

| Fase | Implementación | Mensualidad acumulada |
|---|---|---|
| Fase 1 — Centro de Operaciones | $3.480.000 COP | $980.000/mes |
| Fase 2 — Comunicación Inteligente | $1.480.000 COP | $1.350.000/mes |
| Fase 3 — Control de Insumos | $1.680.000 COP | $1.580.000/mes |
| Fase 4 — Conoce tu Cliente | $680.000 COP | $1.850.000/mes |
| Fase 5 — Automatización Avanzada | $780.000 COP | $2.155.000/mes |
| **Total** | **$8.100.000 COP** | **$2.155.000/mes** |

> La mensualidad incluye hosting, soporte técnico, actualizaciones y monitoreo.
> Los costos de WhatsApp Business API y email marketing van por cuenta del cliente (escalan con el uso).

---

### Siguiente paso

**Arrancamos con Fase 1.**
En 4 a 6 semanas tu operación funciona desde una sola plataforma — sin Excel, sin grupos de WhatsApp para producción, sin sobreventa.

---

## Justificación de precios (uso interno)

### Implementación por fase

| Fase | Precio | Esfuerzo estimado | Justificación |
|---|---|---|---|
| Fase 1 | $3.480.000 | 80-100 horas | Fase más pesada: base de datos, auth, 2 dashboards, inventario en tiempo real, planeación de producción |
| Fase 2 | $1.480.000 | 50-60 horas | Capa de comunicación sobre plataforma existente. Integración WhatsApp Business API, tracking domicilios, automatizaciones |
| Fase 3 | $1.680.000 | 45-55 horas | Alta reutilización de Buen Humo (inventario, OC, verificación). Trabajo nuevo: mínimos por temporada, alertas calendario |
| Fase 4 | $680.000 | 35-45 horas | Fase más económica: organiza datos que ya existen desde Fase 1. Analytics + email vía SendGrid/Resend |
| Fase 5 | $780.000 | 30-40 horas | Chatbot WhatsApp (Meta Cloud API). Rappi sin API abierta → workflow optimizado. Siigo → pending investigación de API |

### Mensualidad — desglose

**Fase 1: $980.000/mes**
- Hosting (Supabase Pro + Vercel + dominio): $200.000
- Soporte y mantenimiento (~6-8 horas/mes): $380.000
- Monitoreo de plataforma: $150.000
- Mejoras continuas: $250.000

**Fase 2: +$370.000 → $1.350.000/mes**
- Monitoreo WhatsApp API + templates: $150.000
- Sistema de tracking domicilios: $100.000
- Mantenimiento de automatizaciones: $120.000

**Fase 3: +$230.000 → $1.580.000/mes**
- Mantenimiento sistema de compras: $100.000
- Optimización OCR facturas: $80.000
- Soporte planeación estacional: $50.000

**Fase 4: +$270.000 → $1.850.000/mes**
- Analytics y reportes: $120.000
- Email marketing (gestión + costos SendGrid): $80.000
- Mantenimiento CRM: $70.000

**Fase 5: +$305.000 → $2.155.000/mes**
- Mantenimiento chatbot: $150.000
- Optimización workflows Rappi/Siigo: $100.000
- Confiabilidad plataforma completa: $55.000

### Costos de terceros (a cargo del cliente)
- WhatsApp Business API (desde Fase 2): ~$80.000-$150.000 COP/mes
- Email marketing (desde Fase 4): ~$30.000-$50.000 COP/mes
- Siigo: sin cambio respecto a lo que paga hoy

### Nota sobre Fase 5
- **Rappi**: no tiene API abierta para merchants. Se ofrece workflow optimizado interno, no integración directa.
- **Siigo**: requiere investigación de API antes de prometer integración automática.
