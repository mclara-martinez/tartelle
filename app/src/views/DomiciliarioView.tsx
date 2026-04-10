import { useState } from 'react'
import { useOrders, updateOrderStatus, updateOrderFields } from '../hooks/useOrders'
import { Toast } from '../components/Toast'
import { PhotoUpload } from '../components/PhotoUpload'
import { today, formatDate } from '../lib/utils'
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '../lib/constants'
import { MapPin, Phone, Package, CheckCircle, Truck, CreditCard, Camera } from 'lucide-react'
import type { Order } from '../lib/types'

export function DomiciliarioView() {
  const { orders, loading, refetch } = useOrders(today())
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Only delivery orders in dispatch-relevant states
  const deliveryOrders = orders
    .filter(o => o.delivery_type === 'delivery' && ['ready', 'dispatched'].includes(o.status))
    .sort((a, b) => {
      if (a.status === 'ready' && b.status !== 'ready') return -1
      if (a.status !== 'ready' && b.status === 'ready') return 1
      return 0
    })

  async function handlePickup(order: Order) {
    setUpdatingId(order.id)
    try {
      await updateOrderFields(order.id, {
        picked_up_at: new Date().toISOString(),
      } as Partial<Order>)
      await updateOrderStatus(order.id, 'dispatched')
      setToast({ msg: 'Recogido', type: 'success' })
      refetch()
    } catch {
      setToast({ msg: 'Error', type: 'error' })
    }
    setUpdatingId(null)
  }

  async function handleDeliver(order: Order) {
    setUpdatingId(order.id)
    try {
      await updateOrderFields(order.id, {
        delivered_at: new Date().toISOString(),
      } as Partial<Order>)
      await updateOrderStatus(order.id, 'delivered')
      setToast({ msg: 'Entregado', type: 'success' })
      refetch()
    } catch {
      setToast({ msg: 'Error', type: 'error' })
    }
    setUpdatingId(null)
  }

  async function handleInvoicePhoto(orderId: string, path: string) {
    try {
      await updateOrderFields(orderId, { invoice_photo_url: path } as Partial<Order>)
      setToast({ msg: 'Factura guardada', type: 'success' })
    } catch {
      setToast({ msg: 'Error', type: 'error' })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Cargando entregas...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <h1 className="text-lg font-bold text-gray-900">Tartelle — Entregas</h1>
        <p className="text-sm text-gray-500">{formatDate(today())} · {deliveryOrders.length} entrega{deliveryOrders.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Orders */}
      <div className="p-4 space-y-4">
        {deliveryOrders.length === 0 ? (
          <div className="text-center py-20">
            <CheckCircle size={48} className="mx-auto text-green-500 mb-3" />
            <p className="text-lg font-semibold text-gray-900">Sin entregas pendientes</p>
            <p className="text-sm text-gray-500 mt-1">Todas las entregas del dia estan completas</p>
          </div>
        ) : (
          deliveryOrders.map(order => (
            <DeliveryCard
              key={order.id}
              order={order}
              isUpdating={updatingId === order.id}
              onPickup={() => handlePickup(order)}
              onDeliver={() => handleDeliver(order)}
              onInvoicePhoto={path => handleInvoicePhoto(order.id, path)}
            />
          ))
        )}
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

function DeliveryCard({ order, isUpdating, onPickup, onDeliver, onInvoicePhoto }: {
  order: Order
  isUpdating: boolean
  onPickup: () => void
  onDeliver: () => void
  onInvoicePhoto: (path: string) => void
}) {
  const isReady = order.status === 'ready'
  const isDispatched = order.status === 'dispatched'
  const isB2B = order.customer?.type === 'b2b' || order.channel === 'b2b'
  const paymentColors = PAYMENT_STATUS_COLORS[order.payment_status ?? 'pending']

  return (
    <div className={`bg-white rounded-xl border-2 overflow-hidden shadow-sm ${isReady ? 'border-green-400' : 'border-orange-300'}`}>
      {/* Customer + payment */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between">
          <p className="text-lg font-bold text-gray-900">{order.customer_name ?? 'Cliente'}</p>
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
            style={{ backgroundColor: paymentColors.bg, color: paymentColors.text }}
          >
            <CreditCard size={11} />
            {PAYMENT_STATUS_LABELS[order.payment_status ?? 'pending']}
          </span>
        </div>

        {/* Address — tappable link to Google Maps */}
        {order.delivery_address && (
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(order.delivery_address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-start gap-2 text-blue-600 text-sm active:text-blue-800"
          >
            <MapPin size={16} className="flex-shrink-0 mt-0.5" />
            <span className="underline">{order.delivery_address}</span>
          </a>
        )}

        {/* Phone — tappable link */}
        {order.customer_phone && (
          <a
            href={`tel:${order.customer_phone}`}
            className="mt-1.5 flex items-center gap-2 text-blue-600 text-sm active:text-blue-800"
          >
            <Phone size={14} />
            <span className="underline">{order.customer_phone}</span>
          </a>
        )}
      </div>

      {/* Items */}
      <div className="px-4 pb-3 space-y-1">
        {order.items?.map(item => (
          <div key={item.id} className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-900">
              {item.quantity}x {item.product?.flavor}
            </span>
            <span className="text-gray-500 capitalize">{item.product?.size}</span>
          </div>
        ))}
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="mx-4 mb-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-sm text-yellow-800 flex items-start gap-2">
          <Package size={14} className="flex-shrink-0 mt-0.5" />
          {order.notes}
        </div>
      )}

      {/* Packaging notes */}
      {order.packaging_notes && (
        <div className="mx-4 mb-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-sm text-purple-800 flex items-start gap-2">
          <Package size={14} className="flex-shrink-0 mt-0.5" />
          {order.packaging_notes}
        </div>
      )}

      {/* B2B invoice photo */}
      {isB2B && isDispatched && (
        <div className="px-4 pb-3">
          <PhotoUpload
            orderId={order.id}
            type="invoice"
            existingPath={order.invoice_photo_url}
            onUpload={onInvoicePhoto}
            label="Foto factura firmada"
          />
        </div>
      )}

      {/* Actions */}
      <div className="border-t border-gray-100">
        {isReady && (
          <button
            onClick={onPickup}
            disabled={isUpdating}
            className="w-full py-4 text-base font-bold flex items-center justify-center gap-2 bg-green-600 text-white active:bg-green-700 disabled:opacity-50 transition-colors"
            style={{ minHeight: '56px' }}
          >
            <Truck size={20} />
            Recogido
          </button>
        )}

        {isDispatched && (
          <button
            onClick={onDeliver}
            disabled={isUpdating}
            className="w-full py-4 text-base font-bold flex items-center justify-center gap-2 bg-blue-600 text-white active:bg-blue-700 disabled:opacity-50 transition-colors"
            style={{ minHeight: '56px' }}
          >
            <CheckCircle size={20} />
            Entregado
          </button>
        )}
      </div>
    </div>
  )
}
