import { useState } from 'react'
import { useOrders, updateOrderStatus } from '../hooks/useOrders'
import { StatusBadge } from '../components/StatusBadge'
import { Toast } from '../components/Toast'
import { formatCOP, formatDate, today, tomorrow } from '../lib/utils'
import { CHANNEL_LABELS, ORDER_STATUS_FLOW } from '../lib/constants'
import type { OrderStatus } from '../lib/types'
import type { View } from '../App'
import { Plus, ChevronRight, X, Bike, Store } from 'lucide-react'

type DateFilter = 'today' | 'tomorrow'

export function OrdersView({ onNavigate }: { onNavigate: (v: View) => void }) {
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const targetDate = dateFilter === 'today' ? today() : tomorrow()
  const { orders, loading, error, refetch } = useOrders(targetDate)

  async function handleStatusChange(orderId: string, status: OrderStatus) {
    try {
      await updateOrderStatus(orderId, status)
      setToast({ msg: 'Estado actualizado', type: 'success' })
      refetch()
    } catch (e) {
      setToast({ msg: 'Error al actualizar', type: 'error' })
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-0.5">Pedidos</p>
          <h1 className="text-lg font-semibold">{formatDate(targetDate)}</h1>
        </div>
        <button
          onClick={() => onNavigate('intake')}
          className="flex items-center gap-1.5 bg-[var(--color-accent)] text-white px-3 py-1.5 rounded-md text-[13px] font-medium hover:bg-[var(--color-teal-dark)] transition-colors"
        >
          <Plus size={14} />
          Nuevo pedido
        </button>
      </div>

      {/* Date tabs */}
      <div className="flex gap-0.5 bg-[var(--color-bg)] p-0.5 rounded-md w-fit border border-[var(--color-border)]">
        {(['today', 'tomorrow'] as DateFilter[]).map(d => (
          <button
            key={d}
            onClick={() => setDateFilter(d)}
            className={`px-3 py-1 rounded text-[13px] font-medium transition-colors ${
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
        <div className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-light)] rounded-md px-3 py-2">
          Error cargando pedidos: {error}
        </div>
      )}

      {loading ? (
        <div className="text-[13px] text-[var(--color-text-secondary)]">Cargando pedidos...</div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-md border border-[var(--color-border)] shadow-[var(--shadow-card)] p-10 text-center">
          <p className="text-[var(--color-text-secondary)] text-[13px]">Sin pedidos para {dateFilter === 'today' ? 'hoy' : 'mañana'}</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-md border border-[var(--color-border)] shadow-[var(--shadow-card)] overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_90px_90px_90px_120px_80px] px-4 py-2 bg-[var(--color-bg)] border-b border-[var(--color-border)] text-[11px] uppercase font-medium text-[var(--color-text-muted)] tracking-wider">
              <span>Cliente</span>
              <span>Canal</span>
              <span>Entrega</span>
              <span className="text-right">Total</span>
              <span>Estado</span>
              <span></span>
            </div>
            {/* Rows */}
            <div className="divide-y divide-[var(--color-border)]">
              {orders.map(order => (
                <div key={order.id} className="grid grid-cols-[1fr_90px_90px_90px_120px_80px] px-4 py-2.5 items-center group hover:bg-[var(--color-bg)] transition-colors">
                  <div className="min-w-0">
                    <p className="font-medium text-[13px] truncate">{order.customer_name ?? 'Cliente'}</p>
                    <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                      {order.items?.map(i => `${i.quantity}× ${i.product?.flavor}`).join(', ')}
                    </p>
                  </div>
                  <span className="text-[12px] text-[var(--color-text-secondary)]">{CHANNEL_LABELS[order.channel]}</span>
                  <span className="text-[12px] text-[var(--color-text-secondary)] inline-flex items-center gap-1">
                    {order.delivery_type === 'delivery' ? <Bike size={11} /> : <Store size={11} />}
                    {order.delivery_type === 'delivery' ? 'Dom.' : 'Recoge'}
                  </span>
                  <span className="text-[13px] font-medium text-right">{formatCOP(order.total)}</span>
                  <StatusBadge status={order.status} size="sm" />
                  {/* Row actions */}
                  {order.status !== 'delivered' && order.status !== 'cancelled' && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {getNextStatus(order.status) && (
                        <button
                          onClick={() => handleStatusChange(order.id, getNextStatus(order.status)!)}
                          className="text-[11px] font-medium text-[var(--color-accent)] hover:text-[var(--color-teal-dark)] px-1.5 py-1 rounded transition-colors"
                          title={getNextLabel(order.status)}
                        >
                          <ChevronRight size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleStatusChange(order.id, 'cancelled')}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] px-1.5 py-1 rounded transition-colors"
                        title="Cancelar"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {orders.map(order => (
              <div key={order.id} className="bg-white rounded-md border border-[var(--color-border)] shadow-[var(--shadow-card)] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-[13px]">{order.customer_name ?? 'Cliente'}</p>
                      <span className="text-[11px] text-[var(--color-text-muted)]">{CHANNEL_LABELS[order.channel]}</span>
                      <span className="text-[11px] text-[var(--color-text-muted)] inline-flex items-center gap-0.5">
                        {order.delivery_type === 'delivery' ? <Bike size={10} /> : <Store size={10} />}
                        {order.delivery_type === 'delivery' ? 'Dom.' : 'Recoge'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                      {order.items?.map(i => `${i.quantity}× ${i.product?.flavor} ${i.product?.size}`).join(', ')}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <StatusBadge status={order.status} size="sm" />
                    <p className="text-[13px] font-semibold">{formatCOP(order.total)}</p>
                  </div>
                </div>
                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                  <div className="mt-2 pt-2 border-t border-[var(--color-border)] flex gap-2">
                    {getNextStatus(order.status) && (
                      <button
                        onClick={() => handleStatusChange(order.id, getNextStatus(order.status)!)}
                        className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-accent)] min-h-[44px] px-2"
                      >
                        <ChevronRight size={12} />
                        {getNextLabel(order.status)}
                      </button>
                    )}
                    <button
                      onClick={() => handleStatusChange(order.id, 'cancelled')}
                      className="ml-auto flex items-center gap-1 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] min-h-[44px] px-2"
                    >
                      <X size={12} />
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
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
