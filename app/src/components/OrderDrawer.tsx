import { useEffect, useState } from 'react'
import { X, Bike, Store, Phone, ChevronRight, Ban, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { StatusBadge } from './StatusBadge'
import { Toast } from './Toast'
import { formatCOP, formatDateTime } from '../lib/utils'
import { STATUS_LABELS, CHANNEL_LABELS, NEXT_STATUS_ACTION, ORDER_STATUS_FLOW } from '../lib/constants'
import { updateOrderStatus } from '../hooks/useOrders'
import type { Order, OrderStatus } from '../lib/types'

interface Props {
  orderId: string
  onClose: () => void
  onStatusChange?: () => void
}

export function OrderDrawer({ orderId, onClose, onStatusChange }: Props) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      const { data } = await supabase
        .from('orders')
        .select(`*, items:order_items(*, product:products(*)), customer:customers(*)`)
        .eq('id', orderId)
        .single()
      setOrder(data)
      setLoading(false)
    }
    fetch()
  }, [orderId])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleStatusChange(status: OrderStatus) {
    try {
      await updateOrderStatus(orderId, status)
      setOrder(prev => prev ? { ...prev, status } : prev)
      setToast({ msg: `Estado: ${STATUS_LABELS[status]}`, type: 'success' })
      onStatusChange?.()
    } catch {
      setToast({ msg: 'Error al actualizar', type: 'error' })
    }
  }

  const action = order ? NEXT_STATUS_ACTION[order.status] : null
  const isTerminal = order?.status === 'delivered' || order?.status === 'cancelled'

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-enter" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[460px] bg-white shadow-[var(--shadow-drawer)] flex flex-col drawer-enter">
        {/* Header — RestoFlow modal: px-6 py-4 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Detalle del pedido</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--color-bg-hover)] rounded-md transition-colors duration-200 text-[var(--color-text-muted)]" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading || !order ? (
          <div className="flex-1 flex items-center justify-center text-[var(--color-text-muted)] text-sm">
            Cargando...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Customer — px-6 py-4 like RestoFlow modal body */}
            <div className="px-6 py-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-semibold">{order.customer_name ?? 'Cliente'}</p>
                  {order.customer_phone && (
                    <p className="text-sm text-[var(--color-text-muted)] flex items-center gap-1 mt-1">
                      <Phone className="h-3.5 w-3.5" /> {order.customer_phone}
                    </p>
                  )}
                </div>
                <StatusBadge status={order.status} />
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-secondary)]">
                <span className="flex items-center gap-1">
                  {order.delivery_type === 'delivery' ? <Bike className="h-3.5 w-3.5" /> : <Store className="h-3.5 w-3.5" />}
                  {order.delivery_type === 'delivery' ? 'Domicilio' : 'Recoge en local'}
                </span>
                <span>{CHANNEL_LABELS[order.channel]}</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDateTime(order.created_at)}
                </span>
              </div>

              {order.delivery_address && (
                <p className="text-sm text-[var(--color-text-secondary)] bg-[var(--color-bg-hover)] rounded-lg px-3 py-2">
                  {order.delivery_address}
                </p>
              )}
            </div>

            {/* Items */}
            <div className="px-6 py-4 border-t border-[var(--color-border)]">
              <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Productos</h3>
              <div className="space-y-2.5">
                {order.items?.map(item => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.quantity}x {item.product?.flavor}</p>
                      <p className="text-xs text-[var(--color-text-muted)] capitalize">{item.product?.size}</p>
                    </div>
                    <p className="text-sm tabular-nums">{formatCOP(item.subtotal)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="px-6 py-4 border-t border-[var(--color-border)] space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">Subtotal</span>
                <span className="tabular-nums">{formatCOP(order.subtotal)}</span>
              </div>
              {order.delivery_fee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-text-muted)]">Domicilio</span>
                  <span className="tabular-nums">{formatCOP(order.delivery_fee)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-text-muted)]">Descuento</span>
                  <span className="text-[var(--color-success-text)] tabular-nums">-{formatCOP(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold pt-2.5 border-t border-[var(--color-border)]">
                <span>Total</span>
                <span className="tabular-nums">{formatCOP(order.total)}</span>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="px-6 py-4 border-t border-[var(--color-border)]">
                <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Notas</h3>
                <p className="text-sm text-[var(--color-warning-text)] bg-[var(--color-warning-bg)] px-3 py-2 rounded-lg">
                  {order.notes}
                </p>
              </div>
            )}

            {/* Status progress */}
            <div className="px-6 py-4 border-t border-[var(--color-border)]">
              <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Progreso</h3>
              <div className="flex items-center gap-1">
                {ORDER_STATUS_FLOW.map((s, i) => {
                  const currentIdx = ORDER_STATUS_FLOW.indexOf(order.status)
                  const isPast = i <= currentIdx
                  return (
                    <div key={s} className="flex-1">
                      <div className={`h-1 rounded-full ${isPast ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'}`} />
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-2 text-center">
                {STATUS_LABELS[order.status]}
              </p>
            </div>
          </div>
        )}

        {/* Footer — RestoFlow button pattern */}
        {order && !isTerminal && (
          <div className="px-6 py-4 border-t border-[var(--color-border)] flex gap-2">
            {action && (
              <button
                onClick={() => handleStatusChange(action.next)}
                className="flex-1 flex items-center justify-center gap-2 bg-[var(--color-accent)] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors duration-200"
              >
                <ChevronRight className="h-4 w-4" />
                {action.label}
              </button>
            )}
            <button
              onClick={() => handleStatusChange('cancelled')}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-muted)] hover:border-[var(--color-danger-text)] hover:text-[var(--color-danger-text)] transition-colors duration-200"
            >
              <Ban className="h-3.5 w-3.5" />
              Cancelar
            </button>
          </div>
        )}
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}
