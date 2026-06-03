import { useInventory, adjustInventory } from '../hooks/useInventory'
import { Toast } from '../components/Toast'
import { formatCOP } from '../lib/utils'
import { LOW_STOCK_THRESHOLD, SIZE_LABELS } from '../lib/constants'
import { AlertTriangle, RefreshCw, Package as PageIcon, Search, X } from 'lucide-react'
import { useState } from 'react'
import type { InventoryFinished, ProductSize } from '../lib/types'

const COLUMNS = [
  { key: 'mini', label: SIZE_LABELS['mini' as ProductSize] ?? 'Mini' },
  { key: 'mediana', label: SIZE_LABELS['mediana' as ProductSize] ?? 'Mediana' },
  { key: 'grande', label: SIZE_LABELS['grande' as ProductSize] ?? 'Grande' },
  { key: 'otro', label: 'Otro' },
] as const

function colOf(size: string): string {
  return size === 'mini' || size === 'mediana' || size === 'grande' ? size : 'otro'
}

function cellClasses(qty: number): string {
  if (qty === 0) return 'bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]'
  if (qty <= LOW_STOCK_THRESHOLD) return 'bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]'
  return 'bg-[var(--color-success-bg)] text-[var(--color-success-text)]'
}

export function InventoryView() {
  const { inventory, loading, error, refetch } = useInventory()
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [reasonValues, setReasonValues] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [editCell, setEditCell] = useState<{ flavor: string; items: InventoryFinished[] } | null>(null)

  function handleNumberChange(productId: string, value: string) {
    setInputValues(prev => ({ ...prev, [productId]: value }))
  }

  function handleCancel(productId: string) {
    setInputValues(prev => { const next = { ...prev }; delete next[productId]; return next })
    setReasonValues(prev => { const next = { ...prev }; delete next[productId]; return next })
  }

  async function handleSave(productId: string, currentQty: number) {
    const raw = inputValues[productId]
    const reason = reasonValues[productId]?.trim()
    if (raw === undefined || !reason) return
    const newQty = Number(raw)
    if (isNaN(newQty) || newQty === currentQty) {
      handleCancel(productId)
      return
    }
    const change = newQty - currentQty
    setSaving(productId)
    try {
      await adjustInventory(productId, change, change > 0 ? 'production' : 'adjustment', undefined, reason)
      refetch()
      setToast({ msg: 'Inventario actualizado', type: 'success' })
      handleCancel(productId)
      setEditCell(null)
    } catch {
      setToast({ msg: 'Error al actualizar inventario', type: 'error' })
    }
    setSaving(null)
  }

  const activeItems = inventory.filter(i => i.product?.active)
  const term = search.trim().toLowerCase()
  const searched = term
    ? activeItems.filter(i => (i.product?.name ?? '').toLowerCase().includes(term))
    : activeItems

  const grid: Record<string, Record<string, InventoryFinished[]>> = {}
  for (const item of searched) {
    const flavor = item.product?.flavor ?? '—'
    const col = colOf(item.product?.size ?? '')
    grid[flavor] = grid[flavor] ?? {}
    grid[flavor][col] = grid[flavor][col] ?? []
    grid[flavor][col].push(item)
  }
  const flavors = Object.keys(grid).sort((a, b) => a.localeCompare(b))

  const lowStock = activeItems.filter(i => i.quantity <= LOW_STOCK_THRESHOLD)
  const totalValue = activeItems.reduce((s, i) => s + (i.quantity * (i.product?.base_price ?? 0)), 0)
  const totalUnits = activeItems.reduce((s, i) => s + i.quantity, 0)

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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre..."
          className="w-full sm:max-w-xs border border-[var(--color-border)] rounded-lg pl-9 pr-3 py-2 text-sm bg-white focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/15"
        />
      </div>

      {/* Matrix */}
      {flavors.length === 0 ? (
        <div className="text-sm text-[var(--color-text-muted)] py-10 text-center">Sin productos que coincidan</div>
      ) : (
        <div className="bg-white border border-[var(--color-border)] rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left font-semibold px-4 py-2.5 text-[var(--color-text-secondary)]">Sabor</th>
                {COLUMNS.map(c => (
                  <th key={c.key} className="font-semibold px-2 py-2.5 text-center text-[var(--color-text-secondary)] capitalize">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flavors.map(flavor => (
                <tr key={flavor} className="border-t border-[var(--color-border-light)]">
                  <td className="px-4 py-2 font-medium capitalize">{flavor}</td>
                  {COLUMNS.map(c => {
                    const items = grid[flavor][c.key] ?? []
                    if (items.length === 0) {
                      return <td key={c.key} className="px-2 py-2 text-center text-[var(--color-text-muted)]">—</td>
                    }
                    const qty = items.reduce((s, i) => s + i.quantity, 0)
                    return (
                      <td key={c.key} className="px-2 py-2 text-center">
                        <button
                          onClick={() => setEditCell({ flavor, items })}
                          className={`min-w-[44px] min-h-[36px] px-3 py-1.5 rounded-lg font-bold tabular-nums hover:ring-2 hover:ring-[var(--color-accent)]/30 transition ${cellClasses(qty)}`}
                        >
                          {qty}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Adjust modal */}
      {editCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setEditCell(null)}>
          <div className="bg-white rounded-xl w-full max-w-md max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <h2 className="font-bold capitalize">{editCell.flavor}</h2>
              <button onClick={() => setEditCell(null)} className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"><X className="h-5 w-5" /></button>
            </div>
            <div className="overflow-y-auto px-5 py-4 space-y-4">
              {editCell.items.map(item => {
                const isSaving = saving === item.product_id
                const isPendingEdit = inputValues[item.product_id] !== undefined
                const displayValue = isPendingEdit ? inputValues[item.product_id] : String(item.quantity)
                const reason = reasonValues[item.product_id] ?? ''
                const canSave = reason.trim().length > 0 && !isNaN(Number(displayValue)) && Number(displayValue) !== item.quantity
                return (
                  <div key={item.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.product?.name}</p>
                        <p className="text-xs text-[var(--color-text-muted)] capitalize">{SIZE_LABELS[item.product?.size as ProductSize] ?? item.product?.size}</p>
                      </div>
                      <input
                        type="number"
                        min={0}
                        value={displayValue}
                        onChange={e => handleNumberChange(item.product_id, e.target.value)}
                        disabled={isSaving}
                        className="w-16 border border-[var(--color-border)] rounded-lg px-2 py-1.5 text-sm text-center bg-white focus:outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
                      />
                    </div>
                    {isPendingEdit && (
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          placeholder="Motivo del ajuste (requerido)"
                          value={reason}
                          onChange={e => setReasonValues(prev => ({ ...prev, [item.product_id]: e.target.value }))}
                          className="w-full border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-accent)]"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSave(item.product_id, item.quantity)}
                            disabled={!canSave || isSaving}
                            className="flex-1 py-1.5 rounded-lg text-sm font-medium bg-[var(--color-accent)] text-white hover:bg-[var(--color-teal-dark)] disabled:opacity-40 transition-colors"
                          >
                            {isSaving ? 'Guardando...' : 'Guardar'}
                          </button>
                          <button
                            onClick={() => handleCancel(item.product_id)}
                            className="px-4 py-1.5 rounded-lg text-sm font-medium border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
