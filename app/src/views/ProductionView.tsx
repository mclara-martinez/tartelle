import { useState, useMemo } from 'react'
import { useOrders } from '../hooks/useOrders'
import { useInventory, adjustInventory } from '../hooks/useInventory'
import { useProducts } from '../hooks/useProducts'
import { useProductionExtras } from '../hooks/useProductionExtras'
import { Toast } from '../components/Toast'
import { formatDate, today, tomorrow } from '../lib/utils'
import { SIZE_LABELS } from '../lib/constants'
import { CheckCircle, TrendingUp, ClipboardList as PageIcon, Plus, X, ShoppingBag } from 'lucide-react'
import type { ProductSize } from '../lib/types'

type DateFilter = 'today' | 'tomorrow'

export function ProductionView() {
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [producing, setProducing] = useState<string | null>(null)

  const [extraProductId, setExtraProductId] = useState('')
  const [extraQty, setExtraQty] = useState(1)
  const [savingExtra, setSavingExtra] = useState(false)
  const [removingExtra, setRemovingExtra] = useState<string | null>(null)

  const targetDate = dateFilter === 'today' ? today() : tomorrow()
  const { orders, loading: loadingOrders } = useOrders(targetDate)
  const { inventory, loading: loadingInv, refetch: refetchInv } = useInventory()
  const { products } = useProducts()
  const { extras, upsertExtra, removeExtra } = useProductionExtras(targetDate)

  const extraProducts = useMemo(() =>
    products.filter(p => p.catalog === 'retail' || p.catalog === 'ambos'),
    [products]
  )

  const extraProductsByFlavor = useMemo(() => {
    const groups: Record<string, typeof extraProducts> = {}
    for (const p of extraProducts) {
      groups[p.flavor] = groups[p.flavor] ?? []
      groups[p.flavor].push(p)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [extraProducts])

  const extrasMap = useMemo(() => {
    const map: Record<string, { id: string; quantity: number }> = {}
    for (const e of extras) map[e.product_id] = { id: e.id, quantity: e.quantity }
    return map
  }, [extras])

  const productNeeds = useMemo(() => {
    const needs: Record<string, { productId: string; flavor: string; size: ProductSize; needed: number; fromOrders: number; price: number }> = {}

    for (const order of orders) {
      if (order.status === 'cancelled' || order.status === 'delivered') continue
      for (const item of order.items ?? []) {
        if (!item.product) continue
        const key = item.product_id
        if (!needs[key]) {
          needs[key] = { productId: item.product_id, flavor: item.product.flavor, size: item.product.size, needed: 0, fromOrders: 0, price: item.product.base_price }
        }
        needs[key].needed += item.quantity
        needs[key].fromOrders += item.quantity
      }
    }

    for (const extra of extras) {
      if (!extra.product) continue
      const key = extra.product_id
      if (needs[key]) {
        needs[key].needed += extra.quantity
      } else {
        needs[key] = {
          productId: extra.product_id,
          flavor: extra.product.flavor,
          size: extra.product.size,
          needed: extra.quantity,
          fromOrders: 0,
          price: extra.product.base_price,
        }
      }
    }

    return Object.values(needs).sort((a, b) => a.flavor.localeCompare(b.flavor) || a.size.localeCompare(b.size))
  }, [orders, extras])

  const inventoryMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of inventory) map[item.product_id] = item.quantity
    return map
  }, [inventory])

  const productNeedsByFlavor = useMemo(() => {
    const g: Record<string, typeof productNeeds> = {}
    for (const item of productNeeds) {
      g[item.flavor] = g[item.flavor] ?? []
      g[item.flavor].push(item)
    }
    return g
  }, [productNeeds])

  async function handleProduce(productId: string, qty: number) {
    if (qty <= 0) return
    setProducing(productId)
    try {
      await adjustInventory(productId, qty, 'production')
      refetchInv()
      setToast({ msg: `+${qty} unidades producidas`, type: 'success' })
    } catch {
      setToast({ msg: 'Error al actualizar', type: 'error' })
    }
    setProducing(null)
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

  const loading = loadingOrders || loadingInv
  const deficitCount = productNeeds.filter(p => Math.max(0, p.needed - (inventoryMap[p.productId] ?? 0)) > 0).length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <PageIcon className="h-6 w-6 text-[var(--color-text-secondary)]" strokeWidth={1.5} />
        <div>
          <h1 className="text-xl font-bold">Produccion</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Plan de produccion</p>
        </div>
      </div>

      {/* Date tabs */}
      <div className="flex items-center gap-3">
        <div className="flex bg-[var(--color-surface-warm)] p-0.5 rounded-lg">
          {(['today', 'tomorrow'] as DateFilter[]).map(d => (
            <button
              key={d}
              onClick={() => setDateFilter(d)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 ${
                dateFilter === d
                  ? 'bg-white text-[var(--color-text-primary)] shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {d === 'today' ? 'Hoy' : 'Manana'}
            </button>
          ))}
        </div>
        <span className="text-sm text-[var(--color-text-muted)]">{formatDate(targetDate)}</span>
      </div>

      {/* Extras del día */}
      <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-[var(--color-accent)]" strokeWidth={1.5} />
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">Extras para venta inmediata</p>
        </div>

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
            {extraProductsByFlavor.map(([flavor, ps]) => (
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
      ) : productNeeds.length === 0 ? (
        <div className="bg-white rounded-lg border border-[var(--color-border)] py-12 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">Sin pedidos ni extras que requieran produccion</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(productNeedsByFlavor).map(([flavor, items]) => (
            <section key={flavor} className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[var(--color-border)]">
                <p className="text-sm font-bold capitalize text-[var(--color-text-primary)]">{flavor}</p>
              </div>
              <div className="divide-y divide-[var(--color-border-light)]">
                {items.map(item => {
                  const stock = inventoryMap[item.productId] ?? 0
                  const deficit = Math.max(0, item.needed - stock)
                  const isCovered = deficit === 0
                  const extraQtyForItem = extrasMap[item.productId]?.quantity ?? 0
                  return (
                    <div
                      key={item.productId}
                      className={`flex items-center justify-between gap-3 px-4 py-3 transition-colors duration-200 ${
                        isCovered ? 'opacity-60' : 'hover:bg-[var(--color-bg-hover)]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                            {SIZE_LABELS[item.size]}
                          </p>
                          {extraQtyForItem > 0 && (
                            <span className="text-xs font-medium text-[var(--color-accent)] border border-[var(--color-accent)] px-1.5 py-0.5 rounded-full leading-none opacity-70">
                              +{extraQtyForItem} extra
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                          {isCovered
                            ? `${item.needed} requeridos · ${stock} en stock`
                            : item.fromOrders > 0 && extraQtyForItem > 0
                              ? `${item.fromOrders} pedidos + ${extraQtyForItem} extras · ${stock} en stock`
                              : `Necesitas ${item.needed} · Tienes ${stock}`}
                        </p>
                      </div>
                      {isCovered ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-success-text)] flex-shrink-0">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Cubierto
                        </span>
                      ) : (
                        <button
                          onClick={() => handleProduce(item.productId, deficit)}
                          disabled={producing === item.productId}
                          className="flex items-center gap-1.5 text-xs font-medium text-white bg-[var(--color-accent)] px-3 py-1.5 rounded-lg hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex-shrink-0"
                        >
                          <TrendingUp className="h-3 w-3" />
                          +{deficit}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}

          <p className="text-sm text-[var(--color-text-muted)] px-1">
            {productNeeds.length} producto{productNeeds.length !== 1 ? 's' : ''} requeridos
            {deficitCount > 0 && (
              <span className="text-[var(--color-warning-text)] font-medium"> · {deficitCount} por producir</span>
            )}
          </p>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
