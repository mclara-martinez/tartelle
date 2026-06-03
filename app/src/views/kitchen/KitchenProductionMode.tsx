import { useState, useMemo, useRef } from 'react'
import { useOrders } from '../../hooks/useOrders'
import { useInventory, useProductionToday, adjustInventory } from '../../hooks/useInventory'
import { useProducts } from '../../hooks/useProducts'
import { Toast } from '../../components/Toast'
import { insertQualityLog } from '../../hooks/useQualityLog'
import { insertComponentLog, useComponentLogs } from '../../hooks/useComponentLog'
import { uploadQualityPhoto } from '../../lib/storage'
import { today } from '../../lib/utils'
import { LOW_STOCK_THRESHOLD } from '../../lib/constants'
import { CheckCircle, TrendingUp, Plus, X, AlertTriangle, Camera } from 'lucide-react'
import type { Product, ProductSize } from '../../lib/types'

const QUALITY_ITEMS = ['Textura', 'Color', 'Presentación', 'Sin defectos visibles']
type PendingProduce = { productId: string; qty: number } | null

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
  const { logs: componentLogs, refetch: refetchComponents } = useComponentLogs(today())
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [producing, setProducing] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showComponentModal, setShowComponentModal] = useState(false)
  const [pendingProduce, setPendingProduce] = useState<PendingProduce>(null)
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
    const needs: Record<string, { productId: string; flavor: string; size: ProductSize; name: string; needed: number }> = {}
    for (const order of orders) {
      if (['cancelled', 'delivered', 'dispatched'].includes(order.status)) continue
      for (const item of order.items ?? []) {
        if (!item.product) continue
        const key = item.product_id
        if (!needs[key]) {
          needs[key] = { productId: item.product_id, flavor: item.product.flavor, size: item.product.size, name: item.product.name, needed: 0 }
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
    const g: Record<string, Array<{ productId: string; flavor: string; size: ProductSize; name: string; needed: number; stock: number; deficit: number }>> = {}
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
          onAdd={(productId, qty) => {
            setShowAddForm(false)
            setPendingProduce({ productId, qty })
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
                          <p className="text-gray-300 text-base font-medium">{item.name}</p>
                          <p className="text-gray-400 text-sm mt-0.5">
                            {item.needed} necesarias · {item.stock} en stock
                          </p>
                        </div>
                        <button
                          onClick={() => setPendingProduce({ productId: item.productId, qty: item.deficit })}
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

      {/* Componentes producidos hoy */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-white text-base font-bold">Componentes producidos hoy</p>
          <button
            onClick={() => setShowComponentModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0D9488] text-white rounded-lg text-sm font-medium hover:bg-[#0F766E] transition-colors min-h-[44px]"
          >
            <Plus size={16} />
            Añadir componente
          </button>
        </div>
        {componentLogs.length === 0 ? (
          <div className="flex items-center justify-center py-8 bg-[#1F2937] rounded-xl border border-[#374151]">
            <p className="text-gray-400 text-sm">Ningún componente registrado hoy</p>
          </div>
        ) : (
          <div className="bg-[#1F2937] rounded-xl overflow-hidden border border-[#374151]">
            <div className="divide-y divide-[#374151]">
              {componentLogs.map(entry => (
                <div key={entry.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-300 text-base font-medium truncate">{entry.nombre}</p>
                    <p className="text-gray-400 text-sm mt-0.5">{entry.cantidad_descripcion}</p>
                  </div>
                  <span className="text-gray-500 text-sm flex-shrink-0 tabular-nums">
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

      {pendingProduce && (
        <QualityCheckModal
          productId={pendingProduce.productId}
          qty={pendingProduce.qty}
          onConfirm={async () => {
            const { productId, qty } = pendingProduce
            setPendingProduce(null)
            await handleProduce(productId, qty)
          }}
          onClose={() => setPendingProduce(null)}
          onError={msg => setToast({ msg, type: 'error' })}
        />
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {showRappiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#1F2937] border border-[#374151] rounded-2xl w-full max-w-md mx-auto max-h-[80vh] flex flex-col">
            <div className="px-6 pt-6 pb-4 flex-shrink-0">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="h-6 w-6 text-orange-400 flex-shrink-0" />
                <h2 className="text-orange-400 text-xl font-bold">Stock bajo</h2>
              </div>
              <p className="text-gray-300 text-sm">Los siguientes productos tienen stock bajo:</p>
            </div>
            <ul className="flex-1 overflow-y-auto min-h-0 px-6 space-y-2">
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
            <div className="px-6 py-5 flex-shrink-0 border-t border-[#374151]">
              <button
                onClick={handleRappiConfirm}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-xl font-bold text-lg transition-colors min-h-[48px]"
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

function AddProductionForm({ products, onAdd, onClose }: {
  products: Product[]
  onAdd: (productId: string, qty: number) => void
  onClose: () => void
}) {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [qty, setQty] = useState(1)

  const productList = useMemo(() => {
    return [...products].sort((a, b) => a.name.localeCompare(b.name))
  }, [products])

  function handleSubmit() {
    if (!selectedProduct || qty <= 0) return
    onAdd(selectedProduct, qty)
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
            className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors min-h-[48px]"
          >
            {`Agregar +${qty}`}
          </button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-[#1F2937] border border-[#374151] rounded-2xl w-full max-w-md mx-auto">
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-[#374151]">
          <h2 className="text-white text-xl font-bold">Añadir componente</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-gray-400 text-sm">Nombre del componente</label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="ej. Crema pastelera, Bizcocho de vainilla"
              className="w-full bg-[#374151] border border-[#4B5563] rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#6B7280]"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-gray-400 text-sm">Cantidad</label>
            <input
              type="text"
              value={cantidad}
              onChange={e => setCantidad(e.target.value)}
              placeholder="ej. 2 litros, 500 g, 3 bandejas"
              className="w-full bg-[#374151] border border-[#4B5563] rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#6B7280]"
            />
          </div>
        </div>

        <div className="px-6 py-5 border-t border-[#374151] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-[#4B5563] text-gray-300 rounded-xl font-medium hover:bg-[#374151] transition-colors min-h-[48px]"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || submitting}
            className="flex-1 py-3 bg-[#0D9488] text-white rounded-xl font-bold hover:bg-[#0F766E] disabled:opacity-40 transition-colors min-h-[48px]"
          >
            {submitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function QualityCheckModal({
  productId,
  qty,
  onConfirm,
  onClose,
  onError,
}: {
  productId: string
  qty: number
  onConfirm: () => Promise<void>
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
        order_id: null,
        photo_path: photoPath,
      })
    } catch {
      onError('No se pudo guardar el log de calidad')
    }
    onConfirm()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-[#1F2937] border border-[#374151] rounded-2xl w-full max-w-md mx-auto max-h-[90vh] flex flex-col">
        <div className="px-6 pt-6 pb-4 flex-shrink-0 flex items-center justify-between border-b border-[#374151]">
          <div>
            <h2 className="text-white text-xl font-bold">Control de calidad</h2>
            <p className="text-gray-400 text-sm mt-0.5">Lote de +{qty} unidades</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
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
                    ? 'bg-green-900/30 border-green-600/40'
                    : 'bg-red-900/30 border-red-600/40'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  isOk ? 'border-green-400 bg-green-600' : 'border-red-400'
                }`}>
                  {isOk && <CheckCircle size={12} className="text-white" />}
                </div>
                <span className={`text-base font-medium ${isOk ? 'text-green-300' : 'text-red-300'}`}>
                  {item}
                </span>
              </button>
            )
          })}

          {needsObservacion && (
            <div className="space-y-1.5 pt-1">
              <p className="text-red-400 text-sm font-medium flex items-center gap-1.5">
                <AlertTriangle size={14} />
                Falló: {failedItems.join(', ')} — descripción requerida
              </p>
              <textarea
                value={observacion}
                onChange={e => setObservacion(e.target.value)}
                placeholder="Describe el problema observado..."
                rows={3}
                className="w-full bg-[#374151] border border-[#4B5563] rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm resize-none focus:outline-none focus:border-[#6B7280]"
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
                className="flex items-center gap-2 px-4 py-2.5 bg-[#374151] text-gray-300 rounded-xl text-sm hover:bg-[#4B5563] transition-colors min-h-[44px]"
              >
                <Camera size={16} />
                Foto del lote (opcional)
              </button>
            )}
          </div>
        </div>

        <div className="px-6 py-5 flex-shrink-0 border-t border-[#374151] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-[#4B5563] text-gray-300 rounded-xl font-medium hover:bg-[#374151] transition-colors min-h-[48px]"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || submitting}
            className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-40 transition-colors min-h-[48px]"
          >
            {submitting ? 'Guardando...' : 'Confirmar ✓'}
          </button>
        </div>
      </div>
    </div>
  )
}
