import { useState, useMemo } from 'react'
import { useProducts } from '../../hooks/useProducts'
import { createOrder } from '../../hooks/useOrders'
import { adjustInventory, useInventory } from '../../hooks/useInventory'
import { Toast } from '../../components/Toast'
import { formatCOP, today } from '../../lib/utils'
import { SIZE_LABELS, CATEGORY_LABELS, PRODUCT_CATEGORY_ORDER, CHANNEL_LABELS, LOW_STOCK_THRESHOLD } from '../../lib/constants'
import { ChevronLeft, Minus, Plus, Check, AlertTriangle, Trash2 } from 'lucide-react'
import type { Order, Product, ProductCategory } from '../../lib/types'

type Step = 1 | 2 | 3
interface CartItem { product: Product; quantity: number }

export function KitchenSalesMode() {
  const { products } = useProducts()
  const { inventory, loading: inventoryLoading } = useInventory()
  const [step, setStep] = useState<Step>(1)
  const [channel, setChannel] = useState<'rappi' | 'didi' | 'walk_in' | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const cartTotal = cart.reduce((s, i) => s + i.product.base_price * i.quantity, 0)
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  const sortedInventory = useMemo(() => {
    return [...inventory].sort((a, b) => {
      const aLow = a.quantity <= LOW_STOCK_THRESHOLD ? 0 : 1
      const bLow = b.quantity <= LOW_STOCK_THRESHOLD ? 0 : 1
      if (aLow !== bLow) return aLow - bLow
      return (a.product?.flavor ?? '').localeCompare(b.product?.flavor ?? '')
    })
  }, [inventory])

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
    setCart([])
  }

  function selectChannel(ch: 'rappi' | 'didi' | 'walk_in') {
    setChannel(ch)
    setStep(2)
  }

  function addToCart(p: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === p.id)
      if (existing) return prev.map(i => i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product: p, quantity: 1 }]
    })
  }

  function updateQty(productId: string, delta: number) {
    setCart(prev => prev
      .map(i => i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i)
      .filter(i => i.quantity > 0)
    )
  }

  async function handleConfirm() {
    if (cart.length === 0 || !channel) return
    setSubmitting(true)
    try {
      const newOrder = await createOrder(
        {
          customer_id: null,
          customer_name: channel === 'walk_in' ? 'Venta local' : channel === 'rappi' ? 'Rappi' : 'Didi',
          customer_phone: null,
          channel,
          status: 'delivered',
          delivery_date: today(),
          delivery_type: 'pickup',
          delivery_address: null,
          subtotal: cartTotal,
          delivery_fee: 0,
          discount: 0,
          total: cartTotal,
          notes: null,
          payment_status: 'paid',
          payment_method: channel === 'walk_in' ? 'cash' : 'rappi',
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
        cart.map(i => ({ product_id: i.product.id, quantity: i.quantity, unit_price: i.product.base_price }))
      )
      for (const i of cart) {
        await adjustInventory(i.product.id, -i.quantity, 'sale', newOrder.id)
      }
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
          <p className="text-[var(--color-text-secondary)] text-sm">Selecciona el canal</p>
          <div className="grid grid-cols-3 gap-4">
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
            <button
              onClick={() => selectChannel('walk_in')}
              className="bg-[var(--color-accent)] text-white rounded-2xl py-10 text-2xl font-bold hover:opacity-90 transition-opacity min-h-[120px]"
            >
              Presencial
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
              className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <p className="text-[var(--color-text-primary)] font-bold text-lg">{channel ? CHANNEL_LABELS[channel] : ''}</p>
          </div>

          <p className="text-[var(--color-text-secondary)] text-sm">Selecciona producto</p>

          <div className="max-h-[340px] overflow-y-auto space-y-1">
            {PRODUCT_CATEGORY_ORDER.filter(cat => productsByCategory[cat]?.length).map(cat => (
              <div key={cat}>
                <p className="text-[var(--color-text-muted)] text-xs font-semibold uppercase tracking-wider px-1 pt-3 pb-1 first:pt-0">
                  {CATEGORY_LABELS[cat as ProductCategory] ?? cat}
                </p>
                {productsByCategory[cat].map(p => {
                  const inCart = cart.find(i => i.product.id === p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors min-h-[52px] flex items-center justify-between gap-2 ${
                        inCart
                          ? 'bg-[var(--color-status-pending)] text-white'
                          : 'bg-white border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
                      }`}
                    >
                      <span className="capitalize flex items-center gap-2">
                        {inCart && (
                          <span className="bg-white/25 text-white rounded-full min-w-5 h-5 px-1.5 text-xs font-bold flex items-center justify-center tabular-nums">
                            {inCart.quantity}
                          </span>
                        )}
                        {productLabel(p)}
                      </span>
                      <span className={inCart ? 'text-white' : 'text-[var(--color-text-muted)]'}>
                        {formatCOP(p.base_price)}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {cart.length > 0 && (
            <div className="bg-white rounded-xl p-4 space-y-3 border border-[var(--color-border)]">
              {cart.map(item => (
                <div key={item.product.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[var(--color-text-primary)] font-semibold capitalize truncate">
                      {item.product.flavor} — {SIZE_LABELS[item.product.size]}
                    </p>
                    <p className="text-[var(--color-text-muted)] text-xs tabular-nums">
                      {formatCOP(item.product.base_price * item.quantity)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-[var(--color-surface-warm)] rounded-lg flex-shrink-0">
                    <button
                      onClick={() => updateQty(item.product.id, -1)}
                      className="px-3 py-2.5 text-[var(--color-text-primary)] min-h-[44px]"
                      aria-label={item.quantity === 1 ? 'Quitar producto' : 'Restar'}
                    >
                      {item.quantity === 1 ? <Trash2 size={16} className="text-[var(--color-danger-text)]" /> : <Minus size={16} />}
                    </button>
                    <span className="text-[var(--color-text-primary)] text-lg font-bold w-7 text-center tabular-nums">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.product.id, 1)}
                      className="px-3 py-2.5 text-[var(--color-text-primary)] min-h-[44px]"
                      aria-label="Sumar"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setStep(3)}
                className="w-full py-3 bg-[var(--color-status-pending)] text-white rounded-xl font-bold text-lg hover:opacity-90 transition-opacity min-h-[48px]"
              >
                Continuar · {formatCOP(cartTotal)}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3 — Confirmar */}
      {step === 3 && cart.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep(2)}
              className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <p className="text-[var(--color-text-primary)] font-bold text-lg">Confirmar pedido</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)] space-y-4">
            <div className="flex items-center gap-2">
              <span
                className={`text-white text-sm font-bold px-3 py-1 rounded-full ${
                  channel === 'rappi' ? 'bg-[#FF441B]' : channel === 'didi' ? 'bg-[#FF6600]' : 'bg-[var(--color-accent)]'
                }`}
              >
                {channel ? CHANNEL_LABELS[channel] : ''}
              </span>
              <span className="text-[var(--color-text-muted)] text-sm">{cartCount} ítem{cartCount !== 1 ? 's' : ''}</span>
            </div>

            <div className="space-y-2.5">
              {cart.map(item => (
                <div key={item.product.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[var(--color-text-primary)] text-base font-bold capitalize truncate">{item.product.flavor}</p>
                    <p className="text-[var(--color-text-muted)] text-sm">{SIZE_LABELS[item.product.size]}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-[var(--color-text-primary)] text-lg font-bold tabular-nums">×{item.quantity}</span>
                    <span className="text-[var(--color-text-secondary)] text-sm tabular-nums w-24 text-right">
                      {formatCOP(item.product.base_price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[var(--color-border)] pt-3 flex justify-between items-center">
              <span className="text-[var(--color-text-muted)] text-sm">Total</span>
              <span className="text-[var(--color-text-primary)] text-xl font-bold tabular-nums">
                {formatCOP(cartTotal)}
              </span>
            </div>
          </div>

          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="w-full py-4 bg-[var(--color-accent)] text-white rounded-2xl font-bold text-xl hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors min-h-[64px] flex items-center justify-center gap-3"
          >
            <Check size={24} />
            {submitting ? 'Registrando...' : 'Confirmar'}
          </button>
        </div>
      )}

      {/* Inventario PT en tiempo real */}
      <div className="mt-6 space-y-2">
        <p className="text-[var(--color-text-secondary)] text-sm font-medium">Stock actual</p>
        <div className="bg-white rounded-xl overflow-hidden border border-[var(--color-border)]">
          {inventoryLoading ? (
            <p className="text-[var(--color-text-muted)] text-sm px-4 py-3">Cargando...</p>
          ) : (
            <div className="divide-y divide-[var(--color-border-light)]">
              {sortedInventory.map(item => {
                const isLow  = item.quantity <= LOW_STOCK_THRESHOLD
                const isZero = item.quantity === 0
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between px-4 py-2.5 ${isLow ? 'bg-[var(--color-danger-bg)]' : ''}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isLow && <AlertTriangle size={13} className="text-[var(--color-danger-text)] flex-shrink-0" />}
                      <span className={`text-sm truncate capitalize ${isLow ? 'text-[var(--color-danger-text)]' : 'text-[var(--color-text-secondary)]'}`}>
                        {item.product?.flavor}
                        {item.product ? ` · ${SIZE_LABELS[item.product.size]}` : ''}
                      </span>
                    </div>
                    <span className={`text-sm font-bold tabular-nums flex-shrink-0 ml-3 ${
                      isZero ? 'text-[var(--color-danger-text)]' : isLow ? 'text-[var(--color-warning-text)]' : 'text-[var(--color-text-muted)]'
                    }`}>
                      {isZero ? 'Sin stock' : `${item.quantity} uds`}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
