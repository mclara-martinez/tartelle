# Tartelle

Sistema de gestion para Tartelle, un negocio de cheesecakes y tartas artesanales en Medellin, Colombia.

## Contexto del Negocio

Tartelle es un negocio de postres (tartas/cheesecakes) que crecio organicamente desde una cocina casera. Actualmente opera con:

- **Dos centros de costo:** Cocina de produccion (Medellin) y Punto de venta
- **Canales de venta:** Rappi, WhatsApp, Instagram, venta directa en local, clientes B2B (restaurantes y cafes)
- **Facturacion electronica:** mediante Siigo
- **Equipo en cocina:** 3 personas + 1 administrativa + domiciliario

## Problemas Identificados

### Inventario
- El inventario de producto terminado y materia prima es completamente manual
- Siigo no esta bien parametrizado para descontar inventario automaticamente
- No hay minimos de stock definidos para materia prima
- No se sabe cuanta plata hay en inventario de materia prima

### Canales Desconectados
- Rappi, WhatsApp y punto de venta no se comunican entre si
- Sobreventa frecuente: se vende en WhatsApp algo que ya se vendio en Rappi (o viceversa)
- Las niñas de cocina deben apagar manualmente Rappi cuando se agota un producto

### Procesos Manuales
- Pedidos se registran en un Excel manual
- Facturacion se hace uno por uno en Siigo
- Comunicacion cocina-admin es via grupos de WhatsApp
- Produccion del dia siguiente se planifica manualmente a las 6pm
- Inventario de producto terminado se reporta por WhatsApp cada noche

### Servicio al Cliente
- No hay CRM ni seguimiento automatizado
- Existe base de datos de clientes (cedula, correo, celular) pero no se usa
- No se hacen campañas de email marketing
- Follow-ups a clientes que no completan pedidos son manuales

## Objetivos / Vision

1. **Respuesta rapida:** Responder clientes en menos de 5 minutos
2. **Automatizacion WhatsApp:** Primeras interacciones automatizadas (catalogo, datos, disponibilidad), humano cierra la venta
3. **Inventario en tiempo real:** Producto terminado actualizado y conectado a todos los canales
4. **Alertas de stock:** Warning cuando un producto se agota para desactivar en Rappi
5. **Tracking de pedidos:** Cliente sabe cuando su pedido esta agendado, en preparacion, en camino y entregado
6. **Dashboard cocina:** Tablet/iPad en cocina con pedidos del dia, despachos y estado
7. **Follow-ups automaticos:** Recordatorios a clientes que no completan pedidos
8. **Campañas outbound:** Usar la base de datos para email marketing
9. **Gestion de materia prima:** Inventario con minimos, ordenes de compra automatizadas, variaciones por temporada
10. **Escalabilidad:** Procesos estandarizados para abrir nuevos puntos (cafe planeado para 2026)

## Flujo Operativo Actual

```
Cliente hace pedido (WhatsApp / Rappi / Presencial / Restaurante B2B)
    |
    v
Admin registra en Excel (manual)
    |
    v
A las 6pm: se filtra pedidos para mañana + produccion del dia siguiente
    |
    v
Se envia al grupo de WhatsApp de cocina
    |
    v
Cocina produce (primera persona entra 6am)
    |
    v
Admin sube produccion a Siigo (manual)
    |
    v
Despacho: domiciliario o recoge cliente
    |
    v
Admin envia mensaje "pedido en camino" / "pedido entregado" (manual)
    |
    v
Admin factura en Siigo (manual, una por una)
    |
    v
Cierre del dia: inventario producto terminado por WhatsApp
    |
    v
Sabados: cierre de caja, cuentas por cobrar, inventario materia prima
```

## Catalogo

- ~10 opciones de productos (tartas/cheesecakes)
- Varios sabores y tamaños (grande, mediana, mini)
- Algunos sabores solo disponibles en tamaños pequeños
- Productos requieren preparacion el dia anterior (refrigeracion overnight)
- Entregas inmediatas disponibles para productos en stock
- Extras opcionales: velas, etc.

## Estructura del Proyecto

```
tartelle/
├── README.md                   # Este archivo
├── docs/
│   ├── transcript.md           # Transcripcion de la entrevista con la dueña
│   ├── requirements.md         # Requerimientos detallados del sistema
│   └── current-tools.md        # Herramientas actuales del negocio
└── src/                        # Codigo fuente (por definir)
```

## Tecnologias (Por Definir)

- **Integraciones necesarias:** WhatsApp Business API, Rappi, Siigo
- **Base de datos:** TBD
- **Frontend cocina:** App web responsive (tablet/iPad)
- **Backend:** TBD
