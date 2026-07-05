import { useState } from 'react'
import { useOrders, updateOrderStatus, updateOrderFields } from '../hooks/useOrders'
import { Toast } from '../components/Toast'
import { PhotoUpload } from '../components/PhotoUpload'
import { today, tomorrow } from '../lib/utils'
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '../lib/constants'
import { MapPin, Phone, Package, CheckCircle, Truck, CreditCard, ChevronLeft, ChevronRight, Clock, AlertTriangle } from 'lucide-react'
import { format, parseISO, addDays, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Order } from '../lib/types'

type DriverTab = 'por_recoger' | 'entregando'

function formatPickerDate(dateStr: string): string {
  const t = today()
  const tm = tomorrow()
  if (dateStr === t) return 'Hoy'
  if (dateStr === tm) return 'Mañana'
  return format(parseISO(dateStr), "EEE d MMM", { locale: es })
}

export function DomiciliarioView() {
  const [selectedDate, setSelectedDate] = useState<string>(today())
  const { orders, loading, refetch } = useOrders(selectedDate, selectedDate)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<DriverTab>('por_recoger')

  const deliveryOrders = orders.filter(
    o => o.delivery_type === 'delivery' &&
    ['ready', 'dispatched'].includes(o.status)
  )
  const porRecoger = deliveryOrders.filter(o => o.status === 'ready')
  const entregando = deliveryOrders.filter(o => o.status === 'dispatched')

  const rawTabOrders = activeTab === 'por_recoger' ? porRecoger : entregando
  const tabOrders = [...rawTabOrders].sort((a, b) => {
    if (!a.estimated_delivery_time && !b.estimated_delivery_time) return 0
    if (!a.estimated_delivery_time) return 1
    if (!b.estimated_delivery_time) return -1
    return a.estimated_delivery_time.localeCompare(b.estimated_delivery_time)
  })

  function prevDay() {
    setSelectedDate(d => format(subDays(parseISO(d), 1), 'yyyy-MM-dd'))
  }
  function nextDay() {
    setSelectedDate(d => format(addDays(parseISO(d), 1), 'yyyy-MM-dd'))
  }

  async function handlePickup(order: Order) {
    setUpdatingId(order.id)
    try {
      await updateOrderFields(order.id, { picked_up_at: new Date().toISOString(), dispatched_at: new Date().toISOString() } as Partial<Order>)
      await updateOrderStatus(order.id, 'dispatched')
      setToast({ msg: 'Recogido', type: 'success' })
      setActiveTab('entregando')
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

  async function handleMarkInvoiceDelivered(order: Order) {
    setUpdatingId(order.id)
    try {
      await updateOrderFields(order.id, { invoice_delivered_physically: true } as Partial<Order>)
      setToast({ msg: 'Factura confirmada', type: 'success' })
      refetch()
    } catch {
      setToast({ msg: 'Error', type: 'error' })
    }
    setUpdatingId(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <p className="text-[var(--color-text-muted)]">Cargando entregas...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="bg-white border-b border-[var(--color-border)] px-4 py-4">
        <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Tartelle — Entregas</h1>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            onClick={prevDay}
            className="p-2 rounded-lg bg-[var(--color-surface-warm)] text-[var(--color-text-primary)] active:bg-[var(--color-bg-active)]"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-base font-semibold text-[var(--color-text-primary)] flex-1 text-center">
            {formatPickerDate(selectedDate)}
          </span>
          <button
            onClick={nextDay}
            className="p-2 rounded-lg bg-[var(--color-surface-warm)] text-[var(--color-text-primary)] active:bg-[var(--color-bg-active)]"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="mt-3 bg-[var(--color-surface-warm)] rounded-lg p-1 flex gap-1">
          <TabButton
            label="Por recoger"
            count={porRecoger.length}
            active={activeTab === 'por_recoger'}
            onClick={() => setActiveTab('por_recoger')}
          />
          <TabButton
            label="Entregando"
            count={entregando.length}
            active={activeTab === 'entregando'}
            onClick={() => setActiveTab('entregando')}
          />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {tabOrders.length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          tabOrders.map(order => (
            <DeliveryCard
              key={order.id}
              order={order}
              isUpdating={updatingId === order.id}
              onPickup={() => handlePickup(order)}
              onDeliver={() => handleDeliver(order)}
              onInvoicePhoto={path => handleInvoicePhoto(order.id, path)}
              onMarkInvoiceDelivered={() => handleMarkInvoiceDelivered(order)}
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
        active ? 'bg-white shadow-sm text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)] active:text-[var(--color-text-primary)]'
      }`}
      style={{ minHeight: '36px' }}
    >
      <span>{label}</span>
      {count > 0 && (
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
          active ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-neutral-bg)] text-[var(--color-neutral-text)]'
        }`}>
          {count}
        </span>
      )}
    </button>
  )
}

function EmptyState({ tab }: { tab: DriverTab }) {
  if (tab === 'por_recoger') return (
    <div className="text-center py-20">
      <Package size={48} className="mx-auto text-[var(--color-text-muted)] mb-3" />
      <p className="text-lg font-semibold text-[var(--color-text-primary)]">Ningún pedido listo aún</p>
      <p className="text-sm text-[var(--color-text-muted)] mt-1">Cuando cocina marque un pedido como listo aparecerá aquí</p>
    </div>
  )
  return (
    <div className="text-center py-20">
      <CheckCircle size={48} className="mx-auto text-[var(--color-success-text)] mb-3" />
      <p className="text-lg font-semibold text-[var(--color-text-primary)]">Sin entregas en ruta</p>
      <p className="text-sm text-[var(--color-text-muted)] mt-1">Todas las entregas están completas</p>
    </div>
  )
}

function DeliveryCard({ order, isUpdating, onPickup, onDeliver, onInvoicePhoto, onMarkInvoiceDelivered }: {
  order: Order
  isUpdating: boolean
  onPickup: () => void
  onDeliver: () => void
  onInvoicePhoto: (path: string) => void
  onMarkInvoiceDelivered: () => void
}) {
  const isReady      = order.status === 'ready'
  const isDispatched = order.status === 'dispatched'
  const isB2B        = order.customer?.type === 'b2b' || order.channel === 'b2b'
  const invoiceSatisfied = !isB2B || !isReady ||
    !!order.invoice_photo_url || order.invoice_delivered_physically
  const paymentColors = PAYMENT_STATUS_COLORS[order.payment_status ?? 'pending']

  return (
    <div className={`bg-white rounded-xl border-2 overflow-hidden ${isReady ? 'border-[var(--color-status-ready)]' : 'border-[var(--color-status-dispatched)]'}`}>
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-bold text-[var(--color-text-primary)]">{order.customer_name ?? 'Cliente'}</p>
            {order.estimated_delivery_time && (
              <p className="text-sm text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1">
                <Clock size={12} />
                {order.estimated_delivery_time.slice(0, 5)}
              </p>
            )}
          </div>
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
            className="mt-2 flex items-start gap-2 text-[var(--color-status-confirmed)] text-sm active:opacity-70"
          >
            <MapPin size={16} className="flex-shrink-0 mt-0.5" />
            <span className="underline">{order.delivery_address}</span>
          </a>
        )}

        {order.customer_phone && (
          <a
            href={`tel:${order.customer_phone}`}
            className="mt-1.5 flex items-center gap-2 text-[var(--color-status-confirmed)] text-sm active:opacity-70"
          >
            <Phone size={14} />
            <span className="underline">{order.customer_phone}</span>
          </a>
        )}
      </div>

      <div className="px-4 pb-3 space-y-1">
        {order.items?.map(item => (
          <div key={item.id} className="flex items-center justify-between text-sm">
            <span className="font-medium text-[var(--color-text-primary)]">
              {item.quantity}x {item.product?.flavor}
            </span>
            <span className="text-[var(--color-text-muted)] capitalize">{item.product?.size}</span>
          </div>
        ))}
      </div>

      {order.notes && (
        <div className="mx-4 mb-2 bg-[var(--color-warning-bg)] border border-[var(--color-warning-text)]/20 rounded-lg px-3 py-2 text-sm text-[var(--color-warning-text)] flex items-start gap-2">
          <Package size={14} className="flex-shrink-0 mt-0.5" />
          {order.notes}
        </div>
      )}

      {order.packaging_notes && (
        <div className="mx-4 mb-2 bg-[var(--color-status-production-bg)] border border-[var(--color-status-production)]/20 rounded-lg px-3 py-2 text-sm text-[var(--color-status-production)] flex items-start gap-2">
          <Package size={14} className="flex-shrink-0 mt-0.5" />
          {order.packaging_notes}
        </div>
      )}

      {isB2B && isReady && (
        <div className="mx-4 mb-3 rounded-xl border px-4 py-3 space-y-2.5"
          style={{ backgroundColor: invoiceSatisfied ? 'var(--color-success-bg)' : 'var(--color-warning-bg)', borderColor: invoiceSatisfied ? 'rgba(30,107,58,0.3)' : 'rgba(199,125,46,0.4)' }}
        >
          {invoiceSatisfied ? (
            <p className="text-[var(--color-success-text)] text-sm font-medium flex items-center gap-2">
              <CheckCircle size={15} />
              Factura OK
            </p>
          ) : (
            <>
              <p className="text-[var(--color-warning-text)] text-sm font-semibold flex items-center gap-2">
                <AlertTriangle size={15} />
                Factura pendiente
              </p>
              <div className="flex items-center gap-2">
                <PhotoUpload
                  orderId={order.id}
                  type="invoice"
                  existingPath={order.invoice_photo_url}
                  onUpload={onInvoicePhoto}
                  label="Foto factura"
                />
                <button
                  onClick={onMarkInvoiceDelivered}
                  className="flex-1 py-2 px-3 bg-[var(--color-surface-warm)] text-[var(--color-text-secondary)] rounded-lg text-sm font-medium hover:bg-[var(--color-bg-active)] active:bg-[var(--color-bg-active)] transition-colors min-h-[44px]"
                >
                  Entregada en físico
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {isB2B && isDispatched && (
        <div className="px-4 pb-3">
          <PhotoUpload
            orderId={order.id}
            type="invoice"
            existingPath={order.invoice_photo_url}
            onUpload={onInvoicePhoto}
            label="Re-subir factura"
          />
        </div>
      )}

      <div className="border-t border-[var(--color-border)]">
        {isReady && (
          <button
            onClick={onPickup}
            disabled={isUpdating || !invoiceSatisfied}
            className="w-full py-4 text-base font-bold flex items-center justify-center gap-2 bg-[var(--color-accent)] text-white active:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors"
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
            className="w-full py-4 text-base font-bold flex items-center justify-center gap-2 bg-[var(--color-status-confirmed)] text-white active:opacity-90 disabled:opacity-50 transition-opacity"
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
