import { useState } from 'react'
import { useOrders, updateOrderStatus, updateOrderFields } from '../hooks/useOrders'
import { Toast } from '../components/Toast'
import { PhotoUpload } from '../components/PhotoUpload'
import { today, formatDate } from '../lib/utils'
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '../lib/constants'
import { MapPin, Phone, Package, CheckCircle, Truck, CreditCard, Clock, ChefHat } from 'lucide-react'
import type { Order } from '../lib/types'

type DriverTab = 'programado' | 'para_recoger' | 'en_camino'

export function DomiciliarioView() {
  const { orders, loading, refetch } = useOrders(today())
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<DriverTab>('para_recoger')

  const allDeliveryOrders = orders.filter(
    o => o.delivery_type === 'delivery' &&
    ['confirmed', 'in_production', 'ready', 'dispatched'].includes(o.status)
  )
  const programado = allDeliveryOrders.filter(o => ['confirmed', 'in_production'].includes(o.status))
  const paraRecoger = allDeliveryOrders.filter(o => o.status === 'ready')
  const enCamino = allDeliveryOrders.filter(o => o.status === 'dispatched')

  const tabOrders = activeTab === 'programado' ? programado
    : activeTab === 'para_recoger' ? paraRecoger
    : enCamino

  async function handlePickup(order: Order) {
    setUpdatingId(order.id)
    try {
      await updateOrderFields(order.id, { picked_up_at: new Date().toISOString() } as Partial<Order>)
      await updateOrderStatus(order.id, 'dispatched')
      setToast({ msg: 'Recogido', type: 'success' })
      setActiveTab('en_camino')
      refetch()
    } catch {
      setToast({ msg: 'Error', type: 'error' })
    }
    setUpdatingId(null)
  }

  async function handleDeliver(order: Order) {
    setUpdatingId(order.id)
    try {
      await updateOrderFields(order.id, { delivered_at: new Date().toISOString() } as Partial<Order>)
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

  const tabLabel = activeTab === 'programado' ? `${programado.length} programado${programado.length !== 1 ? 's' : ''}`
    : activeTab === 'para_recoger' ? `${paraRecoger.length} para recoger`
    : `${enCamino.length} en camino`

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <h1 className="text-lg font-bold text-gray-900">Tartelle — Entregas</h1>
        <p className="text-sm text-gray-500">{formatDate(today())} · {tabLabel}</p>

        {/* Tab toggle */}
        <div className="mt-3 bg-gray-100 rounded-lg p-1 flex gap-1">
          <TabButton
            label="Programado"
            count={programado.length}
            active={activeTab === 'programado'}
            onClick={() => setActiveTab('programado')}
          />
          <TabButton
            label="Para recoger"
            count={paraRecoger.length}
            active={activeTab === 'para_recoger'}
            onClick={() => setActiveTab('para_recoger')}
          />
          <TabButton
            label="En camino"
            count={enCamino.length}
            active={activeTab === 'en_camino'}
            onClick={() => setActiveTab('en_camino')}
          />
        </div>
      </div>

      {/* Orders */}
      <div className="p-4 space-y-4">
        {tabOrders.length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : activeTab === 'programado' ? (
          programado.map(order => (
            <ScheduledCard key={order.id} order={order} />
          ))
        ) : (
          tabOrders.map(order => (
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

function TabButton({ label, count, active, onClick }: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-md text-xs font-semibold transition-all ${
        active ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 active:text-gray-700'
      }`}
      style={{ minHeight: '36px' }}
    >
      <span>{label}</span>
      {count > 0 && (
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
          active ? 'bg-gray-900 text-white' : 'bg-gray-300 text-gray-600'
        }`}>
          {count}
        </span>
      )}
    </button>
  )
}

function EmptyState({ tab }: { tab: DriverTab }) {
  if (tab === 'programado') return (
    <div className="text-center py-20">
      <Clock size={48} className="mx-auto text-gray-300 mb-3" />
      <p className="text-lg font-semibold text-gray-900">Nada programado aún</p>
      <p className="text-sm text-gray-500 mt-1">Los pedidos confirmados aparecerán aquí</p>
    </div>
  )
  if (tab === 'para_recoger') return (
    <div className="text-center py-20">
      <Package size={48} className="mx-auto text-gray-300 mb-3" />
      <p className="text-lg font-semibold text-gray-900">Ningún pedido listo aún</p>
      <p className="text-sm text-gray-500 mt-1">Cuando cocina marque un pedido como listo aparecerá aquí</p>
    </div>
  )
  return (
    <div className="text-center py-20">
      <CheckCircle size={48} className="mx-auto text-green-500 mb-3" />
      <p className="text-lg font-semibold text-gray-900">Sin entregas en ruta</p>
      <p className="text-sm text-gray-500 mt-1">Todas las entregas del día están completas</p>
    </div>
  )
}

function ScheduledCard({ order }: { order: Order }) {
  const isInProduction = order.status === 'in_production'

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm opacity-75">
      {/* Status badge + customer */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-base font-bold text-gray-700">{order.customer_name ?? 'Cliente'}</p>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 flex-shrink-0 ${
            isInProduction
              ? 'bg-purple-100 text-purple-700'
              : 'bg-blue-100 text-blue-700'
          }`}>
            {isInProduction ? <ChefHat size={11} /> : <Clock size={11} />}
            {isInProduction ? 'En producción' : 'Confirmado'}
          </span>
        </div>

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
            <span className="font-medium text-gray-700">
              {item.quantity}x {item.product?.flavor}
            </span>
            <span className="text-gray-400 capitalize">{item.product?.size}</span>
          </div>
        ))}
      </div>

      {order.notes && (
        <div className="mx-4 mb-3 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-sm text-yellow-800 flex items-start gap-2">
          <Package size={14} className="flex-shrink-0 mt-0.5" />
          {order.notes}
        </div>
      )}

      {order.packaging_notes && (
        <div className="mx-4 mb-3 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-sm text-purple-800 flex items-start gap-2">
          <Package size={14} className="flex-shrink-0 mt-0.5" />
          {order.packaging_notes}
        </div>
      )}
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

      {order.notes && (
        <div className="mx-4 mb-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-sm text-yellow-800 flex items-start gap-2">
          <Package size={14} className="flex-shrink-0 mt-0.5" />
          {order.notes}
        </div>
      )}

      {order.packaging_notes && (
        <div className="mx-4 mb-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-sm text-purple-800 flex items-start gap-2">
          <Package size={14} className="flex-shrink-0 mt-0.5" />
          {order.packaging_notes}
        </div>
      )}

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
