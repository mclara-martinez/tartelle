# Metodología de Implementación — MClara Martínez
**Versión:** Junio 2026  
**Caso de referencia:** Tartelle (Jun 2026)  
**Aplicable a:** Restoflow y proyectos futuros

---

## Principio central

> **Primero duplicamos el trabajo. Luego reemplazamos. Nunca al revés.**

El cliente nunca depende del sistema nuevo hasta que ese sistema ha demostrado que funciona. El sistema se agrega encima de la operación existente — no la interrumpe ni la reemplaza hasta que está probado.

---

## El problema que resuelve esta metodología

Implementar software en una operación en curso es riesgoso. El riesgo no está en el sistema — está en la transición. Los errores de migración cuestan más que los errores de desarrollo. Esta metodología protege la operación del cliente mientras el sistema se valida, y protege la relación cliente-proveedor al demostrar valor antes de exigir cambio.

---

## Estructura en dos niveles

### Nivel 1 — Roadmap (macro)
Un documento visual de alto nivel con 4 a 6 módulos ordenados por valor de negocio. Cada módulo tiene:
- Nombre orientado al resultado para el cliente (no al feature técnico)
- Fechas concretas solo para los primeros 2–3 módulos
- Módulos futuros en "fase futura" con estimado en semanas — sin fecha fija
- Fee mensual que crece incrementalmente al activar cada módulo

**Ejemplo Tartelle:**
```
Módulo 1 — Plataforma revisada       (Jun 6–15)
Módulo 2 — Lanzamiento y equipo      (Jun 16–Jul 25)
Módulo 3 — CRM con WhatsApp          (Jul 12–Ago 10)
Módulo 4 — Comunicación automática   (fase futura, ~7 semanas)
Módulo 5 — Materias primas           (fase futura, ~9 semanas)
Módulo 6 — Siigo, reportes y Rappi   (fase futura, ~9 semanas)
```

**Regla:** Las fechas de módulos futuros las define la operación del cliente, no un calendario armado con meses de anticipación.

---

### Nivel 2 — Plan de implementación (micro)
Un documento interno que desglosa el módulo de lanzamiento en sub-fases validadas. El cliente ve el módulo; las sub-fases son la ingeniería de cómo se ejecuta de forma segura.

---

## Las 5 sub-fases de lanzamiento

Todo módulo de lanzamiento se divide en fases que siguen este patrón:

| # | Fase | Patrón | Quién entra |
|---|------|--------|-------------|
| 1 | **Operación en paralelo** | Doble ingreso: proceso antiguo + sistema nuevo simultáneamente | Admin / usuario principal |
| 2 | **Vista pasiva** | El equipo *ve* el sistema pero no depende de él. El proceso antiguo sigue activo. | Siguiente rol en la cadena |
| 3 | **Operación activa** | El equipo opera en el sistema. El proceso antiguo pasa a ser respaldo. | Mismo rol de fase 2 |
| 4 | **Cierre del ciclo** | El último eslabón de la cadena entra. Inventario y reportes se validan. | Rol final (driver, contador, etc.) |
| 5 | **Flujo completo** | El sistema es la operación. El proceso antiguo es emergencia, no rutina. | Todo el equipo |

Cada fase dura **mínimo una semana**. No se avanza hasta cumplir el criterio de validación.

---

## Criterios de validación

Cada fase tiene un criterio de paso claro, medible y binario — no subjetivo. Se revisa en días específicos (cada 2 días durante la fase).

**Estructura del criterio:**
```
[Qué se compara] = [Contra qué] durante [N revisiones/días consecutivos]
```

**Ejemplos:**
- Fase 1: "Los pedidos del sistema coinciden con el Excel en 3 revisiones seguidas"
- Fase 2: "Lo que dice el sistema en nevera = lo que hay físicamente al cierre"
- Fase 5: "El equipo opera sin el proceso antiguo por 5 días seguidos"

**Umbral aceptable:** Cero discrepancias, o < 2% explicadas y documentadas. Si hay discrepancias no explicadas, la fase no avanza.

---

## Cadencia de revisión

Durante cada fase se hacen revisiones de cierre en días fijos (no diario — el cliente no puede sostener eso):

```
Semana de fase:  Lun  Mar  Mié  Jue  Vie
Revisión:                 ✓         ✓    ✓ (decisión de avance)
```

La revisión del viernes define si se avanza a la siguiente fase la semana siguiente.

**Quién participa:** Preferiblemente el cliente hace la revisión — tú la facilitas y documentas. Si el cliente no puede, la haces tú y presentas los resultados.

---

## Plan de rollback

En cada fase existe un plan de vuelta explícito que el cliente conoce de antemano:

1. Si hay un error que no se resuelve el mismo día → el equipo vuelve al proceso anterior
2. No hay pérdida de datos ni de operación (el sistema es aditivo)
3. Se documenta el error en detalle
4. No se retoma la fase hasta que el sistema esté corregido
5. No se avanza a la siguiente fase hasta que la actual pase el criterio

**El cliente debe saber esto antes de empezar.** La transparencia del rollback genera confianza, no inseguridad.

---

## Estructura de pendientes

Los pendientes se organizan por fase, no por área técnica. Para cada fase hay dos tipos:

**Pendientes técnicos (tu responsabilidad):**
- Bugs críticos que bloquean el go-live
- Ajustes de UX acordados con el cliente
- Configuración de accesos y dispositivos

**Pendientes del cliente (su responsabilidad):**
- Datos que deben entregar (catálogos, listas, precios)
- Personas que deben estar disponibles para entrenar
- Decisiones que deben tomar (quién hace la revisión, cuál es el threshold)

Si los pendientes del cliente no llegan, la fase no arranca. Esto se comunica de forma clara y sin drama.

---

## Entrenamiento por rol

El entrenamiento es corto, por rol y justo antes de que el rol entre a operar — no semanas antes.

| Rol | Duración máx. | Cuándo |
|-----|---------------|--------|
| Admin / usuario principal | 30 min | Semana antes de Fase 1 |
| Equipo operativo (cocina, bodega) | 20 min | Día antes de Fase 2 |
| Rol de cierre (driver, contador) | 10 min | Día antes de Fase 4 |

La UI debe ser suficientemente obvia para que el entrenamiento sea demostración, no manual.

---

## Dispositivos y accesos

Definir antes del go-live:

| Rol | Dispositivo | Tipo de acceso | Configuración |
|-----|-------------|---------------|---------------|
| Admin | Computador | Usuario completo (email + password) | Navegador con URL guardada |
| Equipo operativo | Tablet / iPad | Usuario restringido (rol cocina) | URL fija en bookmark |
| Rol de cierre | Celular | URL directa sin login, o usuario simple | Chrome, sin app |

**Nunca asumir que el cliente ya tiene el dispositivo configurado.** Verificar en la semana de preparación.

---

## Módulo de preparación (siempre el primero)

Antes de cualquier lanzamiento hay un módulo de preparación (1 a 2 semanas) cuyo único objetivo es que el sistema esté listo para recibir operación real. No es visible para el usuario final.

**Checklist universal de preparación:**
- [ ] Bug críticos resueltos y verificados
- [ ] Catálogo de datos del cliente cargado y validado 1:1 (productos, precios, clientes, descuentos)
- [ ] Accesos creados y probados para cada rol
- [ ] Dispositivos configurados con URL y login
- [ ] Sesión de entrenamiento del admin coordinada
- [ ] Proceso de revisión definido (quién, cuándo, en qué formato)
- [ ] Criterios de validación acordados con el cliente
- [ ] Plan de rollback comunicado y entendido

---

## Pausas intencionales

Diciembre y mayo son meses de alta operación para negocios de alimentos y restaurantes. **No se lanza nada nuevo en esos meses.** El equipo consolida hábitos antes de agregar funcionalidad.

Aplicar este criterio a cada cliente según su temporada alta.

---

## Comunicación con el cliente

**Qué mostrar en reuniones de seguimiento:**
1. Estado de la fase actual (en curso / validada / bloqueada)
2. Resultado de las últimas revisiones (con datos, no con sensaciones)
3. Siguiente fase: qué arranca, qué necesito del cliente, qué fecha
4. Un solo riesgo activo — si hay más de uno, priorizar

**Qué no hacer:**
- No mostrar detalles técnicos (bugs, stack, nombres de tablas)
- No presentar opciones sin recomendación — el cliente contrata criterio
- No avanzar de fase en una reunión — las fases avanzan con datos, no con optimismo

---

## Adaptación a Restoflow

Restoflow gestiona pedidos y compras para restaurantes (B2B). Los roles y la cadena de operación son distintos a Tartelle, pero la metodología aplica igual.

**Mapeo tentativo de roles:**
| Tartelle | Restoflow |
|----------|-----------|
| Admin (Andrea) | Administrador de compras / gerente |
| Cocina | Bodega / recepción de mercancía |
| Domiciliario | Proveedor / repartidor |

**Módulos probables para Restoflow:**
1. Gestión de pedidos a proveedores (reemplaza Excel/WhatsApp)
2. Recepción y verificación de mercancía
3. Inventario de insumos en tiempo real
4. Órdenes de compra automáticas
5. Reportes y análisis de proveedores

**Diferencia clave con Tartelle:** En Restoflow el flujo es de compra (outbound de dinero), no de venta. El criterio de validación en Fase 1 compara órdenes generadas en el sistema contra órdenes reales enviadas a proveedores — no contra un Excel de ventas.

---

## Checklist de inicio para proyecto nuevo

Antes de armar el roadmap de un proyecto nuevo:

- [ ] ¿Cuál es el proceso exacto que reemplazamos? (no el proceso ideal — el real de hoy)
- [ ] ¿Cuántas personas lo usan y con qué dispositivos?
- [ ] ¿Cuál es el mes de temporada alta? (define las pausas)
- [ ] ¿Qué datos existen hoy que hay que migrar? (catálogos, clientes, históricos)
- [ ] ¿Quién hace la validación durante la fase en paralelo? ¿Con qué tiempo disponible?
- [ ] ¿Hay un bug o proceso crítico que bloquea el go-live si no está resuelto?
- [ ] ¿Cuál es el umbral de error aceptable para el cliente?
