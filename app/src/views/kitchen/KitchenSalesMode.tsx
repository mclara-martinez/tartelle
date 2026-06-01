import { useState, useMemo } from 'react'
import { useProducts } from '../../hooks/useProducts'
import { createOrder } from '../../hooks/useOrders'
import { adjustInventory } from '../../hooks/useInventory'
import { Toast } from '../../components/Toast'
import { formatCOP, today } from '../../lib/utils'
import { SIZE_LABELS, CATEGORY_LABELS, PRODUCT_CATEGORY_ORDER } from '../../lib/constants'
import { ChevronLeft, Minus, Plus, Check } from 'lucide-react'
import type { Order, Product, ProductCategory } from '../../lib/types'

type Step = 1 | 2 | 3

export function KitchenSalesMode() {
  const { products } = useProducts()
  const [step, setStep] = useState<Step>(1)
  const [channel, setChannel] = useState<'rappi' | 'didi' | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const productsByCategory = useMemo(() => {
    const grouped: Record<string, Product[]> = {}
    for (const p of products) {
      const cat = p.category ?? 'otro'
      grouped[cat] ??= []
      grouped[cat].push(p)
    }
    for (const cat of Object.keys(grouped)) {
      grouped[cat].sort((a, b) => a.flavor.localeCompare(b.flavor) || a.size.localeCompare(b.size))
    }
    return grouped
  }, [products])

  function productLabel(p: Product): string {
    if (p.size === 'other') return p.flavor
    return `${p.flavor} · ${SIZE_LABELS[p.size]}`
  }

  function reset() {
    setStep(1)
    setChannel(null)
    setSelectedProduct(null)
    setQuantity(1)
  }

  function selectChannel(ch: 'rappi' | 'didi') {
    setChannel(ch)
    setStep(2)
  }

  function selectProduct(p: Product) {
    setSelectedProduct(p)
    setQuantity(1)
  }

  async function handleConfirm() {
    if (!selectedProduct || !channel) return
    setSubmitting(true)
    try {
      const subtotal = selectedProduct.base_price * quantity
      const newOrder = await createOrder(
        {
          customer_id: null,
          customer_name: channel === 'rappi' ? 'Rappi' : 'Didi',
          customer_phone: null,
          channel,
          status: 'dispatched',
          delivery_date: today(),
          delivery_type: 'pickup',
          delivery_address: null,
          subtotal,
          delivery_fee: 0,
          discount: 0,
          total: subtotal,
          notes: null,
          payment_status: 'paid',
          payment_method: 'rappi',
          payment_bank: null,
          card_type: null,
          payment_receipt_url: null,
          billing_name: null,
          billing_id_number: null,
          billing_email: null,
          packaging_notes: null,
          assigned_driver: null,
          picked_up_at: null,
          delivered_at: null,
          dispatch_photo_url: null,
          invoice_photo_url: null,
        } as Omit<Order, 'id' | 'created_at' | 'updated_at'>,
        [{ product_id: selectedProduct.id, quantity, unit_price: selectedProduct.base_price }]
      )
      await adjustInventory(selectedProduct.id, -quantity, 'sale', newOrder.id)
      setToast({ msg: 'Pedido registrado ✓', type: 'success' })
      reset()
    } catch {
      setToast({ msg: 'Error al registrar', type: 'error' })
    }
    setSubmitting(false)
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Step 1 — Canal */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">Selecciona el canal</p>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => selectChannel('rappi')}
              className="bg-[#FF441B] text-white rounded-2xl py-10 text-2xl font-bold hover:opacity-90 transition-opacity min-h-[120px]"
            >
              Rappi
            </button>
            <button
              onClick={() => selectChannel('didi')}
              className="bg-[#FF6600] text-white rounded-2xl py-10 text-2xl font-bold hover:opacity-90 transition-opacity min-h-[120px]"
            >
              Didi
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Producto */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep(1)}
              className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <p className="text-white font-bold text-lg capitalize">{channel}</p>
          </div>

          <p className="text-gray-400 text-sm">Selecciona producto</p>

          <div className="max-h-[340px] overflow-y-auto space-y-1">
            {PRODUCT_CATEGORY_ORDER.filter(cat => productsByCategory[cat]?.length).map(cat => (
              <div key={cat}>
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider px-1 pt-3 pb-1 first:pt-0">
                  {CATEGORY_LABELS[cat as ProductCategory] ?? cat}
                </p>
                {productsByCategory[cat].map(p => (
                  <button
                    key={p.id}
                    onClick={() => selectProduct(p)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors min-h-[52px] flex items-center justify-between ${
                      selectedProduct?.id === p.id
                        ? 'bg-[#D97706] text-white'
                        : 'bg-[#1F2937] text-gray-300 hover:bg-[#374151]'
                    }`}
                  >
                    <span className="capitalize">{productLabel(p)}</span>
                    <span className={selectedProduct?.id === p.id ? 'text-white' : 'text-gray-500'}>
                      {formatCOP(p.base_price)}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>

          {selectedProduct && (
            <div className="bg-[#1F2937] rounded-xl p-4 space-y-4 border border-[#374151]">
              <div className="flex items-center justify-between gap-4">
                <p className="text-white font-semibold capitalize">
                  {selectedProduct.flavor} — {SIZE_LABELS[selectedProduct.size]}
                </p>
                <div className="flex items-center gap-2 bg-[#374151] rounded-lg">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="px-4 py-2.5 text-white text-lg font-bold min-h-[44px]"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="text-white text-xl font-bold w-10 text-center tabular-nums">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => q + 1)}
                    className="px-4 py-2.5 text-white text-lg font-bold min-h-[44px]"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <button
                onClick={() => setStep(3)}
                className="w-full py-3 bg-[#D97706] text-white rounded-xl font-bold text-lg hover:bg-[#B45309] transition-colors min-h-[48px]"
              >
                Continuar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3 — Confirmar */}
      {step === 3 && selectedProduct && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep(2)}
              className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <p className="text-white font-bold text-lg">Confirmar pedido</p>
          </div>

          <div className="bg-[#1F2937] rounded-2xl p-5 border border-[#374151] space-y-4">
            <div className="flex items-center gap-2">
              <span
                className={`text-white text-sm font-bold px-3 py-1 rounded-full ${
                  channel === 'rappi' ? 'bg-[#FF441B]' : 'bg-[#FF6600]'
                }`}
              >
                {channel === 'rappi' ? 'Rappi' : 'Didi'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-xl font-bold capitalize">
                  {selectedProduct.flavor}
                </p>
                <p className="text-gray-400 text-sm">{SIZE_LABELS[selectedProduct.size]}</p>
              </div>
              <span className="text-white text-2xl font-bold tabular-nums">{quantity}</span>
            </div>

            <div className="border-t border-[#374151] pt-3 flex justify-between items-center">
              <span className="text-gray-400 text-sm">Total</span>
              <span className="text-white text-xl font-bold tabular-nums">
                {formatCOP(selectedProduct.base_price * quantity)}
              </span>
            </div>
          </div>

          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold text-xl hover:bg-green-700 disabled:opacity-50 transition-colors min-h-[64px] flex items-center justify-center gap-3"
          >
            <Check size={24} />
            {submitting ? 'Registrando...' : 'Confirmar'}
          </button>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
