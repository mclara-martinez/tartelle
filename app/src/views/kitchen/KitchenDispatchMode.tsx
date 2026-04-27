import { useState } from 'react'
import { useOrders, updateOrderStatus, updateOrderFields } from '../../hooks/useOrders'
import { adjustInventory } from '../../hooks/useInventory'
import { Toast } from '../../components/Toast'
import { PhotoUpload } from '../../components/PhotoUpload'
import { today } from '../../lib/utils'
import { STATUS_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '../../lib/constants'
import { Bike, Store, Truck, CheckCircle, AlertTriangle, Package, CreditCard, MapPin } from 'lucide-react'
import type { Order, OrderStatus } from '../../lib/types'

const STATUS_ORDER: Record<string, number> = {
  ready: 0,
  in_production: 1,
  confirmed: 2,
  dispatched: 3,
}

export function KitchenDispatchMode() {
  const { orders, refetch } = useOrders(today())
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const dispatchable = orders
    .filter(o => ['confirmed', 'in_production', 'ready', 'dispatched'].includes(o.status))
    .sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9))

  const delivered = orders.filter(o => o.status === 'delivered')

  async function handleAction(orderId: string, status: OrderStatus) {
    setUpdatingId(orderId)
    try {
      await updateOrderStatus(orderId, status)

      // Decrement inventory when order leaves the building
      if (status === 'dispatched') {
        const order = orders.find(o => o.id === orderId)
        if (order?.items) {
          await Promise.all(
            order.items.map(item =>
              adjustInventory(item.product_id, -item.quantity, 'sale', orderId)
            )
          )
        }
      }

      setToast({ msg: STATUS_LABELS[status], type: 'success' })
      refetch()
    } catch {
      setToast({ msg: 'Error', type: 'error' })
    }
    setUpdatingId(null)
  }

  async function handlePhotoUpload(orderId: string, path: string) {
    try {
      await updateOrderFields(orderId, { dispatch_photo_url: path } as Partial<Order>)
      setToast({ msg: 'Foto guardada', type: 'success' })
    } catch {
      setToast({ msg: 'Error al guardar foto', type: 'error' })
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-400 text-sm">{dispatchable.length} pedido{dispatchable.length !== 1 ? 's' : ''} activos</p>
        {delivered.length > 0 && (
          <span className="text-gray-500 text-sm">{delivered.length} entregados</span>
        )}
      </div>

      {dispatchable.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CheckCircle size={64} className="text-green-500 mb-4" />
          <p className="text-white text-2xl font-bold">Todo despachado</p>
          <p className="text-gray-400 text-lg mt-1">No hay pedidos pendientes de despacho</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dispatchable.map(order => (
            <DispatchCard
              key={order.id}
              order={order}
              isUpdating={updatingId === order.id}
              onAction={handleAction}
              onPhotoUpload={handlePhotoUpload}
            />
          ))}
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

function DispatchCard({ order, isUpdating, onAction, onPhotoUpload }: {
  order: Order
  isUpdating: boolean
  onAction: (orderId: string, status: OrderStatus) => void
  onPhotoUpload: (orderId: string, path: string) => void
}) {
  const isReady = order.status === 'ready'
  const isDispatched = order.status === 'dispatched'
  const borderColor = isReady ? '#10B981' : isDispatched ? '#F97316' : order.status === 'in_production' ? '#8B5CF6' : '#3B82F6'

  const paymentColors = PAYMENT_STATUS_COLORS[order.payment_status ?? 'pending']

  return (
    <div className="bg-[#1F2937] rounded-xl border-l-4 overflow-hidden" style={{ borderLeftColor: borderColor }}>
      {/* Header */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-white text-xl font-bold truncate">{order.customer_name ?? 'Cliente'}</p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-gray-400 text-sm flex items-center gap-1">
                {order.delivery_type === 'delivery' ? (
                  <><Bike size={14} className="text-orange-400" /> Domicilio</>
                ) : (
                  <><Store size={14} className="text-blue-400" /> Recoge</>
                )}
              </span>
              {order.customer_phone && (
                <span className="text-gray-500 text-sm">{order.customer_phone}</span>
              )}
            </div>
          </div>
          {/* Payment badge */}
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 flex-shrink-0"
            style={{ backgroundColor: paymentColors.bg, color: paymentColors.text }}
          >
            <CreditCard size={11} />
            {PAYMENT_STATUS_LABELS[order.payment_status ?? 'pending']}
          </span>
        </div>

        {/* Address */}
        {order.delivery_type === 'delivery' && order.delivery_address && (
          <div className="mt-2 flex items-start gap-1.5 text-gray-400 text-sm">
            <MapPin size={14} className="flex-shrink-0 mt-0.5" />
            <span>{order.delivery_address}</span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="px-5 pb-3 space-y-1">
        {order.items?.map(item => (
          <div key={item.id} className="flex items-center justify-between">
            <span className="text-white text-lg font-semibold">
              {item.quantity}x {item.product?.flavor}
            </span>
            <span className="text-gray-400 text-base capitalize">{item.product?.size}</span>
          </div>
        ))}
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="mx-5 mb-2 bg-yellow-900/40 border border-yellow-600/30 rounded-lg px-3 py-2 flex items-start gap-2">
          <AlertTriangle size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
          <p className="text-yellow-200 text-sm">{order.notes}</p>
        </div>
      )}

      {/* Packaging notes */}
      {order.packaging_notes && (
        <div className="mx-5 mb-2 bg-purple-900/40 border border-purple-600/30 rounded-lg px-3 py-2 flex items-start gap-2">
          <Package size={14} className="text-purple-400 mt-0.5 flex-shrink-0" />
          <p className="text-purple-200 text-sm">{order.packaging_notes}</p>
        </div>
      )}

      {/* Photo upload + action */}
      <div className="px-5 pb-3 flex items-center gap-2">
        <PhotoUpload
          orderId={order.id}
          type="dispatch"
          existingPath={order.dispatch_photo_url}
          onUpload={path => onPhotoUpload(order.id, path)}
          label="Foto"
          dark
        />
      </div>

      {/* Action button */}
      {isReady && (
        <button
          onClick={() => onAction(order.id, 'dispatched')}
          disabled={isUpdating}
          className="w-full py-4 text-base font-bold flex items-center justify-center gap-2 bg-[#2563EB] text-white hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors"
        >
          <Truck size={18} />
          Despachar
        </button>
      )}

      {isDispatched && (
        <div className="w-full py-3 text-center text-sm font-medium text-orange-400 bg-orange-900/20">
          En camino — esperando confirmacion
        </div>
      )}
    </div>
  )
}
