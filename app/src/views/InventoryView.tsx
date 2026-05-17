import { useInventory, adjustInventory } from '../hooks/useInventory'
import { Toast } from '../components/Toast'
import { formatCOP } from '../lib/utils'
import { LOW_STOCK_THRESHOLD, SIZE_LABELS } from '../lib/constants'
import { AlertTriangle, RefreshCw, Package as PageIcon } from 'lucide-react'
import { useState } from 'react'
import type { ProductSize } from '../lib/types'

export function InventoryView() {
  const { inventory, loading, error, refetch } = useInventory()
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [inputValues, setInputValues] = useState<Record<string, string>>({})

  async function handleBlur(productId: string, currentQty: number) {
    const raw = inputValues[productId]
    if (raw === undefined) return
    const newQty = Number(raw)
    if (isNaN(newQty) || newQty === currentQty) {
      setInputValues(prev => { const next = { ...prev }; delete next[productId]; return next })
      return
    }
    const change = newQty - currentQty
    setSaving(productId)
    try {
      await adjustInventory(productId, change, change > 0 ? 'production' : 'adjustment', undefined, 'Ajuste manual')
      refetch()
      setToast({ msg: 'Inventario actualizado', type: 'success' })
    } catch {
      setInputValues(prev => ({ ...prev, [productId]: String(currentQty) }))
      setToast({ msg: 'Error al actualizar inventario', type: 'error' })
    }
    setSaving(null)
    setInputValues(prev => { const next = { ...prev }; delete next[productId]; return next })
  }

  const bySize = inventory.reduce<Record<string, typeof inventory>>((acc, item) => {
    const size = item.product?.size ?? 'unknown'
    acc[size] = acc[size] ?? []
    acc[size].push(item)
    return acc
  }, {})

  const sizeOrder: ProductSize[] = ['grande', 'mediana', 'mini']
  const lowStock = inventory.filter(i => i.quantity <= LOW_STOCK_THRESHOLD)
  const totalValue = inventory.reduce((s, i) => s + (i.quantity * (i.product?.base_price ?? 0)), 0)
  const totalUnits = inventory.reduce((s, i) => s + i.quantity, 0)

  if (loading) return <div className="text-sm text-[var(--color-text-muted)] pt-10">Cargando inventario...</div>
  if (error) return <div className="text-sm text-[var(--color-danger-text)] bg-[var(--color-danger-bg)] rounded-lg p-3">{error}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PageIcon className="h-6 w-6 text-[var(--color-text-secondary)]" strokeWidth={1.5} />
          <div>
            <h1 className="text-xl font-bold">Inventario</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Producto terminado</p>
          </div>
        </div>
        <button
          onClick={refetch}
          aria-label="Actualizar inventario"
          className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)] px-3 py-2 rounded-lg transition-colors duration-200"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Actualizar
        </button>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-[var(--color-border)] rounded-lg p-4">
          <p className="text-sm text-[var(--color-text-muted)] mb-1">Total en nevera</p>
          <p className="text-xl font-bold tabular-nums">{totalUnits} uds</p>
        </div>
        <div className="bg-white border border-[var(--color-border)] rounded-lg p-4">
          <p className="text-sm text-[var(--color-text-muted)] mb-1">Valor estimado</p>
          <p className="text-xl font-bold tabular-nums">{formatCOP(totalValue)}</p>
        </div>
        <div className={`border rounded-lg p-4 ${
          lowStock.length > 0
            ? 'bg-[var(--color-warning-bg)] border-[var(--color-warning-bg)]'
            : 'bg-[var(--color-success-bg)] border-[var(--color-success-bg)]'
        }`}>
          <p className={`text-sm mb-1 ${lowStock.length > 0 ? 'text-[var(--color-warning-text)]' : 'text-[var(--color-success-text)]'}`}>Stock bajo</p>
          <div className="flex items-center gap-1.5">
            {lowStock.length > 0 && <AlertTriangle className="h-4 w-4 text-[var(--color-warning-text)]" />}
            <p className={`text-xl font-bold ${lowStock.length > 0 ? 'text-[var(--color-warning-text)]' : 'text-[var(--color-success-text)]'}`}>
              {lowStock.length === 0 ? 'Todo bien' : `${lowStock.length} producto${lowStock.length > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </div>

      {/* Products by size */}
      {sizeOrder.filter(s => bySize[s]?.length > 0).map(size => (
        <section key={size} className="bg-white border border-[var(--color-border)] rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{SIZE_LABELS[size]}</h2>
          </div>
          {bySize[size].map((item, i) => {
            const isLow = item.quantity <= LOW_STOCK_THRESHOLD
            const isSaving = saving === item.product_id
            const displayValue = inputValues[item.product_id] !== undefined
              ? inputValues[item.product_id]
              : String(item.quantity)
            return (
              <div key={item.id} className={`px-4 py-2.5 flex items-center gap-4 hover:bg-[var(--color-bg-hover)] transition-colors duration-200 ${
                i > 0 ? 'border-t border-[var(--color-border-light)]' : ''
              }`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium capitalize">{item.product?.flavor}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{formatCOP(item.product?.base_price ?? 0)} / ud</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <input
                    type="number"
                    min={0}
                    value={displayValue}
                    onChange={e => setInputValues(prev => ({ ...prev, [item.product_id]: e.target.value }))}
                    onBlur={() => handleBlur(item.product_id, item.quantity)}
                    disabled={isSaving}
                    className={`w-16 border rounded-lg px-2 py-1.5 text-sm text-center bg-white focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/15 transition-colors duration-200 ${
                      isLow ? 'border-[var(--color-warning-text)] text-[var(--color-warning-text)]' : 'border-[var(--color-border)] text-[var(--color-text-primary)]'
                    } disabled:opacity-50`}
                  />
                  {isSaving && (
                    <span className="text-[11px] text-[var(--color-text-muted)]">guardando...</span>
                  )}
                </div>
              </div>
            )
          })}
        </section>
      ))}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
