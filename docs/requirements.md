# Requerimientos del Sistema - Tartelle

## Resumen Ejecutivo

Plataforma centralizada para gestionar la operacion de Tartelle, un negocio de cheesecakes/tartas artesanales en Medellin con dos centros de costo (cocina de produccion y punto de venta), multiples canales de venta y clientes B2B (restaurantes/cafes).

---

## Modulo 1: Gestion de Pedidos (Order Management)

### 1.1 Registro centralizado de pedidos
- Todos los pedidos de todos los canales en un solo lugar
- Canales: WhatsApp, Rappi, Instagram, presencial, restaurantes B2B
- Datos del pedido: cliente, productos, cantidades, fecha de entrega, tipo de entrega (domicilio/recoge), estado
- Descuentos por cliente (restaurantes con precios especiales)
- Calculo automatico de totales incluyendo domicilio

### 1.2 Estados del pedido
- **Agendado:** pedido confirmado y pagado
- **En produccion:** tarta en proceso (dia anterior)
- **Listo:** producto terminado y refrigerado
- **En camino:** entregado al domiciliario
- **Entregado:** confirmado por domiciliario/cliente
- Notificaciones automaticas al cliente en cada cambio de estado (via WhatsApp)

### 1.3 Vista de cocina (Kitchen Display)
- Dashboard para tablet/iPad en la cocina
- Pedidos del dia organizados por hora de entrega
- Boton para marcar como "despachado" / "entregado a domiciliario"
- Al despachar, trigger automatico de notificacion al cliente
- Alerta visual cuando un producto se agota (warning para apagar Rappi)

### 1.4 Planificacion de produccion
- Vista de pedidos de mañana (se cierra a las 6pm)
- Lista de produccion del dia siguiente generada automaticamente
- Produccion = pedidos agendados + estimado de entrega inmediata
- Envio automatico de lista de produccion a cocina a las 6pm

---

## Modulo 2: Inventario de Producto Terminado

### 2.1 Inventario en tiempo real
- Stock actualizado de cada producto (sabor + tamaño)
- Se incrementa cuando cocina reporta produccion terminada
- Se decrementa con cada venta (WhatsApp, presencial, Rappi)
- Sincronizado entre todos los canales

### 2.2 Alertas de stock
- Warning cuando un producto llega a 0 o a un minimo configurable
- Notificacion a cocina para desactivar producto en Rappi
- Notificacion a admin/servicio al cliente

### 2.3 Disponibilidad
- API/vista de disponibilidad actual para:
  - WhatsApp (chatbot o consulta)
  - Admin de servicio al cliente
  - Punto de venta

---

## Modulo 3: Inventario de Materia Prima

### 3.1 Catalogo de insumos
- Lista de materias primas con unidad de medida (kg, unidad, caja, docena, litro)
- Proveedor(es) por insumo
- Minimo de stock semanal (configurable por semana del año para manejar temporalidad)

### 3.2 Registro de inventario
- Interfaz movil/tablet para que cocina registre inventario fisico
- Frecuencia: diaria para producto terminado, semanal (sabados) para materia prima
- Historico de inventarios para analisis

### 3.3 Ordenes de compra automaticas
- Calculo automatico: minimo requerido - inventario actual = cantidad a pedir
- Agrupacion por proveedor
- Generacion de PDF/imagen para enviar al proveedor por WhatsApp
- Estados: pendiente, enviada al proveedor, ETA confirmado, recibida
- Verificacion de entrega: comparar factura del proveedor vs orden de compra

### 3.4 Estacionalidad
- Minimos de stock variables por semana del año
- Alertas para fechas especiales (San Valentin, Dia de la Madre, Navidad, etc.)
- Datos historicos de Siigo para alimentar proyecciones

---

## Modulo 4: Gestion de Clientes (CRM Basico)

### 4.1 Base de datos de clientes
- Datos: nombre, cedula, correo, celular, direccion
- Tipo: persona natural, restaurante/cafe, punto de venta
- Historial de pedidos
- Preferencias y descuentos especiales

### 4.2 Seguimiento de ventas
- Follow-up automatico cuando cliente no completa datos del pedido
- Primer recordatorio: mismo dia
- Segundo recordatorio: dia siguiente
- Maximo 2 follow-ups automaticos

### 4.3 Comunicacion B2B
- Mensajes automaticos a restaurantes: "Hola, quedamos pendientes de tu pedido para esta semana, tenemos envios [dia] y [dia]"
- Frecuencia: 2 veces por semana
- Tracking de pedidos por restaurante

### 4.4 Campañas (futuro)
- Email marketing usando base de datos existente
- Segmentacion por tipo de cliente, frecuencia, preferencias
- Promociones por temporada

---

## Modulo 5: Integraciones

### 5.1 WhatsApp Business API
- Chatbot para primeras interacciones:
  - Saludo y catalogo
  - Consulta de disponibilidad (conectado a inventario)
  - Recoleccion de datos del pedido
  - Confirmacion de pedido
- Handoff a humano para cerrar venta
- Notificaciones automaticas de estado del pedido
- Follow-up automatico a clientes inactivos
- **Nota:** Andrea no quiere TODO automatizado, quiere que el cierre sea humano

### 5.2 Rappi (investigar API)
- Idealmente: sincronizar inventario para evitar sobreventa
- Minimo viable: alertas para desactivar productos manualmente

### 5.3 Siigo
- Fuente de verdad para facturacion electronica
- Idealmente: facturacion automatica al confirmar entrega
- Exportar datos historicos para analisis de estacionalidad
- Mantener Siigo para lo que es bueno (facturacion), complementar con la plataforma

---

## Modulo 6: Reportes y Cierre

### 6.1 Cierre diario
- Total vendido por canal (WhatsApp, Rappi, presencial, restaurantes)
- Inventario de producto terminado al cierre
- Pedidos pendientes para mañana

### 6.2 Cierre semanal (sabados)
- Cierre de caja (efectivo)
- Cuentas por cobrar / cartera
- Inventario de materia prima
- Comparativo vs semana anterior

### 6.3 Analisis
- Ventas por producto, por canal, por dia de la semana
- Productos mas/menos vendidos por temporada
- Tendencias para ajustar minimos de inventario

---

## Prioridades de Implementacion (Sugeridas)

### Fase 1 - Fundacion
1. Gestion de pedidos centralizada (reemplazar Excel)
2. Vista de cocina basica
3. Inventario de producto terminado en tiempo real

### Fase 2 - Automatizacion
4. Notificaciones de estado de pedido via WhatsApp
5. Alertas de stock bajo
6. Follow-ups automaticos

### Fase 3 - Materia Prima
7. Inventario de materia prima digital
8. Ordenes de compra automaticas
9. Verificacion de entregas de proveedores

### Fase 4 - CRM y Marketing
10. CRM basico con historial de clientes
11. Mensajes automaticos a restaurantes B2B
12. Campañas de email marketing

### Fase 5 - Integraciones Avanzadas
13. Integracion WhatsApp Business API (chatbot)
14. Integracion Rappi
15. Facturacion automatica con Siigo

---

## Datos Clave del Negocio

| Metrica | Valor |
|---------|-------|
| Mensajes WhatsApp diarios | ~40-50 |
| Personal cocina | 3 personas |
| Personal admin | 1 persona |
| Domiciliarios | 1 fijo + inDrive |
| Canales de venta | 5 (WhatsApp, Rappi, Instagram, presencial, B2B) |
| Productos en catalogo | ~10 opciones |
| Tiempo entrega domicilio | ~1 hora objetivo |
| Produccion | Dia anterior (requiere refrigeracion overnight) |
| Facturacion | Electronica via Siigo |
| Horario produccion | 6am - 6pm |
| Cierre semanal | Sabados |
