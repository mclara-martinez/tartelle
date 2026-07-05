import { useState } from 'react'
import { useOrders, updateOrderStatus, updateOrderFields } from '../../hooks/useOrders'
import { Toast } from '../../components/Toast'
import { PhotoUpload } from '../../components/PhotoUpload'
import { today, formatDate, shiftDay } from '../../lib/utils'
import { STATUS_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '../../lib/constants'
import { Bike, Store, Truck, CheckCircle, AlertTriangle, Package, CreditCard, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Order, OrderStatus } from '../../lib/types'

const STATUS_ORDER: Record<string, number> = {
  ready: 0,
  in_production: 1,
  confirmed: 2,
  dispatched: 3,
}

export function KitchenDispatchMode() {
  const [selectedDate, setSelectedDate] = useState(today())
  const { orders, refetch } = useOrders(selectedDate)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // B11: separar lo despachable de lo que aún está en preparación —
  // antes se mezclaban y un pedido confirmado parecía listo para salir.
  const dispatchQueue = orders
    .filter(o => o.status === 'ready' || o.status === 'dispatched')
    .sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9))

  const inPreparation = orders
    .filter(o => o.status === 'confirmed' || o.status === 'in_production')
    .sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9))

  const delivered = orders.filter(o => o.status === 'delivered')

  async function handleAction(orderId: string, status: OrderStatus) {
    setUpdatingId(orderId)
    try {
      const order = orders.find(o => o.id === orderId)
      await updateOrderStatus(orderId, status, order)
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
      <div className="flex items-center justify-center gap-4 mb-4">
        <button
          onClick={() => setSelectedDate(d => shiftDay(d, -1))}
          aria-label="Dia anterior"
          className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="text-center min-w-[160px]">
          <p className="text-[var(--color-text-primary)] text-lg font-bold capitalize">{formatDate(selectedDate)}</p>
          {selectedDate === today() && <p className="text-[var(--color-success-text)] text-xs font-medium">Hoy</p>}
        </div>
        <button
          onClick={() => setSelectedDate(d => shiftDay(d, 1))}
          aria-label="Dia siguiente"
          className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-[var(--color-text-secondary)] text-sm">
          {dispatchQueue.length} para despachar
          {inPreparation.length > 0 && ` · ${inPreparation.length} en preparación`}
        </p>
        {delivered.length > 0 && (
          <span className="text-[var(--color-text-muted)] text-sm">{delivered.length} entregados</span>
        )}
      </div>

      {dispatchQueue.length === 0 && inPreparation.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CheckCircle size={64} className="text-[var(--color-success-text)] mb-4" />
          <p className="text-[var(--color-text-primary)] text-2xl font-bold">Todo despachado</p>
          <p className="text-[var(--color-text-muted)] text-lg mt-1">No hay pedidos pendientes de despacho</p>
        </div>
      ) : (
        <>
          {dispatchQueue.length === 0 ? (
            <p className="text-[var(--color-text-muted)] text-base text-center py-8">
              Nada listo para despachar todavía
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dispatchQueue.map(order => (
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

          {inPreparation.length > 0 && (
            <div className="mt-8">
              <p className="text-[var(--color-text-muted)] text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="h-px flex-1 bg-[var(--color-border)]" />
                En preparación — aún no salen
                <span className="h-px flex-1 bg-[var(--color-border)]" />
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-60">
                {inPreparation.map(order => (
                  <DispatchCard
                    key={order.id}
                    order={order}
                    isUpdating={updatingId === order.id}
                    onAction={handleAction}
                    onPhotoUpload={handlePhotoUpload}
                  />
                ))}
              </div>
            </div>
          )}
        </>
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
  const borderColor = isReady ? 'var(--color-status-ready)' : isDispatched ? 'var(--color-status-dispatched)' : order.status === 'in_production' ? 'var(--color-status-production)' : 'var(--color-status-confirmed)'

  const paymentColors = PAYMENT_STATUS_COLORS[order.payment_status ?? 'pending']

  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] border-l-4 overflow-hidden" style={{ borderLeftColor: borderColor }}>
      {/* Header */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-[var(--color-text-primary)] text-xl font-bold truncate">{order.customer_name ?? 'Cliente'}</p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-[var(--color-text-secondary)] text-sm flex items-center gap-1">
                {order.delivery_type === 'delivery' ? (
                  <><Bike size={14} className="text-[var(--color-warning-text)]" /> Domicilio</>
                ) : (
                  <><Store size={14} className="text-[var(--color-status-confirmed)]" /> Recoge</>
                )}
              </span>
              {order.customer_phone && (
                <span className="text-[var(--color-text-muted)] text-sm">{order.customer_phone}</span>
              )}
            </div>
          </div>
          {/* Estado del pedido (primario) + pago (secundario) */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
              style={{ backgroundColor: borderColor }}
            >
              {STATUS_LABELS[order.status]}
            </span>
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
              style={{ backgroundColor: paymentColors.bg, color: paymentColors.text }}
            >
              <CreditCard size={10} />
              Pago: {PAYMENT_STATUS_LABELS[order.payment_status ?? 'pending']}
            </span>
          </div>
        </div>

        {/* Address */}
        {order.delivery_type === 'delivery' && order.delivery_address && (
          <div className="mt-2 flex items-start gap-1.5 text-[var(--color-text-secondary)] text-sm">
            <MapPin size={14} className="flex-shrink-0 mt-0.5" />
            <span>{order.delivery_address}</span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="px-5 pb-3 space-y-1">
        {order.items?.map(item => (
          <div key={item.id} className="flex items-center justify-between">
            <span className="text-[var(--color-text-primary)] text-lg font-semibold">
              {item.quantity}x {item.product?.flavor}
            </span>
            <span className="text-[var(--color-text-muted)] text-base capitalize">{item.product?.size}</span>
          </div>
        ))}
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="mx-5 mb-2 bg-[var(--color-warning-bg)] border border-[var(--color-warning-text)]/20 rounded-lg px-3 py-2 flex items-start gap-2">
          <AlertTriangle size={14} className="text-[var(--color-warning-text)] mt-0.5 flex-shrink-0" />
          <p className="text-[var(--color-warning-text)] text-sm">{order.notes}</p>
        </div>
      )}

      {/* Packaging notes */}
      {order.packaging_notes && (
        <div className="mx-5 mb-2 bg-[var(--color-status-production-bg)] border border-[var(--color-status-production)]/20 rounded-lg px-3 py-2 flex items-start gap-2">
          <Package size={14} className="text-[var(--color-status-production)] mt-0.5 flex-shrink-0" />
          <p className="text-[var(--color-status-production)] text-sm">{order.packaging_notes}</p>
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
        />
      </div>

      {/* Action button */}
      {isReady && (
        <button
          onClick={() => onAction(order.id, 'dispatched')}
          disabled={isUpdating}
          className="w-full py-4 text-base font-bold flex items-center justify-center gap-2 bg-[var(--color-status-confirmed)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <Truck size={18} />
          Despachar
        </button>
      )}

      {isDispatched && (
        <div className="w-full py-3 text-center text-sm font-medium text-[var(--color-warning-text)] bg-[var(--color-warning-bg)]">
          En camino — esperando confirmacion
        </div>
      )}
    </div>
  )
}
