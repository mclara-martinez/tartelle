import { useState, useMemo, useRef } from 'react'
import { useProductionPlan, type ProductionNeed } from '../../hooks/useProductionPlan'
import { useProductionChecks } from '../../hooks/useProductionChecks'
import { useInventory } from '../../hooks/useInventory'
import { Toast } from '../../components/Toast'
import { insertQualityLog } from '../../hooks/useQualityLog'
import { insertComponentLog, useComponentLogs } from '../../hooks/useComponentLog'
import { uploadQualityPhoto } from '../../lib/storage'
import { today, tomorrow, formatDate } from '../../lib/utils'
import { LOW_STOCK_THRESHOLD, SIZE_LABELS } from '../../lib/constants'
import { CheckCircle, Plus, X, AlertTriangle, Camera } from 'lucide-react'

const QUALITY_ITEMS = ['Textura', 'Color', 'Presentación', 'Sin defectos visibles']

// Pausado 2026-07-13 (decisión M Clara): el checklist de calidad sale de la
// vista para el launch inicial, pero el código queda para reactivarlo pronto.
// Con true, marcar una línea del plan abre QualityCheckModal antes del check.
const QUALITY_CHECK_ENABLED: boolean = false

// Pausado 2026-07-13: la alerta depende de inventory_finished, que no se
// mantiene mientras la decisión de inventario esté pendiente. Vuelve con la
// fase de inventario Rappi/Didi.
const RAPPI_ALERT_ENABLED: boolean = false

const RAPPI_CONFIRMED_KEY = 'rappi_off_confirmed'
const TWO_HOURS_MS = 2 * 60 * 60 * 1000

function shouldShowRappiModal(lowStockCount: number): boolean {
  if (lowStockCount === 0) return false
  const stored = localStorage.getItem(RAPPI_CONFIRMED_KEY)
  if (!stored) return true
  return Date.now() - Number(stored) > TWO_HOURS_MS
}

// Producir hoy: lo que cocina debe mezclar/hornear HOY, que por las 12h de
// refrigeración corresponde a las entregas de MAÑANA. Mismo cálculo que el tab
// Produccion del admin (useProductionPlan); cocina marca líneas completas.
export function KitchenProductionMode() {
  const targetDate = tomorrow()
  const { needsByCategory, needs, loading } = useProductionPlan(targetDate)
  const { checksByProduct, toggleCheck } = useProductionChecks(targetDate)
  const { inventory } = useInventory()
  const { logs: componentLogs, refetch: refetchComponents } = useComponentLogs(today())
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [qualityNeed, setQualityNeed] = useState<ProductionNeed | null>(null)
  const [showComponentModal, setShowComponentModal] = useState(false)
  const [rappiDismissed, setRappiDismissed] = useState(false)

  const lowStockItems = useMemo(
    () => (RAPPI_ALERT_ENABLED ? inventory.filter(i => i.quantity <= LOW_STOCK_THRESHOLD) : []),
    [inventory]
  )
  const showRappiModal = RAPPI_ALERT_ENABLED && !rappiDismissed && shouldShowRappiModal(lowStockItems.length)

  function handleRappiConfirm() {
    localStorage.setItem(RAPPI_CONFIRMED_KEY, String(Date.now()))
    setRappiDismissed(true)
  }

  const pendingLines = useMemo(() => needs.filter(n => n.toMake > 0), [needs])
  const doneLines = useMemo(
    () => pendingLines.filter(n => checksByProduct[n.productId]),
    [pendingLines, checksByProduct]
  )

  async function handleToggle(need: ProductionNeed) {
    if (togglingId) return
    const isChecked = !!checksByProduct[need.productId]
    // Quality check solo al marcar (no al desmarcar), cuando esté activo
    if (QUALITY_CHECK_ENABLED && !isChecked) {
      setQualityNeed(need)
      return
    }
    await doToggle(need.productId)
  }

  async function doToggle(productId: string) {
    setTogglingId(productId)
    try {
      await toggleCheck(productId)
    } catch {
      setToast({ msg: 'Error al guardar', type: 'error' })
    }
    setTogglingId(null)
  }

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      {/* Encabezado del plan */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[var(--color-text-primary)] text-lg font-bold">Producir hoy</p>
          <p className="text-[var(--color-text-muted)] text-sm">
            Para entregas de mañana — <span className="capitalize">{formatDate(targetDate)}</span>
          </p>
        </div>
        {pendingLines.length > 0 && (
          <span className={`text-sm font-bold px-3 py-1.5 rounded-full tabular-nums ${
            doneLines.length === pendingLines.length
              ? 'bg-[var(--color-success-bg)] text-[var(--color-success-text)]'
              : 'bg-[var(--color-status-production-bg)] text-[var(--color-status-production)]'
          }`}>
            {doneLines.length} de {pendingLines.length} líneas listas
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 bg-white rounded-xl border border-[var(--color-border)]">
          <p className="text-[var(--color-text-muted)] text-sm">Cargando plan...</p>
        </div>
      ) : needs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-xl border border-[var(--color-border)]">
          <CheckCircle size={48} className="text-[var(--color-success-text)] mb-3" />
          <p className="text-[var(--color-text-primary)] text-lg font-bold">Nada por producir</p>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">No hay pedidos ni extras para mañana</p>
        </div>
      ) : (
        <div className="space-y-6">
          {needsByCategory.map(group => (
            <div key={group.category} className="space-y-3">
              <p className="text-[var(--color-text-muted)] text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                {group.label}
                <span className="h-px flex-1 bg-[var(--color-border)]" />
              </p>
              {group.flavors.map(({ flavor, items }) => (
                <div key={flavor} className="bg-white rounded-xl overflow-hidden border border-[var(--color-border)]">
                  <div className="px-5 pt-4 pb-3 border-b border-[var(--color-border)]">
                    <p className="text-[var(--color-text-primary)] text-xl font-bold capitalize">{flavor}</p>
                  </div>
                  <div className="divide-y divide-[var(--color-border-light)]">
                    {items.map(item => {
                      const check = checksByProduct[item.productId]
                      const isCovered = item.toMake === 0
                      if (isCovered) {
                        return (
                          <div key={item.productId} className="flex items-center justify-between gap-4 px-5 py-3 opacity-60">
                            <div className="min-w-0">
                              <p className="text-[var(--color-text-secondary)] text-base capitalize">{SIZE_LABELS[item.size]}</p>
                              <p className="text-[var(--color-text-muted)] text-xs mt-0.5">
                                {item.fromOrders} pedido{item.fromOrders !== 1 ? 's' : ''}
                                {item.fromExtras > 0 && ` + ${item.fromExtras} extra`}
                                {` · ${item.available} disp.`}
                              </p>
                            </div>
                            <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-success-text)] flex-shrink-0">
                              <CheckCircle size={16} />
                              Cubierto
                            </span>
                          </div>
                        )
                      }
                      return (
                        <button
                          key={item.productId}
                          onClick={() => handleToggle(item)}
                          disabled={togglingId === item.productId}
                          className={`w-full flex items-center justify-between gap-4 px-5 py-4 min-h-[64px] text-left transition-colors disabled:opacity-50 ${
                            check ? 'bg-[var(--color-success-bg)]' : 'hover:bg-[var(--color-bg-hover)]'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className={`text-lg font-bold capitalize ${
                              check ? 'text-[var(--color-success-text)] line-through' : 'text-[var(--color-text-primary)]'
                            }`}>
                              {SIZE_LABELS[item.size]} × {item.toMake}
                            </p>
                            <p className="text-[var(--color-text-muted)] text-xs mt-0.5">
                              {item.fromOrders} pedido{item.fromOrders !== 1 ? 's' : ''}
                              {item.fromExtras > 0 && ` + ${item.fromExtras} extra`}
                              {item.available > 0 && ` · ${item.available} disp.`}
                            </p>
                            {check && (
                              <p className="text-[var(--color-success-text)] text-xs font-medium mt-0.5">
                                Hecho {new Date(check.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                {check.user_email ? ` · ${check.user_email.split('@')[0]}` : ''}
                              </p>
                            )}
                          </div>
                          <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            check
                              ? 'border-[var(--color-success-text)] bg-[var(--color-success-text)]'
                              : 'border-[var(--color-border)]'
                          }`}>
                            {check && <CheckCircle size={20} className="text-white" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Componentes producidos hoy */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[var(--color-text-primary)] text-base font-bold">Componentes producidos hoy</p>
          <button
            onClick={() => setShowComponentModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors min-h-[44px]"
          >
            <Plus size={16} />
            Añadir componente
          </button>
        </div>
        {componentLogs.length === 0 ? (
          <div className="flex items-center justify-center py-8 bg-white rounded-xl border border-[var(--color-border)]">
            <p className="text-[var(--color-text-muted)] text-sm">Ningún componente registrado hoy</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl overflow-hidden border border-[var(--color-border)]">
            <div className="divide-y divide-[var(--color-border-light)]">
              {componentLogs.map(entry => (
                <div key={entry.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--color-text-secondary)] text-base font-medium truncate">{entry.nombre}</p>
                    <p className="text-[var(--color-text-muted)] text-sm mt-0.5">{entry.cantidad_descripcion}</p>
                  </div>
                  <span className="text-[var(--color-text-muted)] text-sm flex-shrink-0 tabular-nums">
                    {new Date(entry.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showComponentModal && (
        <AddComponentModal
          onAdd={async (nombre, cantidadDescripcion) => {
            await insertComponentLog({ nombre, cantidad_descripcion: cantidadDescripcion })
            refetchComponents()
            setShowComponentModal(false)
          }}
          onClose={() => setShowComponentModal(false)}
        />
      )}

      {qualityNeed && (
        <QualityCheckModal
          productId={qualityNeed.productId}
          orderId={null}
          subtitle={`${qualityNeed.flavor} ${SIZE_LABELS[qualityNeed.size]} × ${qualityNeed.toMake}`}
          onConfirm={async passed => {
            const need = qualityNeed
            setQualityNeed(null)
            if (passed) {
              await doToggle(need.productId)
            } else {
              setToast({ msg: 'Lote pendiente: revisar calidad', type: 'error' })
            }
          }}
          onClose={() => setQualityNeed(null)}
          onError={msg => setToast({ msg, type: 'error' })}
        />
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {showRappiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white border border-[var(--color-border)] rounded-2xl w-full max-w-md mx-auto max-h-[80vh] flex flex-col">
            <div className="px-6 pt-6 pb-4 flex-shrink-0">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="h-6 w-6 text-[var(--color-warning-text)] flex-shrink-0" />
                <h2 className="text-[var(--color-warning-text)] text-xl font-bold">Stock bajo</h2>
              </div>
              <p className="text-[var(--color-text-secondary)] text-sm">Los siguientes productos tienen stock bajo:</p>
            </div>
            <ul className="flex-1 overflow-y-auto min-h-0 px-6 space-y-2">
              {lowStockItems.map(item => (
                <li key={item.id} className="flex items-center justify-between gap-3">
                  <span className="text-[var(--color-text-primary)] text-sm">{item.product?.name ?? item.product_id}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded tabular-nums ${
                    item.quantity === 0 ? 'bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]' : 'bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]'
                  }`}>
                    {item.quantity === 0 ? 'Sin stock' : `${item.quantity} uds`}
                  </span>
                </li>
              ))}
            </ul>
            <div className="px-6 py-5 flex-shrink-0 border-t border-[var(--color-border)]">
              <button
                onClick={handleRappiConfirm}
                className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white py-3 px-6 rounded-xl font-bold text-lg transition-colors min-h-[48px]"
              >
                Ya apagué Rappi ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AddComponentModal({
  onAdd,
  onClose,
}: {
  onAdd: (nombre: string, cantidadDescripcion: string) => Promise<void>
  onClose: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canSave = nombre.trim().length > 0 && cantidad.trim().length > 0

  async function handleSave() {
    if (!canSave || submitting) return
    setSubmitting(true)
    try {
      await onAdd(nombre.trim(), cantidad.trim())
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white border border-[var(--color-border)] rounded-2xl w-full max-w-md mx-auto">
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-[var(--color-border)]">
          <h2 className="text-[var(--color-text-primary)] text-xl font-bold">Añadir componente</h2>
          <button onClick={onClose} className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[var(--color-text-secondary)] text-sm">Nombre del componente</label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="ej. Crema pastelera, Bizcocho de vainilla"
              className="w-full bg-white border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] text-sm focus:outline-none focus:border-[var(--color-accent)]"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[var(--color-text-secondary)] text-sm">Cantidad</label>
            <input
              type="text"
              value={cantidad}
              onChange={e => setCantidad(e.target.value)}
              placeholder="ej. 2 litros, 500 g, 3 bandejas"
              className="w-full bg-white border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] text-sm focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
        </div>

        <div className="px-6 py-5 border-t border-[var(--color-border)] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-xl font-medium hover:bg-[var(--color-bg-hover)] transition-colors min-h-[48px]"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || submitting}
            className="flex-1 py-3 bg-[var(--color-accent)] text-white rounded-xl font-bold hover:bg-[var(--color-accent-hover)] disabled:opacity-40 transition-colors min-h-[48px]"
          >
            {submitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// En pausa (QUALITY_CHECK_ENABLED=false): se reactiva pronto sobre el check de
// línea del plan — al marcar una línea, validar calidad antes de guardar.
function QualityCheckModal({
  productId,
  orderId,
  subtitle,
  onConfirm,
  onClose,
  onError,
}: {
  productId: string
  orderId: string | null
  subtitle: string
  onConfirm: (passed: boolean) => Promise<void>
  onClose: () => void
  onError: (msg: string) => void
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set(QUALITY_ITEMS))
  const [observacion, setObservacion] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const failedItems = QUALITY_ITEMS.filter(item => !checked.has(item))
  const needsObservacion = failedItems.length > 0
  const canConfirm = !needsObservacion || observacion.trim().length > 0

  function toggleItem(item: string) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(item)) next.delete(item)
      else next.add(item)
      return next
    })
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleConfirm() {
    if (!canConfirm || submitting) return
    setSubmitting(true)
    try {
      let photoPath: string | null = null
      if (photoFile) photoPath = await uploadQualityPhoto(photoFile, productId)
      await insertQualityLog({
        product_id: productId,
        items_fallidos: failedItems,
        observacion: needsObservacion ? observacion.trim() : null,
        order_id: orderId,
        photo_path: photoPath,
      })
    } catch {
      onError('No se pudo guardar el log de calidad')
    }
    await onConfirm(failedItems.length === 0)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white border border-[var(--color-border)] rounded-2xl w-full max-w-md mx-auto max-h-[90vh] flex flex-col">
        <div className="px-6 pt-6 pb-4 flex-shrink-0 flex items-center justify-between border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-[var(--color-text-primary)] text-xl font-bold">Control de calidad</h2>
            <p className="text-[var(--color-text-muted)] text-sm mt-0.5">{subtitle}</p>
          </div>
          <button onClick={onClose} className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 space-y-3">
          {QUALITY_ITEMS.map(item => {
            const isOk = checked.has(item)
            return (
              <button
                key={item}
                onClick={() => toggleItem(item)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-colors min-h-[52px] ${
                  isOk
                    ? 'bg-[var(--color-success-bg)] border-[var(--color-success-text)]/30'
                    : 'bg-[var(--color-danger-bg)] border-[var(--color-danger-text)]/30'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  isOk ? 'border-[var(--color-success-text)] bg-[var(--color-success-text)]' : 'border-[var(--color-danger-text)]'
                }`}>
                  {isOk && <CheckCircle size={12} className="text-white" />}
                </div>
                <span className={`text-base font-medium ${isOk ? 'text-[var(--color-success-text)]' : 'text-[var(--color-danger-text)]'}`}>
                  {item}
                </span>
              </button>
            )
          })}

          {needsObservacion && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[var(--color-danger-text)] text-sm font-medium flex items-center gap-1.5">
                <AlertTriangle size={14} />
                Falló: {failedItems.join(', ')} — descripción requerida
              </p>
              <textarea
                value={observacion}
                onChange={e => setObservacion(e.target.value)}
                placeholder="Describe el problema observado..."
                rows={3}
                className="w-full bg-white border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] text-sm resize-none focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
          )}

          <div className="pt-1">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="hidden"
            />
            {photoPreview ? (
              <div className="relative inline-block">
                <img src={photoPreview} alt="Foto del lote" className="w-20 h-20 rounded-xl object-cover" />
                <button
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                >
                  <X size={10} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-surface-warm)] text-[var(--color-text-secondary)] rounded-xl text-sm hover:bg-[var(--color-bg-active)] transition-colors min-h-[44px]"
              >
                <Camera size={16} />
                Foto del lote (opcional)
              </button>
            )}
          </div>
        </div>

        <div className="px-6 py-5 flex-shrink-0 border-t border-[var(--color-border)] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-xl font-medium hover:bg-[var(--color-bg-hover)] transition-colors min-h-[48px]"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || submitting}
            className="flex-1 py-3 bg-[var(--color-accent)] text-white rounded-xl font-bold hover:bg-[var(--color-accent-hover)] disabled:opacity-40 transition-colors min-h-[48px]"
          >
            {submitting ? 'Guardando...' : 'Confirmar ✓'}
          </button>
        </div>
      </div>
    </div>
  )
}
