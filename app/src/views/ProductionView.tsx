import { useState, useMemo, useCallback } from 'react'
import { usePastActiveOrders } from '../hooks/useOrders'
import { useProducts } from '../hooks/useProducts'
import { useProductionPlan } from '../hooks/useProductionPlan'
import { useProductionChecks } from '../hooks/useProductionChecks'
import { useProductionExtras } from '../hooks/useProductionExtras'
import { useProductionCounts } from '../hooks/useProductionCounts'
import { Toast } from '../components/Toast'
import { today, tomorrow, shiftDay } from '../lib/utils'
import { SIZE_LABELS } from '../lib/constants'
import { CheckCircle, ClipboardList as PageIcon, Plus, X, ShoppingBag, ChevronLeft, ChevronRight, Copy, Boxes, AlertTriangle } from 'lucide-react'
import { format, parseISO, addDays, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import type { ProductSize } from '../lib/types'

function formatDateLabel(dateStr: string): string {
  const t = today()
  const tm = tomorrow()
  if (dateStr === t) return 'Hoy'
  if (dateStr === tm) return 'Mañana'
  return format(parseISO(dateStr), "EEE d MMM yyyy", { locale: es })
}

export function ProductionView() {
  const [targetDate, setTargetDate] = useState<string>(tomorrow())
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const [extraProductId, setExtraProductId] = useState('')
  const [extraQty, setExtraQty] = useState(1)
  const [savingExtra, setSavingExtra] = useState(false)
  const [removingExtra, setRemovingExtra] = useState<string | null>(null)

  const [countProductId, setCountProductId] = useState('')
  const [countQty, setCountQty] = useState(0)
  const [savingCount, setSavingCount] = useState(false)
  const [removingCount, setRemovingCount] = useState<string | null>(null)

  const goToPrev = useCallback(() => setTargetDate(d => format(subDays(parseISO(d), 1), 'yyyy-MM-dd')), [])
  const goToNext = useCallback(() => setTargetDate(d => format(addDays(parseISO(d), 1), 'yyyy-MM-dd')), [])
  const { products } = useProducts()
  const {
    needs, needsByCategory, totalToMake, loading,
    extras, counts, upsertExtra, removeExtra, upsertCount, removeCount, refetchCounts,
  } = useProductionPlan(targetDate)
  const { checksByProduct } = useProductionChecks(targetDate)
  const { reservedByProduct, overdueCount } = usePastActiveOrders(targetDate)

  // Vitrina del día anterior: disponible + extras que se planearon para ese
  // día. Lo que de ahí no se haya vendido sigue en la nevera sin dueño y debe
  // volver a entrar como "Terminado disponible" antes de agregar extras nuevos.
  const prevDate = useMemo(() => shiftDay(targetDate, -1), [targetDate])
  const { extras: prevExtras } = useProductionExtras(prevDate)
  const { counts: prevCounts } = useProductionCounts(prevDate)

  const prevVitrina = useMemo(() => {
    const map: Record<string, { flavor: string; size: ProductSize; extras: number; available: number }> = {}
    for (const e of prevExtras) {
      if (!e.product) continue
      map[e.product_id] = map[e.product_id] ?? { flavor: e.product.flavor, size: e.product.size, extras: 0, available: 0 }
      map[e.product_id].extras += e.quantity
    }
    for (const c of prevCounts) {
      if (!c.product) continue
      map[c.product_id] = map[c.product_id] ?? { flavor: c.product.flavor, size: c.product.size, extras: 0, available: 0 }
      map[c.product_id].available += c.quantity
    }
    return Object.entries(map)
      .map(([productId, v]) => ({ productId, ...v, total: v.extras + v.available }))
      .sort((a, b) => a.flavor.localeCompare(b.flavor) || a.size.localeCompare(b.size))
  }, [prevExtras, prevCounts])

  const retailProducts = useMemo(() =>
    products.filter(p => p.catalog === 'retail' || p.catalog === 'ambos'),
    [products]
  )

  const retailProductsByFlavor = useMemo(() => {
    const groups: Record<string, typeof retailProducts> = {}
    for (const p of retailProducts) {
      groups[p.flavor] = groups[p.flavor] ?? []
      groups[p.flavor].push(p)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [retailProducts])

  // Texto para WhatsApp: solo los HACER, agrupado por categoría → sabor.
  const summaryText = useMemo(() => {
    const lines: string[] = [`PRODUCCIÓN — ${format(parseISO(targetDate), "EEE d MMM", { locale: es })}`]
    for (const group of needsByCategory) {
      const flavors = group.flavors
        .map(f => ({ ...f, items: f.items.filter(i => i.toMake > 0) }))
        .filter(f => f.items.length > 0)
      if (flavors.length === 0) continue
      lines.push('', `== ${group.label.toUpperCase()} ==`)
      for (const { flavor, items } of flavors) {
        lines.push(flavor.toUpperCase())
        for (const item of items) {
          lines.push(`• ${SIZE_LABELS[item.size]}: HACER ${item.toMake}`)
        }
      }
    }
    lines.push('', `Total: ${totalToMake} unidades`)
    return lines.join('\n')
  }, [needsByCategory, targetDate, totalToMake])

  async function handleCopySummary() {
    try {
      await navigator.clipboard.writeText(summaryText)
      setToast({ msg: 'Resumen copiado', type: 'success' })
    } catch {
      // Fallback para contextos sin Clipboard API (http local, permisos)
      const ta = document.createElement('textarea')
      ta.value = summaryText
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      setToast(ok ? { msg: 'Resumen copiado', type: 'success' } : { msg: 'No se pudo copiar', type: 'error' })
    }
  }

  async function handleAddExtra() {
    if (!extraProductId || extraQty < 1) return
    setSavingExtra(true)
    try {
      await upsertExtra(extraProductId, extraQty)
      setExtraProductId('')
      setExtraQty(1)
      setToast({ msg: 'Extra agregado', type: 'success' })
    } catch {
      setToast({ msg: 'Error al guardar extra', type: 'error' })
    }
    setSavingExtra(false)
  }

  async function handleRemoveExtra(id: string) {
    setRemovingExtra(id)
    try {
      await removeExtra(id)
    } catch {
      setToast({ msg: 'Error al eliminar extra', type: 'error' })
    }
    setRemovingExtra(null)
  }

  async function handleRemoveCount(id: string) {
    setRemovingCount(id)
    try {
      await removeCount(id)
    } catch {
      setToast({ msg: 'Error al eliminar conteo', type: 'error' })
    }
    setRemovingCount(null)
  }

  async function handleAddCount() {
    if (!countProductId || countQty < 0) return
    setSavingCount(true)
    try {
      await upsertCount(countProductId, countQty)
      await refetchCounts()
      setCountProductId('')
      setCountQty(0)
      setToast({ msg: 'Conteo guardado', type: 'success' })
    } catch (err) {
      console.error('[production_counts] error al guardar conteo:', err)
      setToast({ msg: 'Error al guardar conteo', type: 'error' })
    }
    setSavingCount(false)
  }

  // Reservado a pedidos 'ready' sin entregar del producto seleccionado — el
  // hint que le dice a la operadora cuánto restar del mensaje de cocina.
  const selectedCountReserved = countProductId ? (reservedByProduct[countProductId] ?? 0) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <PageIcon className="h-6 w-6 text-[var(--color-text-secondary)]" strokeWidth={1.5} />
        <div>
          <h1 className="text-xl font-bold">Produccion</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Pedidos + extras − disponible = a producir</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={goToPrev}
          className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-warm)] transition-colors duration-150"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {targetDate !== today() && (
          <button
            onClick={() => setTargetDate(today())}
            className="text-xs font-medium px-2 py-1 rounded-md border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-colors duration-150"
          >
            Hoy
          </button>
        )}
        {targetDate !== tomorrow() && (
          <button
            onClick={() => setTargetDate(tomorrow())}
            className="text-xs font-medium px-2 py-1 rounded-md border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-colors duration-150"
          >
            Mañana
          </button>
        )}
        <span className="text-sm font-semibold text-[var(--color-text-primary)] capitalize min-w-[10rem] text-center">
          {formatDateLabel(targetDate)}
        </span>
        <button
          onClick={goToNext}
          className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-warm)] transition-colors duration-150"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {overdueCount > 0 && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{overdueCount} pedido{overdueCount !== 1 ? 's' : ''} con fecha pasada sin producir ni entregar.</span>{' '}
            Revisa en Pedidos si alguno debe entrar al plan como extra o cerrarse.
          </p>
        </div>
      )}

      {/* Conteo de producto terminado disponible */}
      <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
          <Boxes className="h-4 w-4 text-[var(--color-accent)] flex-shrink-0" strokeWidth={1.5} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Terminado disponible</p>
            <p className="text-xs text-[var(--color-text-muted)]">Conteo de cocina menos lo reservado a pedidos listos sin entregar</p>
          </div>
        </div>

        {counts.length > 0 && (
          <div className="divide-y divide-[var(--color-border-light)]">
            {counts.map(count => (
              <div key={count.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <p className="text-sm text-[var(--color-text-primary)] truncate min-w-0">
                  {count.product?.flavor} · {SIZE_LABELS[count.product?.size ?? 'other']}
                </p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-medium text-[var(--color-accent)]">{count.quantity} disp.</span>
                  <button
                    onClick={() => handleRemoveCount(count.id)}
                    disabled={removingCount === count.id}
                    className="p-1 rounded text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 transition-colors duration-150 disabled:opacity-40"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="px-4 py-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <select
              value={countProductId}
              onChange={e => setCountProductId(e.target.value)}
              className="flex-1 min-w-0 text-sm border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 bg-white text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            >
              <option value="">Seleccionar producto...</option>
              {retailProductsByFlavor.map(([flavor, ps]) => (
                <optgroup key={flavor} label={flavor.charAt(0).toUpperCase() + flavor.slice(1)}>
                  {ps.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <input
              type="number"
              min={0}
              max={99}
              value={countQty}
              onChange={e => setCountQty(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-14 text-sm text-center border border-[var(--color-border)] rounded-lg px-2 py-1.5 bg-white text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
            <button
              onClick={handleAddCount}
              disabled={!countProductId || savingCount}
              className="flex items-center gap-1 text-sm font-medium text-white bg-[var(--color-accent)] px-3 py-1.5 rounded-lg hover:bg-[var(--color-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 flex-shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar
            </button>
          </div>
          {selectedCountReserved > 0 && (
            <p className="text-xs text-amber-700">
              Reservado: {selectedCountReserved} (pedidos listos sin entregar, de cualquier fecha) — réstalo del conteo de cocina
            </p>
          )}
        </div>
      </div>

      {/* Extras del día */}
      <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-[var(--color-accent)]" strokeWidth={1.5} />
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">Extras para venta inmediata</p>
        </div>

        {prevVitrina.length > 0 && (
          <div className="px-4 py-3 bg-[var(--color-surface-warm)] border-b border-[var(--color-border-light)] space-y-1.5">
            <p className="text-xs font-semibold text-[var(--color-text-secondary)]">
              Vitrina de {formatDateLabel(prevDate).toLowerCase()} — posible sobrante en nevera
            </p>
            {prevVitrina.map(v => (
              <div key={v.productId} className="flex items-center justify-between gap-3">
                <p className="text-xs text-[var(--color-text-secondary)] truncate min-w-0 capitalize">
                  {v.flavor} · {SIZE_LABELS[v.size]}
                </p>
                <span className="text-xs text-[var(--color-text-muted)] tabular-nums flex-shrink-0">
                  {v.total}
                  {v.extras > 0 && v.available > 0 && ` (${v.available} disp. + ${v.extras} extra)`}
                </span>
              </div>
            ))}
            <p className="text-xs text-[var(--color-text-muted)] pt-1">
              Lo que no se haya vendido sigue en la nevera: cuéntalo y regístralo en "Terminado disponible" antes de agregar extras nuevos.
            </p>
          </div>
        )}

        {extras.length > 0 && (
          <div className="divide-y divide-[var(--color-border-light)]">
            {extras.map(extra => (
              <div key={extra.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <p className="text-sm text-[var(--color-text-primary)] truncate min-w-0">
                  {extra.product?.flavor} · {SIZE_LABELS[extra.product?.size ?? 'other']}
                </p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-medium text-[var(--color-accent)]">+{extra.quantity}</span>
                  <button
                    onClick={() => handleRemoveExtra(extra.id)}
                    disabled={removingExtra === extra.id}
                    className="p-1 rounded text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 transition-colors duration-150 disabled:opacity-40"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="px-4 py-3 flex items-center gap-2">
          <select
            value={extraProductId}
            onChange={e => setExtraProductId(e.target.value)}
            className="flex-1 min-w-0 text-sm border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 bg-white text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          >
            <option value="">Seleccionar producto...</option>
            {retailProductsByFlavor.map(([flavor, ps]) => (
              <optgroup key={flavor} label={flavor.charAt(0).toUpperCase() + flavor.slice(1)}>
                {ps.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <input
            type="number"
            min={1}
            max={99}
            value={extraQty}
            onChange={e => setExtraQty(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-14 text-sm text-center border border-[var(--color-border)] rounded-lg px-2 py-1.5 bg-white text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
          <button
            onClick={handleAddExtra}
            disabled={!extraProductId || savingExtra}
            className="flex items-center gap-1 text-sm font-medium text-white bg-[var(--color-accent)] px-3 py-1.5 rounded-lg hover:bg-[var(--color-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 flex-shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)] pt-4">Cargando...</p>
      ) : needs.length === 0 ? (
        <div className="bg-white rounded-lg border border-[var(--color-border)] py-12 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">Sin pedidos ni extras que requieran produccion</p>
        </div>
      ) : (
        <div className="space-y-5">
          {needsByCategory.map(group => (
            <div key={group.category} className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-2">
                {group.label}
                <span className="h-px flex-1 bg-[var(--color-border)]" />
              </p>
              {group.flavors.map(({ flavor, items }) => (
                <section key={flavor} className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-[var(--color-border)]">
                    <p className="text-sm font-bold capitalize text-[var(--color-text-primary)]">{flavor}</p>
                  </div>
                  <div className="divide-y divide-[var(--color-border-light)]">
                    {items.map(item => {
                      const isCovered = item.toMake === 0
                      const check = checksByProduct[item.productId]
                      return (
                        <div
                          key={item.productId}
                          className={`flex items-center justify-between gap-3 px-4 py-3 transition-colors duration-200 ${
                            isCovered ? 'opacity-60' : 'hover:bg-[var(--color-bg-hover)]'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                              {SIZE_LABELS[item.size]}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                              {item.fromOrders} pedido{item.fromOrders !== 1 ? 's' : ''}
                              {item.fromExtras > 0 && ` + ${item.fromExtras} extra`}
                              {` · ${item.available} disp.`}
                            </p>
                            {check && (
                              <p className="text-xs font-medium text-[var(--color-success-text)] mt-0.5 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Hecho por cocina · {new Date(check.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                          {isCovered ? (
                            <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-success-text)] flex-shrink-0">
                              <CheckCircle className="h-3.5 w-3.5" />
                              Cubierto
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-white bg-[var(--color-accent)] px-3 py-1.5 rounded-lg flex-shrink-0">
                              HACER {item.toMake}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          ))}

          {/* Resumen copiable para cocina */}
          <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">Resumen para cocina</p>
              <button
                onClick={handleCopySummary}
                className="flex items-center gap-1.5 text-sm font-medium text-white bg-[var(--color-accent)] px-3 py-1.5 rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors duration-200 min-h-[44px]"
              >
                <Copy className="h-3.5 w-3.5" />
                Copiar resumen
              </button>
            </div>
            <pre className="px-4 py-3 text-sm text-[var(--color-text-primary)] whitespace-pre-wrap font-sans">{summaryText}</pre>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

