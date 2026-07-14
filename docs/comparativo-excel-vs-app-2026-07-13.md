# Comparativo Excel manual vs BD app — Pedidos 23 jun a 7 jul 2026

**Fecha del ejercicio:** 2026-07-13
**Fuente manual:** `PEDIDOS JUNIO 23 - JUNIO 7.xlsx` (2 hojas: "MAYO " = 23–27 jun, "JUNIO" = 30 jun–7 jul; 243 líneas de ítems)
**Fuente app:** tabla `orders` + `order_items`, entregas 23 jun–8 jul (72 pedidos)
**Objetivo:** primera prueba del deploy del módulo de pedidos — verificar que lo registrado manual también esté en el sistema y coincida en ítems y valores.

## Metodología

- Los valores del Excel están en miles de COP; la columna TOTAL incluye el domicilio cuando aplica.
- Agrupación del Excel en "pedidos" por (fecha, cliente); Rappi y Venta Local se comparan agregados por día.
- Match contra la BD por fecha + nombre normalizado (sin tildes, alias: CAFE VELEZ↔VELEZ CAFE, KATEN↔KARENT, etc.), con verificación de ítems producto a producto.
- Excluidos: 4 pedidos de prueba de M Clara Martínez en la BD (23 jun cancelado $158k, 30 jun $325k, 1 jul $348k, 7 jul cancelado $185k).
- En la BD la fecha de negocio es `delivery_date` — 41 de los 72 pedidos se digitaron en lote la noche del 7 jul (9–11pm).

## Resultado global

| Métrica | Valor |
|---|---|
| Pedidos del Excel encontrados en la app y cuadrando ítems + total | **40** |
| Pedidos con diferencias de valor | 15 |
| Pedidos del Excel que NO están en la app | **60** (~$10.4M COP) |
| Pedidos en la app que no están en el Excel | 10 (~$1.5M, la mayoría explicables) |
| Total Excel 23 jun–7 jul | $19.237.225 |
| Total BD (sin pruebas ni cancelados) | $10.547.700 |

**El 6 de julio cuadra perfecto ($612.000 en ambos lados, todos los pedidos e ítems).** Es el único día 100% limpio y demuestra que cuando el equipo digita juicioso, el sistema refleja la realidad.

## Hallazgo 1 — La semana 23–27 jun casi no se digitó (~$7.3M por fuera)

44 pedidos del Excel (~$7.33M) no existen en la app: todos los Rappi de esa semana (~$2.0M), Venta Local diaria, Didi, y clientes B2B/retail (Londres Cocina Bar $220k, Ernesto Salón Comedor $250k, Grill Station×2, Shibuya, Catalina Rozo $165k, etc.). Solo se digitaron ~13 pedidos de esa semana.

## Hallazgo 2 — Faltantes 30 jun–7 jul (~$3.1M por fuera)

Los 16 pedidos del Excel sin rastro en la app, en orden de valor:

| Fecha | Cliente | Valor | Nota |
|---|---|---|---|
| 4 jul | KARENT LORENA RAMOS | **$1.182.000** | Pedido eventos: brownies x41u, tortas x49u, cuchareables x35u, bites — productos que quizás no existen en el catálogo de la app |
| 30 jun | VELEZ CAFE EL TESORO | $478.800 | |
| 3 jul | VENTA LOCAL | $216.000 | 4 líneas mostrador |
| 3 jul | VELEZ CAFE EDIFICIO | $192.000 | 3 bites x16 |
| 7 jul | GRILL STATION CIUDAD DEL RIO | $150.000 | + 200g arequipe |
| 2 jul | ERNESTO SALON COMEDOR | $137.500 | |
| 2 jul | GRILL STATION LLANOGRANDE | $134.500 | |
| 30 jun | LUCIA LOPEZ | $89.500 | |
| 30 jun | SHIBUYA | $86.250 | |
| 1 jul | DIDI FOOD | $61.700 | ver hallazgo 3 |
| 30 jun | CAROLINA RODRIGUEZ | $66.000 | incluye "VELA PALO DORADA" $4.000 — ¿existe en catálogo? |
| 30 jun | JOHAN TABORDA | $55.000 | parcialmente absorbido en un pedido Venta Local de la BD (el día 30 jun cuadra a nivel mostrador) |
| 4 jul | VELEZ CAFE EL TESORO | $48.000 | probablemente es el 2º pedido del 3 jul en la BD (fecha corrida) |
| 4 jul | MIENTRAS TINTO | $0 | reposición mediana pistacho |
| 27 jun | KOROTO | $0 | muestras (porción + 2 bites) |

## Hallazgo 3 — Didi Food no se está digitando

9 líneas Didi en el Excel (25 jun–1 jul, ~$238k) y cero pedidos canal Didi en la BD. El canal existe en la app (color de marca definido). Decidir: o se digita, o se documenta que Didi queda por fuera.

## Hallazgo 4 — Ítems duplicados en `order_items` (bug o doble captura)

14 pedidos tienen filas de ítems duplicadas exactas (mismo producto, cantidad y precio); la suma de ítems da exactamente 2× el subtotal del pedido. El total del pedido está bien, pero **los conteos de producción e inventario saldrían inflados**. Afectados (por delivery_date): La Abuela Nita 1 jul, Entrecote Retiro 1 y 2 jul, Casa de Nadie 2 jul, Mientras Tin To 2 jul, La Fragua 2 jul, Rappi 3 y 4 jul, Consumidor Final 3, 4 y 6 jul, Ana María Toro 3 jul, Patricia Gutiérrez 4 jul. Además Manuela Londoño 3 jul tiene una fila huérfana de una edición de precio (galleta x8 a $54k junto a la definitiva de $68k).

Casi todos fueron creados durante la digitación masiva del 7 jul — sospecha: doble submit en creación de pedido. **Revisar antes del piloto del 14 jul.**

## Hallazgo 5 — Diferencias de valor en pedidos que sí están (15 casos)

**a) Domicilio mal registrado (7 casos, semana 23–27 jun):** la app tiene fee $8.000 estándar o $0 donde el Excel registró el valor real (Manuela Tangarife +$22k, Simón Ruiz +$12k, Diana Lugo +$13k, Julián Vélez +$6k, José M. Monsalve +$6k, Entrecote Interplaza +$2k, Melissa Peláez +$2k). El subtotal de productos cuadra en todos.

**b) Diferencias reales a revisar con la operadora:**

| Fecha | Cliente | Excel | BD | Causa probable |
|---|---|---|---|---|
| 1 jul | CASA DE NADIE | $363.000 | $569.500 | BD tiene 3 tortas grandes, Excel 2. Además la BD tiene otro pedido Casa de Nadie el 2 jul ($457.000) que no está en el Excel, y los del 25 y 27 jun del Excel no están en la BD — reconstruir la semana de este cliente con la operadora |
| 3 jul | RAPPI | $507.000 | $653.000 | BD tiene un 2º pedido Rappi ($146.000 a nombre Consumidor Final) que no está en el Excel |
| 30 jun | ANDREA MUÑOZ / andrea gomez | $129.000 | $30.000 | Son pedidos distintos: el del Excel (mediana OG) no está en la BD; el de la BD (cuchareable) no está en el Excel |
| 2 jul | MIENTRAS TIN TO | $294.000 | $279.000 | Galleta x8 a $51k en Excel vs $36k en BD |
| 2 jul | HERNAN ARREDONDO | $54.000 | $43.000 | BD aplica descuento 25% ($11k) que el Excel no registra |
| 2 jul | DIANA M. ARREDONDO | $89.500 | $81.500 | Aplicación de descuento/domicilio distinta |
| 25 jun | VELEZ CAFE EL TESORO | $421.200 | $429.200 | BD cobra domicilio $8k que el Excel no tiene |

**c) Precio inconsistente:** GALLETA TOFFEE CHOCOLATE X8 aparece en la BD a $36.000, $54.000 y $68.000 en la misma semana. Unificar o confirmar que son presentaciones distintas.

## Hallazgo 6 — En la BD pero no en el Excel (10)

- **Fechas corridas (muy probable):** Entrecote Retiro 1 jul $250.000 = pedido del 24 jun del Excel (el domicilio de $25.000 coincide exacto); La Abuela Nita 1 jul + 2 jul ($112.500 c/u) ≈ pedido del 24 jun del Excel (2 tortas, $225.000); Vélez Café El Tesoro 2º pedido del 3 jul = 4 jul del Excel.
- **FAIPA FRANQUICIAS S.A.S 1 jul $112.500** = GRILL STATION CIUDAD DEL RIO del Excel (razón social vs nombre comercial) — faltó el arequipe 200g ($22.000). Unificar cliente para no partir el historial.
- **Uso real de la app (buena señal):** Nidia Albany Sánchez 7 jul $160k, Tatiana Diez 7 jul $173k, Ana María Toro 8 jul (cancelado, pagado — ¿reembolso?) — ya no están en el Excel porque se crearon directo en la app.
- **Sin explicar:** Alberto Gómez 30 jun $122.250 (walk-in) y Venta Local 1 jul $55.000 (mini limón) — no aparecen en el Excel.

## Recomendaciones antes del piloto (14 jul)

1. **Corregir los ítems duplicados** de los 14 pedidos (hallazgo 4) — si no, los reportes de producción del módulo nuevo nacen inflados. Es un UPDATE/DELETE acotado; requiere aprobación explícita.
2. Decidir si la semana 23–27 jun se backfillea o se declara fuera del sistema (afecta cualquier reporte histórico).
3. Definir el flujo Didi (¿se digita o no?).
4. Revisar con la operadora los 5 casos de valor de la sección 5b y las fechas corridas de la sección 6.
5. Unificar FAIPA ↔ Grill Station Ciudad del Río como un solo cliente.
6. Verificar por qué el pedido eventos de Karent Lorena Ramos ($1.18M) no se pudo digitar — probablemente faltan productos de eventos en el catálogo.
