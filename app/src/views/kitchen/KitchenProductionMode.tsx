import { useState, useMemo } from 'react'
import { useOrders } from '../../hooks/useOrders'
import { useInventory, useProductionToday, adjustInventory } from '../../hooks/useInventory'
import { useProducts } from '../../hooks/useProducts'
import { Toast } from '../../components/Toast'
import { today } from '../../lib/utils'
import { SIZE_LABELS, LOW_STOCK_THRESHOLD } from '../../lib/constants'
import { CheckCircle, TrendingUp, Plus, X, AlertTriangle } from 'lucide-react'
import type { Product, ProductSize } from '../../lib/types'

const RAPPI_CONFIRMED_KEY = 'rappi_off_confirmed'
const TWO_HOURS_MS = 2 * 60 * 60 * 1000

function shouldShowRappiModal(lowStockCount: number): boolean {
  if (lowStockCount === 0) return false
  const stored = localStorage.getItem(RAPPI_CONFIRMED_KEY)
  if (!stored) return true
  return Date.now() - Number(stored) > TWO_HOURS_MS
}

export function KitchenProductionMode() {
  const { orders } = useOrders(today())
  const { inventory, refetch: refetchInv } = useInventory()
  const { products } = useProducts()
  const { entries: producedToday } = useProductionToday()
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [producing, setProducing] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [rappiDismissed, setRappiDismissed] = useState(false)

  const lowStockItems = useMemo(
    () => inventory.filter(i => i.quantity <= LOW_STOCK_THRESHOLD),
    [inventory]
  )

  const showRappiModal = !rappiDismissed && shouldShowRappiModal(lowStockItems.length)

  function handleRappiConfirm() {
    localStorage.setItem(RAPPI_CONFIRMED_KEY, String(Date.now()))
    setRappiDismissed(true)
  }

  const productNeeds = useMemo(() => {
    const needs: Record<string, { productId: string; flavor: string; size: ProductSize; needed: number }> = {}
    for (const order of orders) {
      if (['cancelled', 'delivered', 'dispatched'].includes(order.status)) continue
      for (const item of order.items ?? []) {
        if (!item.product) continue
        const key = item.product_id
        if (!needs[key]) {
          needs[key] = { productId: item.product_id, flavor: item.product.flavor, size: item.product.size, needed: 0 }
        }
        needs[key].needed += item.quantity
      }
    }
    return Object.values(needs).sort((a, b) => a.flavor.localeCompare(b.flavor) || a.size.localeCompare(b.size))
  }, [orders])

  const inventoryMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of inventory) map[item.product_id] = item.quantity
    return map
  }, [inventory])

  const toProduceByFlavor = useMemo(() => {
    const g: Record<string, Array<{ productId: string; flavor: string; size: ProductSize; needed: number; stock: number; deficit: number }>> = {}
    for (const item of productNeeds) {
      const stock = inventoryMap[item.productId] ?? 0
      const deficit = Math.max(0, item.needed - stock)
      if (deficit === 0) continue
      g[item.flavor] = g[item.flavor] ?? []
      g[item.flavor].push({ ...item, stock, deficit })
    }
    return g
  }, [productNeeds, inventoryMap])

  const toProduceCount = useMemo(
    () => Object.values(toProduceByFlavor).reduce((s, items) => s + items.length, 0),
    [toProduceByFlavor]
  )

  async function handleProduce(productId: string, qty: number) {
    if (qty <= 0) return
    setProducing(productId)
    try {
      await adjustInventory(productId, qty, 'production')
      refetchInv()
      setToast({ msg: `+${qty} producidas`, type: 'success' })
    } catch {
      setToast({ msg: 'Error', type: 'error' })
    }
    setProducing(null)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm">{toProduceCount} producto{toProduceCount !== 1 ? 's' : ''} por producir</p>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#7C3AED] text-white rounded-lg text-sm font-medium hover:bg-[#6D28D9] transition-colors min-h-[44px]"
        >
          <Plus size={16} />
          Anadir a produccion
        </button>
      </div>

      {showAddForm && (
        <AddProductionForm
          products={products}
          onAdd={async (productId, qty) => {
            await handleProduce(productId, qty)
            setShowAddForm(false)
          }}
          onClose={() => setShowAddForm(false)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Por producir */}
        <div className="space-y-3">
          <p className="text-white text-base font-bold">Por producir</p>
          {toProduceCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-[#1F2937] rounded-xl border border-[#374151]">
              <CheckCircle size={48} className="text-green-500 mb-3" />
              <p className="text-white text-lg font-bold">Sin produccion pendiente</p>
              <p className="text-gray-400 text-sm mt-1">Todo el stock esta cubierto</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(toProduceByFlavor).map(([flavor, items]) => (
                <div key={flavor} className="bg-[#1F2937] rounded-xl overflow-hidden border border-[#374151]">
                  <div className="px-5 pt-4 pb-3 border-b border-[#374151]">
                    <p className="text-white text-xl font-bold capitalize">{flavor}</p>
                  </div>
                  <div className="divide-y divide-[#374151]">
                    {items.map(item => (
                      <div key={item.productId} className="flex items-center justify-between gap-4 px-5 py-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-300 text-base font-medium">{SIZE_LABELS[item.size]}</p>
                          <p className="text-gray-400 text-sm mt-0.5">
                            {item.needed} necesarias · {item.stock} en stock
                          </p>
                        </div>
                        <button
                          onClick={() => handleProduce(item.productId, item.deficit)}
                          disabled={producing === item.productId}
                          className="flex items-center gap-2 px-5 py-3 bg-green-600 text-white rounded-xl text-base font-bold hover:bg-green-700 disabled:opacity-50 transition-colors min-h-[48px] flex-shrink-0"
                        >
                          <TrendingUp size={18} />
                          +{item.deficit}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ya producido hoy */}
        <div className="space-y-3">
          <p className="text-white text-base font-bold">Ya producido hoy</p>
          {producedToday.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-[#1F2937] rounded-xl border border-[#374151]">
              <p className="text-gray-400 text-sm">Nada producido aun hoy</p>
            </div>
          ) : (
            <div className="bg-[#1F2937] rounded-xl overflow-hidden border border-[#374151]">
              <div className="divide-y divide-[#374151]">
                {producedToday.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-300 text-base font-medium truncate">
                        {entry.product?.name ?? entry.product_id}
                      </p>
                      <p className="text-gray-400 text-sm mt-0.5">
                        {new Date(entry.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className="text-green-400 text-lg font-bold flex-shrink-0">+{entry.change}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {showRappiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#1F2937] border border-[#374151] rounded-2xl p-6 max-w-sm w-full mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-orange-400 flex-shrink-0" />
              <h2 className="text-orange-400 text-xl font-bold">Stock bajo</h2>
            </div>
            <p className="text-gray-300 text-sm mb-4">Los siguientes productos tienen stock bajo:</p>
            <ul className="space-y-2 mb-6">
              {lowStockItems.map(item => (
                <li key={item.id} className="flex items-center justify-between gap-3">
                  <span className="text-gray-200 text-sm">{item.product?.name ?? item.product_id}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded tabular-nums ${
                    item.quantity === 0 ? 'bg-red-900 text-red-300' : 'bg-orange-900 text-orange-300'
                  }`}>
                    {item.quantity === 0 ? 'Sin stock' : `${item.quantity} uds`}
                  </span>
                </li>
              ))}
            </ul>
            <button
              onClick={handleRappiConfirm}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-xl font-bold text-lg transition-colors min-h-[48px]"
            >
              Ya apagué Rappi ✓
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AddProductionForm({ products, onAdd, onClose }: {
  products: Product[]
  onAdd: (productId: string, qty: number) => Promise<void>
  onClose: () => void
}) {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [qty, setQty] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const productList = useMemo(() => {
    return [...products].sort((a, b) => a.name.localeCompare(b.name))
  }, [products])

  async function handleSubmit() {
    if (!selectedProduct || qty <= 0) return
    setSubmitting(true)
    await onAdd(selectedProduct, qty)
    setSubmitting(false)
  }

  return (
    <div className="bg-[#1F2937] rounded-xl p-5 border border-[#374151]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white text-lg font-bold">Anadir a produccion</h3>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-white"><X size={18} /></button>
      </div>

      <div className="space-y-1 max-h-[300px] overflow-y-auto mb-4">
        {productList.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedProduct(p.id)}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
              selectedProduct === p.id
                ? 'bg-[#7C3AED] text-white'
                : 'bg-[#374151] text-gray-300 hover:bg-[#4B5563]'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {selectedProduct && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#374151] rounded-lg">
            <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-4 py-2.5 text-white text-lg font-bold min-h-[44px]">-</button>
            <span className="text-white text-xl font-bold w-12 text-center tabular-nums">{qty}</span>
            <button onClick={() => setQty(q => q + 1)} className="px-4 py-2.5 text-white text-lg font-bold min-h-[44px]">+</button>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 transition-colors min-h-[48px]"
          >
            {submitting ? 'Agregando...' : `Agregar +${qty}`}
          </button>
        </div>
      )}
    </div>
  )
}
