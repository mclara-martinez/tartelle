import { useState, useMemo } from 'react'
import { useProducts } from '../hooks/useProducts'
import { useCustomerSearch, useRecentCustomers, createCustomer } from '../hooks/useCustomers'
import { createOrder } from '../hooks/useOrders'
import { Toast } from '../components/Toast'
import { formatCOP, today, tomorrow } from '../lib/utils'
import { DELIVERY_FEE, CHANNEL_LABELS, SIZE_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_BANK_LABELS, CARD_TYPE_LABELS } from '../lib/constants'
import { PhotoUpload } from '../components/PhotoUpload'
import type { Order, OrderChannel, DeliveryType, Product, PaymentMethod, PaymentBank, CardType } from '../lib/types'
import { X, Plus, Minus, Search, Bike, Store, ArrowLeft, ShoppingBag, User, Trash2, Package } from 'lucide-react'

interface CartItem {
  product: Product
  quantity: number
}

interface Props {
  onClose: () => void
}

export function OrderCreateView({ onClose }: Props) {
  const { products, loading: loadingProducts } = useProducts()
  const { results: customerResults, search: searchCustomers } = useCustomerSearch()
  const recentCustomers = useRecentCustomers(5)

  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [customerDiscount, setCustomerDiscount] = useState(0)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  const [channel, setChannel] = useState<OrderChannel>('walk_in')
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('pickup')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryDate, setDeliveryDate] = useState<'today' | 'tomorrow'>('today')
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [paymentBank, setPaymentBank] = useState<PaymentBank | null>(null)
  const [cardType, setCardType] = useState<CardType | null>(null)
  const [paymentReceiptUrl, setPaymentReceiptUrl] = useState<string | null>(null)
  const [packagingNotes, setPackagingNotes] = useState('')
  const [tempOrderId] = useState(() => crypto.randomUUID())
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Group retail+ambos products by flavor
  const productsByFlavor = useMemo(() => {
    const grouped: Record<string, Product[]> = {}
    for (const p of products) {
      if (p.catalog === 'eventos') continue
      grouped[p.flavor] = grouped[p.flavor] ?? []
      grouped[p.flavor].push(p)
    }
    return grouped
  }, [products])

  const subtotal = cart.reduce((sum, item) => sum + item.product.base_price * item.quantity, 0)
  const deliveryFee = deliveryType === 'delivery' ? DELIVERY_FEE : 0
  const discount = Math.round(subtotal * customerDiscount / 100)
  const total = subtotal + deliveryFee - discount

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  function updateQuantity(productId: string, delta: number) {
    setCart(prev => prev
      .map(i => i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i)
      .filter(i => i.quantity > 0)
    )
  }

  function selectCustomer(c: { id: string; name: string; phone: string | null; discount_pct: number }) {
    setCustomerId(c.id)
    setCustomerName(c.name)
    setCustomerPhone(c.phone ?? '')
    setCustomerDiscount(c.discount_pct)
    setShowCustomerSearch(false)
    setCustomerSearch('')
  }

  async function handleSubmit() {
    if (cart.length === 0) return
    setSubmitting(true)
    try {
      // Create customer if new
      let cId = customerId
      if (!cId && customerName.trim()) {
        const newCustomer = await createCustomer({
          name: customerName.trim(),
          phone: customerPhone.trim() || null,
        })
        cId = newCustomer?.id ?? null
      }

      await createOrder(
        {
          customer_id: cId,
          customer_name: customerName.trim() || 'Cliente',
          customer_phone: customerPhone.trim() || null,
          channel,
          status: 'pending',
          delivery_date: deliveryDate === 'today' ? today() : tomorrow(),
          delivery_type: deliveryType,
          delivery_address: deliveryType === 'delivery' ? deliveryAddress.trim() || null : null,
          subtotal,
          delivery_fee: deliveryFee,
          discount,
          total,
          notes: notes.trim() || null,
          payment_status: paymentReceiptUrl ? 'paid' : 'pending',
          payment_method: paymentMethod,
          payment_bank: paymentMethod === 'transfer' ? paymentBank : null,
          card_type: paymentMethod === 'card' ? cardType : null,
          payment_receipt_url: paymentReceiptUrl,
          packaging_notes: packagingNotes.trim() || null,
        } as Omit<Order, 'id' | 'created_at' | 'updated_at'>,
        cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.base_price,
        }))
      )

      setToast({ msg: 'Pedido creado', type: 'success' })
      setTimeout(onClose, 800)
    } catch {
      setToast({ msg: 'Error al crear pedido', type: 'error' })
    }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-[var(--color-border)] px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-[var(--color-bg)] rounded-lg transition-colors" aria-label="Volver">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-base font-semibold">Nuevo pedido</h1>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-[var(--color-bg)] rounded-lg text-[var(--color-text-muted)]">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Product grid */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-5">
          {loadingProducts ? (
            <p className="text-sm text-[var(--color-text-secondary)]">Cargando productos...</p>
          ) : (
            <div className="space-y-5">
              {Object.entries(productsByFlavor).map(([flavor, prods]) => (
                <div key={flavor}>
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2 capitalize">{flavor}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {prods.map(product => {
                      const inCart = cart.find(i => i.product.id === product.id)
                      return (
                        <button
                          key={product.id}
                          onClick={() => addToCart(product)}
                          className={`pos-product-card relative bg-white rounded-lg border p-3 text-left transition-all ${
                            inCart
                              ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/20'
                              : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
                          }`}
                        >
                          <p className="text-sm font-medium capitalize">{flavor}</p>
                          <p className="text-xs text-[var(--color-text-muted)] truncate">
                            {product.size === 'other' ? product.name.toLowerCase() : SIZE_LABELS[product.size]}
                          </p>
                          <p className="text-sm font-semibold mt-1">{formatCOP(product.base_price)}</p>
                          {inCart && (
                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[var(--color-accent)] text-white rounded-full text-[11px] font-bold flex items-center justify-center">
                              {inCart.quantity}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Cart + details */}
        <div className="w-full lg:w-[380px] bg-white border-t lg:border-t-0 lg:border-l border-[var(--color-border)] flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Customer */}
            <div>
              <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider block mb-1.5">Cliente</label>
              {showCustomerSearch ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Buscar por nombre o telefono..."
                      value={customerSearch}
                      onChange={e => { setCustomerSearch(e.target.value); searchCustomers(e.target.value) }}
                      className="w-full pl-8 pr-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--color-accent)]"
                    />
                  </div>
                  {customerResults.length > 0 && (
                    <div className="border border-[var(--color-border)] rounded-lg divide-y divide-[var(--color-border)] max-h-[150px] overflow-y-auto">
                      {customerResults.map(c => (
                        <button key={c.id} onClick={() => selectCustomer(c)} className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-bg)] transition-colors">
                          <p className="font-medium">{c.name}</p>
                          {c.phone && <p className="text-xs text-[var(--color-text-muted)]">{c.phone}</p>}
                        </button>
                      ))}
                    </div>
                  )}
                  {recentCustomers.length > 0 && !customerSearch && (
                    <div>
                      <p className="text-[11px] text-[var(--color-text-muted)] mb-1">Recientes</p>
                      <div className="flex flex-wrap gap-1.5">
                        {recentCustomers.map(c => (
                          <button key={c.id} onClick={() => selectCustomer(c)} className="text-xs bg-[var(--color-bg)] border border-[var(--color-border)] px-2 py-1 rounded-md hover:border-[var(--color-accent)] transition-colors">
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <button onClick={() => setShowCustomerSearch(false)} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                    Ingresar manualmente
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nombre"
                      value={customerName}
                      onChange={e => { setCustomerName(e.target.value); setCustomerId(null) }}
                      className="flex-1 border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
                    />
                    <button
                      onClick={() => setShowCustomerSearch(true)}
                      className="p-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg)] transition-colors"
                      title="Buscar cliente"
                    >
                      <User size={16} className="text-[var(--color-text-muted)]" />
                    </button>
                  </div>
                  <input
                    type="tel"
                    placeholder="Telefono (opcional)"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
              )}
            </div>

            {/* Cart items */}
            <div>
              <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider block mb-1.5">
                Productos ({cart.length})
              </label>
              {cart.length === 0 ? (
                <div className="border border-dashed border-[var(--color-border)] rounded-lg p-4 text-center">
                  <ShoppingBag size={20} className="mx-auto text-[var(--color-text-muted)] mb-1" />
                  <p className="text-xs text-[var(--color-text-muted)]">Toca un producto para agregar</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex items-center gap-2 bg-[var(--color-bg)] rounded-lg px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium capitalize truncate">{item.product.flavor}</p>
                        <p className="text-[11px] text-[var(--color-text-muted)]">{SIZE_LABELS[item.product.size]} · {formatCOP(item.product.base_price)}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => updateQuantity(item.product.id, -1)} className="w-7 h-7 rounded-md border border-[var(--color-border)] bg-white flex items-center justify-center hover:border-[var(--color-text-muted)] transition-colors">
                          {item.quantity === 1 ? <Trash2 size={12} className="text-[var(--color-danger)]" /> : <Minus size={12} />}
                        </button>
                        <span className="w-5 text-center text-sm font-semibold">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, 1)} className="w-7 h-7 rounded-md border border-[var(--color-border)] bg-white flex items-center justify-center hover:border-[var(--color-text-muted)] transition-colors">
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="text-sm font-medium w-20 text-right">{formatCOP(item.product.base_price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Delivery + channel */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider block mb-1.5">Entrega</label>
                <div className="flex gap-1">
                  <button
                    onClick={() => setDeliveryType('pickup')}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      deliveryType === 'pickup' ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]' : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    <Store size={13} /> Local
                  </button>
                  <button
                    onClick={() => setDeliveryType('delivery')}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      deliveryType === 'delivery' ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]' : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    <Bike size={13} /> Dom.
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider block mb-1.5">Fecha</label>
                <div className="flex gap-1">
                  <button
                    onClick={() => setDeliveryDate('today')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      deliveryDate === 'today' ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]' : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    Hoy
                  </button>
                  <button
                    onClick={() => setDeliveryDate('tomorrow')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      deliveryDate === 'tomorrow' ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]' : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    Manana
                  </button>
                </div>
              </div>
            </div>

            {deliveryType === 'delivery' && (
              <input
                type="text"
                placeholder="Direccion de entrega"
                value={deliveryAddress}
                onChange={e => setDeliveryAddress(e.target.value)}
                className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
              />
            )}

            {/* Channel */}
            <div>
              <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider block mb-1.5">Canal</label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.entries(CHANNEL_LABELS) as [OrderChannel, string][]).map(([ch, label]) => (
                  <button
                    key={ch}
                    onClick={() => setChannel(ch)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      channel === ch ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]' : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment method */}
            <div>
              <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider block mb-1.5">Medio de pago</label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(([pm, label]) => (
                  <button
                    key={pm}
                    onClick={() => { setPaymentMethod(pm); setPaymentBank(null); setCardType(null); setPaymentReceiptUrl(null) }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      paymentMethod === pm ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]' : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bank selector (transfer only) */}
            {paymentMethod === 'transfer' && (
              <div>
                <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider block mb-1.5">Banco</label>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.entries(PAYMENT_BANK_LABELS) as [PaymentBank, string][]).map(([bank, label]) => (
                    <button
                      key={bank}
                      onClick={() => setPaymentBank(bank)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        paymentBank === bank ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]' : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {/* Receipt upload */}
                <div className="mt-2">
                  <PhotoUpload
                    orderId={tempOrderId}
                    type="receipt"
                    existingPath={paymentReceiptUrl}
                    onUpload={setPaymentReceiptUrl}
                    label="Comprobante"
                  />
                </div>
              </div>
            )}

            {/* Card type selector (card only) */}
            {paymentMethod === 'card' && (
              <div>
                <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider block mb-1.5">Tipo de tarjeta</label>
                <div className="flex gap-1.5">
                  {(Object.entries(CARD_TYPE_LABELS) as [CardType, string][]).map(([ct, label]) => (
                    <button
                      key={ct}
                      onClick={() => setCardType(ct)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        cardType === ct ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]' : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Packaging notes */}
            <div>
              <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider block mb-1.5">
                <Package size={11} className="inline mr-1" />
                Empaque especial
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {['Regalo', 'Marcada por 10 porciones', 'Marcada por 8 porciones'].map(chip => (
                  <button
                    key={chip}
                    onClick={() => setPackagingNotes(prev => prev ? `${prev}, ${chip}` : chip)}
                    className="px-2.5 py-1 rounded-md text-xs border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Instrucciones de empaque"
                value={packagingNotes}
                onChange={e => setPackagingNotes(e.target.value)}
                className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>

            {/* Notes */}
            <textarea
              placeholder="Notas (opcional)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)] resize-none"
            />
          </div>

          {/* Totals + submit */}
          <div className="border-t border-[var(--color-border)] p-4 space-y-2 bg-white">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-secondary)]">Subtotal</span>
              <span>{formatCOP(subtotal)}</span>
            </div>
            {deliveryFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-secondary)]">Domicilio</span>
                <span>{formatCOP(deliveryFee)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-secondary)]">Descuento ({customerDiscount}%)</span>
                <span className="text-[var(--color-success)]">-{formatCOP(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold pt-2 border-t border-[var(--color-border)]">
              <span>Total</span>
              <span>{formatCOP(total)}</span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={cart.length === 0 || submitting}
              className="w-full bg-[var(--color-accent)] text-white py-3 rounded-lg text-sm font-semibold hover:bg-[var(--color-teal-dark)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Creando...' : 'Crear pedido'}
            </button>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
