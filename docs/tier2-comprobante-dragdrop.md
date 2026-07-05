# Tier 2 — Comprobante de pago: drag-and-drop + obligatorio

> Spec ejecutable para una sesión dedicada. Parte del plan en [`feedback-operaria-plan.md`](feedback-operaria-plan.md) (item #2).
> Stack: React 19 + TS + Vite + Tailwind 4 + Supabase. App en `/app`.

## Objetivo

La operaria carga el comprobante arrastrando la imagen desde WhatsApp Web sin tener que
descargarla y volver a subirla. Y si el método de pago es electrónico, el comprobante debe
ser obligatorio para poder guardar el pedido.

Dos cambios independientes:
1. **Drag-and-drop + pegar (Ctrl+V)** en el componente de subida de fotos.
2. **Validación de guardado**: si `payment_method` es `transfer` o `bold`, no se puede guardar el pedido sin comprobante.

## Estado actual (verificado)

- `app/src/components/PhotoUpload.tsx` — subida **solo por click**: `<input type="file" accept="image/*" capture="environment">` oculto (~línea 65). Sin drag-drop ni paste. Reutilizable (también lo usan dispatch e invoice).
- `app/src/lib/storage.ts` — `uploadOrderPhoto(file, orderId, type)`; comprime en cliente (max 1200px, JPEG 0.8); tipos `'dispatch' | 'receipt' | 'invoice'`; ruta `{orderId}/{type}-{timestamp}.jpg`; bucket `order-photos`.
- `app/src/views/OrderCreateView.tsx`:
  - Comprobante (`PhotoUpload type="receipt"`) se muestra **solo** si `paymentMethod === 'transfer' || 'bold'` (~líneas 555–578). Estado en `paymentReceiptUrl` (~línea 42).
  - El comprobante es **opcional**: el form guarda sin él. `payment_status` se setea `paymentReceiptUrl ? 'paid' : 'pending'` (~línea 181).
  - Al cambiar de método se resetea `setPaymentReceiptUrl(null)` (~línea 544).

> Verificar los números de línea al abrir; pueden haber corrido.

## Cambios a implementar

### 1. Drag-and-drop + paste en `PhotoUpload.tsx`

- Hacer que el contenedor del botón de subida acepte:
  - **Drop** de archivos de imagen (`onDragOver` con `preventDefault` para habilitar drop; `onDrop` lee `e.dataTransfer.files`).
  - **Paste** (`onPaste` leyendo `e.clipboardData.files` / items tipo imagen) — útil porque arrastrar desde WhatsApp Web es inconsistente entre navegadores.
  - Mantener el click → file picker actual.
- Reutilizar la misma ruta de subida que el `onChange` actual (extraer un helper `handleFile(file: File)` que ya comprima y suba vía `uploadOrderPhoto`).
- Feedback visual:
  - Estado "arrastrando encima": resaltar la zona (borde/acento con `var(--color-accent)`).
  - Validar que el archivo sea imagen; si no, descartar sin romper.
  - Mantener spinner durante subida y thumbnail al terminar.
- Touch targets y estilos según convenciones del repo (CSS vars, no hex hardcodeado salvo vistas dark).
- Como `PhotoUpload` es reutilizable, el drag-drop/paste debe quedar disponible en todos sus usos sin romper dispatch/invoice.

### 2. Comprobante obligatorio para guardar (transfer y Bold)

En `OrderCreateView.tsx`, en el submit del pedido:
- Si `paymentMethod === 'transfer' || paymentMethod === 'bold'` y `!paymentReceiptUrl`:
  - Bloquear el guardado.
  - Mostrar mensaje claro vía el patrón de toast existente, p. ej.: **"Adjunta el comprobante de pago para guardar el pedido."**
- No afecta a `cash`, `rappi` ni al futuro `credit` (Tier 1) — esos siguen sin comprobante.
- Revisar que el reset al cambiar de método no deje un estado inconsistente.

## Fuera de alcance

- No tocar la lógica de `payment_status` más allá de lo necesario.
- No agregar el método "Crédito" (eso es Tier 1).
- No tocar dispatch/invoice salvo lo que herede el `PhotoUpload`.

## Criterios de aceptación

- [ ] Arrastrar una imagen sobre el campo de comprobante la sube (sin descargarla antes).
- [ ] Pegar (Ctrl+V) una imagen en el campo la sube.
- [ ] El click → file picker sigue funcionando.
- [ ] Con método transfer o Bold y sin comprobante, el pedido **no** guarda y muestra mensaje claro.
- [ ] Con cash/rappi el pedido guarda sin comprobante.
- [ ] No se rompen los otros usos de `PhotoUpload` (dispatch, invoice).
- [ ] `npm run build` (tsc -b) pasa sin errores. `npm run lint` limpio.

## Verificación

Desde `/app`: `npm run dev`. Probar en el preview:
1. Crear pedido, elegir Transferencia, intentar guardar sin comprobante → debe bloquear.
2. Arrastrar una imagen al campo → sube y muestra thumbnail; guardar → ok.
3. Repetir con Bold.
4. Elegir Efectivo → guarda sin comprobante.
5. Probar pegar con Ctrl+V.

## Supabase

No requiere cambios de esquema ni de datos. Sin operaciones que necesiten aprobación.
