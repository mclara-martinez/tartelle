import { formatCOP } from '../lib/utils'
import { KANBAN_COLUMNS, STATUS_COLORS, NEXT_STATUS_ACTION } from '../lib/constants'
import { Bike, Store, ChevronRight } from 'lucide-react'
import type { Order, OrderStatus } from '../lib/types'

interface Props {
  orders: Order[]
  onSelectOrder: (id: string) => void
  onStatusChange: (orderId: string, status: OrderStatus) => void
}

export function KanbanBoard({ orders, onSelectOrder, onStatusChange }: Props) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2" style={{ minHeight: 'calc(100vh - 220px)' }}>
      {KANBAN_COLUMNS.map(col => {
        const colOrders = orders.filter(o => o.status === col.status)
        const colors = STATUS_COLORS[col.status]
        return (
          <div key={col.status} className="flex-shrink-0 w-[260px] flex flex-col">
            <div className="flex items-center gap-2 px-2 py-2 mb-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.dot }} />
              <span className="text-sm font-medium text-[var(--color-text-primary)]">{col.label}</span>
              <span className="text-xs text-[var(--color-text-muted)] ml-auto tabular-nums">{colOrders.length}</span>
            </div>

            <div className="flex-1 space-y-2 kanban-scroll overflow-y-auto px-0.5">
              {colOrders.length === 0 ? (
                <div className="border border-dashed border-[var(--color-border)] rounded-lg p-6 text-center">
                  <p className="text-xs text-[var(--color-text-muted)]">Sin pedidos</p>
                </div>
              ) : (
                colOrders.map(order => (
                  <KanbanCard
                    key={order.id}
                    order={order}
                    onSelect={() => onSelectOrder(order.id)}
                    onAdvance={() => {
                      const action = NEXT_STATUS_ACTION[order.status]
                      if (action) onStatusChange(order.id, action.next)
                    }}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function KanbanCard({ order, onSelect, onAdvance }: {
  order: Order
  onSelect: () => void
  onAdvance: () => void
}) {
  const action = NEXT_STATUS_ACTION[order.status]
  const colors = STATUS_COLORS[order.status]

  return (
    <div
      className="bg-white rounded-lg border border-[var(--color-border)] p-3 cursor-pointer hover:bg-[var(--color-bg-hover)] transition-colors duration-200 group"
      style={{ borderLeftWidth: 3, borderLeftColor: colors.dot }}
      onClick={onSelect}
    >
      <p className="text-sm font-medium truncate">{order.customer_name ?? 'Cliente'}</p>
      <p className="text-xs text-[var(--color-text-muted)] mt-1 line-clamp-2">
        {order.items?.map(i => `${i.quantity}x ${i.product?.flavor}`).join(', ')}
      </p>

      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[var(--color-border-light)]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-0.5">
            {order.delivery_type === 'delivery' ? <Bike className="h-3 w-3" /> : <Store className="h-3 w-3" />}
            {order.delivery_type === 'delivery' ? 'Dom.' : 'Local'}
          </span>
          <span className="text-xs font-medium tabular-nums">{formatCOP(order.total)}</span>
        </div>
        {action && (
          <button
            onClick={(e) => { e.stopPropagation(); onAdvance() }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-md transition-all hover:bg-[var(--color-accent-light)]"
            style={{ color: colors.dot }}
            title={action.label}
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>

      {order.notes && (
        <p className="mt-1.5 text-xs text-[var(--color-warning-text)] bg-[var(--color-warning-bg)] px-2 py-0.5 rounded truncate">
          {order.notes}
        </p>
      )}
    </div>
  )
}
