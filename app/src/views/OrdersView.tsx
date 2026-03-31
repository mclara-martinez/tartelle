import { useState } from 'react'
import { useOrders, createOrder, updateOrderStatus } from '../hooks/useOrders'
import { useProducts } from '../hooks/useProducts'
import { StatusBadge } from '../components/StatusBadge'
import { Toast } from '../components/Toast'
import { formatCOP, formatDate, today, tomorrow } from '../lib/utils'
import { CHANNEL_LABELS, ORDER_STATUS_FLOW, DELIVERY_FEE } from '../lib/constants'
import type { OrderChannel, OrderStatus, DeliveryType } from '../lib/types'
import { Plus, ChevronRight, X, Trash2 } from 'lucide-react'

type DateFilter = 'today' | 'tomorrow'

export function OrdersView() {
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const targetDate = dateFilter === 'today' ? today() : tomorrow()
  const { orders, loading, error, refetch } = useOrders(targetDate)
  const { products } = useProducts()

  async function handleStatusChange(orderId: string, status: OrderStatus) {
    try {
      await updateOrderStatus(orderId, status)
      setToast({ msg: 'Estado actualizado', type: 'success' })
      refetch()
    } catch (e) {
      setToast({ msg: 'Error al actualizar', type: 'error' })
    }
  }

  async function handleCreateOrder(data: NewOrderData) {
    try {
      await createOrder(
        {
          customer_id: null,
          customer_name: data.customerName,
          customer_phone: data.customerPhone,
          channel: data.channel,
          status: 'confirmed',
          delivery_date: data.deliveryDate,
          delivery_type: data.deliveryType,
          delivery_address: data.deliveryAddress || null,
          subtotal: data.subtotal,
          delivery_fee: data.deliveryType === 'delivery' ? DELIVERY_FEE : 0,
          discount: 0,
          total: data.total,
          notes: data.notes || null,
        },
        data.items
      )
      setToast({ msg: 'Pedido creado', type: 'success' })
      setShowForm(false)
      refetch()
    } catch (e) {
      setToast({ msg: 'Error al crear pedido', type: 'error' })
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Pedidos</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{formatDate(targetDate)}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-[var(--color-accent)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={15} />
          Nuevo pedido
        </button>
      </div>

      {/* Date tabs */}
      <div className="flex gap-1 bg-[var(--color-border)] p-1 rounded-lg w-fit">
        {(['today', 'tomorrow'] as DateFilter[]).map(d => (
          <button
            key={d}
            onClick={() => setDateFilter(d)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              dateFilter === d
                ? 'bg-white text-[var(--color-text-primary)] shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {d === 'today' ? 'Hoy' : 'Mañana'}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-light)] rounded-lg px-4 py-3">
          Error cargando pedidos: {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-[var(--color-text-secondary)]">Cargando pedidos...</div>
      ) : orders.length === 0 ? (
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-10 text-center">
          <p className="text-[var(--color-text-secondary)] text-sm">Sin pedidos para {dateFilter === 'today' ? 'hoy' : 'mañana'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div key={order.id} className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{order.customer_name ?? 'Cliente'}</p>
                    <span className="text-xs text-[var(--color-text-secondary)]">·</span>
                    <span className="text-xs text-[var(--color-text-secondary)]">{CHANNEL_LABELS[order.channel]}</span>
                    <span className="text-xs text-[var(--color-text-secondary)]">·</span>
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      {order.delivery_type === 'delivery' ? '🛵 Domicilio' : '🏪 Recoge'}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    {order.items?.map(i => `${i.quantity}× ${i.product?.flavor} ${i.product?.size}`).join(', ')}
                  </p>
                  {order.notes && (
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1 italic">"{order.notes}"</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <StatusBadge status={order.status} size="sm" />
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">{formatCOP(order.total)}</p>
                </div>
              </div>

              {/* Status actions */}
              {order.status !== 'delivered' && order.status !== 'cancelled' && (
                <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex gap-2">
                  {getNextStatus(order.status) && (
                    <button
                      onClick={() => handleStatusChange(order.id, getNextStatus(order.status)!)}
                      className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-accent)] hover:opacity-80 transition-opacity"
                    >
                      <ChevronRight size={13} />
                      {getNextLabel(order.status)}
                    </button>
                  )}
                  <button
                    onClick={() => handleStatusChange(order.id, 'cancelled')}
                    className="ml-auto flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] transition-colors"
                  >
                    <X size={13} />
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <NewOrderForm
          products={products}
          onSubmit={handleCreateOrder}
          onClose={() => setShowForm(false)}
        />
      )}

      {toast && (
        <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}

function getNextStatus(current: OrderStatus): OrderStatus | null {
  const idx = ORDER_STATUS_FLOW.indexOf(current)
  return idx >= 0 && idx < ORDER_STATUS_FLOW.length - 1 ? ORDER_STATUS_FLOW[idx + 1] : null
}

function getNextLabel(current: OrderStatus): string {
  const labels: Partial<Record<OrderStatus, string>> = {
    pending: 'Confirmar',
    confirmed: 'Enviar a producción',
    in_production: 'Marcar listo',
    ready: 'Despachar',
    dispatched: 'Marcar entregado',
  }
  return labels[current] ?? 'Siguiente'
}

// ---- New Order Form ----
interface NewOrderData {
  customerName: string
  customerPhone: string
  channel: OrderChannel
  deliveryDate: string
  deliveryType: DeliveryType
  deliveryAddress: string
  notes: string
  items: { product_id: string; quantity: number; unit_price: number }[]
  subtotal: number
  total: number
}

function NewOrderForm({ products, onSubmit, onClose }: {
  products: ReturnType<typeof useProducts>['products']
  onSubmit: (data: NewOrderData) => void
  onClose: () => void
}) {
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [channel, setChannel] = useState<OrderChannel>('whatsapp')
  const [deliveryDate, setDeliveryDate] = useState(tomorrow())
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('pickup')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<{ product_id: string; quantity: number; unit_price: number }[]>([])
  const [submitting, setSubmitting] = useState(false)

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const fee = deliveryType === 'delivery' ? DELIVERY_FEE : 0
  const total = subtotal + fee

  function addItem(productId: string) {
    const product = products.find(p => p.id === productId)
    if (!product) return
    const existing = items.find(i => i.product_id === productId)
    if (existing) {
      setItems(items.map(i => i.product_id === productId ? { ...i, quantity: i.quantity + 1 } : i))
    } else {
      setItems([...items, { product_id: productId, quantity: 1, unit_price: product.base_price }])
    }
  }

  function removeItem(productId: string) {
    setItems(items.filter(i => i.product_id !== productId))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerName.trim() || items.length === 0) return
    setSubmitting(true)
    await onSubmit({ customerName, customerPhone, channel, deliveryDate, deliveryType, deliveryAddress, notes, items, subtotal, total })
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-40 flex items-end sm:items-center justify-center p-4">
      <div className="bg-[var(--color-surface)] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="font-semibold text-[var(--color-text-primary)]">Nuevo pedido</h2>
          <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Nombre *</label>
              <input
                className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Nombre del cliente"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Celular</label>
              <input
                className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="300 000 0000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Canal</label>
              <select
                className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)] bg-white"
                value={channel}
                onChange={e => setChannel(e.target.value as OrderChannel)}
              >
                {Object.entries(CHANNEL_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Fecha entrega</label>
              <input
                type="date"
                className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
                value={deliveryDate}
                onChange={e => setDeliveryDate(e.target.value)}
                min={today()}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Entrega</label>
            <div className="flex gap-2">
              {(['pickup', 'delivery'] as DeliveryType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDeliveryType(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    deliveryType === t
                      ? 'bg-[var(--color-accent-light)] border-[var(--color-accent)] text-[var(--color-accent)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
                  }`}
                >
                  {t === 'pickup' ? '🏪 Recoge' : `🛵 Domicilio (+${formatCOP(DELIVERY_FEE)})`}
                </button>
              ))}
            </div>
          </div>

          {deliveryType === 'delivery' && (
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Dirección</label>
              <input
                className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
                value={deliveryAddress}
                onChange={e => setDeliveryAddress(e.target.value)}
                placeholder="Dirección de entrega"
              />
            </div>
          )}

          {/* Products */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-2">Productos *</label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {products.map(p => {
                const inOrder = items.find(i => i.product_id === p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addItem(p.id)}
                    className={`text-left p-2.5 rounded-lg border text-xs transition-colors ${
                      inOrder
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]'
                        : 'border-[var(--color-border)] hover:border-[var(--color-accent)]'
                    }`}
                  >
                    <p className="font-medium">{p.flavor}</p>
                    <p className="text-[var(--color-text-secondary)] capitalize">{p.size} · {formatCOP(p.base_price)}</p>
                    {inOrder && <p className="text-[var(--color-accent)] font-semibold mt-0.5">{inOrder.quantity}×</p>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Cart */}
          {items.length > 0 && (
            <div className="bg-[var(--color-bg)] rounded-lg p-3 space-y-2">
              {items.map(item => {
                const product = products.find(p => p.id === item.product_id)
                return (
                  <div key={item.product_id} className="flex items-center justify-between text-sm">
                    <span>{item.quantity}× {product?.flavor} {product?.size}</span>
                    <div className="flex items-center gap-3">
                      <span>{formatCOP(item.quantity * item.unit_price)}</span>
                      <button type="button" onClick={() => removeItem(item.product_id)} className="text-[var(--color-text-secondary)] hover:text-[var(--color-danger)]">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
              <div className="border-t border-[var(--color-border)] pt-2 flex justify-between font-semibold text-sm">
                <span>Total</span>
                <span>{formatCOP(total)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Notas</label>
            <textarea
              className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)] resize-none"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Instrucciones especiales..."
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !customerName.trim() || items.length === 0}
            className="w-full bg-[var(--color-accent)] text-white py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {submitting ? 'Guardando...' : 'Crear pedido'}
          </button>
        </form>
      </div>
    </div>
  )
}
