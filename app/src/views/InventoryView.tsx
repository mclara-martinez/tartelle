import { useInventory, adjustInventory } from '../hooks/useInventory'
import { Toast } from '../components/Toast'
import { formatCOP } from '../lib/utils'
import { LOW_STOCK_THRESHOLD, SIZE_LABELS } from '../lib/constants'
import { AlertTriangle, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import type { ProductSize } from '../lib/types'

export function InventoryView() {
  const { inventory, loading, error, refetch } = useInventory()
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [adjusting, setAdjusting] = useState<string | null>(null)
  const [adjustQty, setAdjustQty] = useState<Record<string, number>>({})

  async function handleAdjust(productId: string, change: number) {
    setAdjusting(productId)
    try {
      await adjustInventory(productId, change, 'adjustment', undefined, 'Ajuste manual')
      refetch()
      setAdjustQty(prev => ({ ...prev, [productId]: 0 }))
      setToast({ msg: 'Inventario actualizado', type: 'success' })
    } catch {
      setToast({ msg: 'Error al actualizar inventario', type: 'error' })
    }
    setAdjusting(null)
  }

  async function handleProduction(productId: string, qty: number) {
    if (qty <= 0) return
    setAdjusting(productId)
    try {
      await adjustInventory(productId, qty, 'production')
      refetch()
      setAdjustQty(prev => ({ ...prev, [productId]: 0 }))
      setToast({ msg: `+${qty} unidades agregadas`, type: 'success' })
    } catch {
      setToast({ msg: 'Error al actualizar inventario', type: 'error' })
    }
    setAdjusting(null)
  }

  // Group by size
  const bySize = (inventory).reduce<Record<string, typeof inventory>>((acc, item) => {
    const size = item.product?.size ?? 'unknown'
    acc[size] = acc[size] ?? []
    acc[size].push(item)
    return acc
  }, {})

  const sizeOrder: ProductSize[] = ['grande', 'mediana', 'mini']
  const lowStock = inventory.filter(i => i.quantity <= LOW_STOCK_THRESHOLD)
  const totalValue = inventory.reduce((s, i) => s + (i.quantity * (i.product?.base_price ?? 0)), 0)

  if (loading) return <div className="text-[13px] text-[var(--color-text-secondary)] pt-8">Cargando inventario...</div>
  if (error) return <div className="text-[13px] text-[var(--color-danger)] bg-[var(--color-danger-light)] rounded-md px-3 py-2">{error}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-0.5">Inventario</p>
          <h1 className="text-lg font-semibold">Producto terminado</h1>
        </div>
        <button onClick={refetch} aria-label="Actualizar inventario" className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)] px-2.5 py-1.5 rounded-md min-h-[44px] transition-colors">
          <RefreshCw size={12} />
          Actualizar
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-[var(--color-border)] rounded-md p-3 shadow-[var(--shadow-card)]">
          <p className="text-[11px] text-[var(--color-text-muted)] mb-1">Total en nevera</p>
          <p className="text-lg font-semibold">{inventory.reduce((s, i) => s + i.quantity, 0)} uds</p>
        </div>
        <div className="bg-white border border-[var(--color-border)] rounded-md p-3 shadow-[var(--shadow-card)]">
          <p className="text-[11px] text-[var(--color-text-muted)] mb-1">Valor estimado</p>
          <p className="text-lg font-semibold">{formatCOP(totalValue)}</p>
        </div>
        <div className={`border rounded-md p-3 shadow-[var(--shadow-card)] ${lowStock.length > 0 ? 'bg-[var(--color-danger-light)] border-[var(--color-danger)]' : 'bg-[var(--color-success-light)] border-[var(--color-success)]'}`}>
          <p className="text-[11px] mb-1" style={{ color: lowStock.length > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>Stock bajo</p>
          <div className="flex items-center gap-1">
            {lowStock.length > 0 ? <AlertTriangle size={14} color="var(--color-danger)" /> : null}
            <p className="text-lg font-semibold" style={{ color: lowStock.length > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
              {lowStock.length === 0 ? 'Todo bien' : `${lowStock.length} producto${lowStock.length > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </div>

      {/* Products by size */}
      {sizeOrder.filter(s => bySize[s]?.length > 0).map(size => (
        <div key={size} className="bg-white border border-[var(--color-border)] rounded-md shadow-[var(--shadow-card)] overflow-hidden">
          <div className="px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
            <h2 className="text-[13px] font-medium text-[var(--color-text-primary)]">{SIZE_LABELS[size]}</h2>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {bySize[size].map(item => {
              const isLow = item.quantity <= LOW_STOCK_THRESHOLD
              const qty = adjustQty[item.product_id] ?? 0
              return (
                <div key={item.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-[var(--color-bg)] transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium">{item.product?.flavor}</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">{formatCOP(item.product?.base_price ?? 0)} / ud</p>
                  </div>

                  {/* Current stock */}
                  <div className={`text-center w-10 flex-shrink-0 ${isLow ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-primary)]'}`}>
                    <p className="text-base font-semibold leading-none">{item.quantity}</p>
                    <p className="text-[10px] opacity-60 mt-0.5">uds</p>
                  </div>

                  {/* Production input */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <input
                      type="number"
                      min={0}
                      value={qty || ''}
                      onChange={e => setAdjustQty(prev => ({ ...prev, [item.product_id]: Number(e.target.value) }))}
                      className="w-12 border border-[var(--color-border)] rounded px-2 py-1 text-[12px] text-center bg-[var(--color-bg)] focus:bg-white focus:outline-none focus:border-[var(--color-accent)]"
                      placeholder="0"
                    />
                    <button
                      onClick={() => handleProduction(item.product_id, qty)}
                      disabled={qty <= 0 || adjusting === item.product_id}
                      className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-success)] border border-[var(--color-success)] px-2 py-1 rounded hover:bg-[var(--color-success-light)] disabled:opacity-40 transition-colors"
                    >
                      <TrendingUp size={11} />
                      Prod.
                    </button>
                    <button
                      onClick={() => handleAdjust(item.product_id, -(qty))}
                      disabled={qty <= 0 || adjusting === item.product_id}
                      className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-danger)] border border-[var(--color-danger)] px-2 py-1 rounded hover:bg-[var(--color-danger-light)] disabled:opacity-40 transition-colors"
                    >
                      <TrendingDown size={11} />
                      Baja
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
