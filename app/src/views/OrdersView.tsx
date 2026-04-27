import { useState } from 'react'
import { useOrders, updateOrderStatus } from '../hooks/useOrders'
import { StatusBadge } from '../components/StatusBadge'
import { OrderDrawer } from '../components/OrderDrawer'
import { KanbanBoard } from '../components/KanbanBoard'
import { Toast } from '../components/Toast'
import { formatCOP, formatDate, today, tomorrow } from '../lib/utils'
import { CHANNEL_LABELS, NEXT_STATUS_ACTION, STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../lib/constants'
import type { Order, OrderStatus } from '../lib/types'
import type { View } from '../App'
import { Plus, List, Columns3, Bike, Store, ChevronRight, Search, X, ShoppingBag as PageIcon, Download, Calendar } from 'lucide-react'

type DatePreset = 'today' | 'tomorrow' | 'range'
type ViewMode = 'list' | 'kanban'

interface Props {
  onNavigate: (v: View) => void
  selectedOrderId: string | null
  onSelectOrder: (id: string | null) => void
}

function exportCSV(orders: Order[], label: string) {
  const headers = ['Fecha entrega', 'Cliente', 'Telefono', 'Canal', 'Entrega', 'Productos', 'Subtotal', 'Domicilio', 'Descuento', 'Total', 'Estado', 'Pago', 'Metodo pago']
  const rows = orders.map(o => [
    o.delivery_date,
    o.customer_name ?? '',
    o.customer_phone ?? '',
    CHANNEL_LABELS[o.channel],
    o.delivery_type === 'delivery' ? 'Domicilio' : 'Local',
    o.items?.map(i => `${i.quantity}x ${i.product?.flavor} ${i.product?.size}`).join(' | ') ?? '',
    o.subtotal,
    o.delivery_fee,
    o.discount,
    o.total,
    STATUS_LABELS[o.status],
    PAYMENT_STATUS_LABELS[o.payment_status],
    o.payment_method ?? '',
  ])
  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pedidos_${label}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function OrdersView({ onNavigate, selectedOrderId, onSelectOrder }: Props) {
  const [preset, setPreset] = useState<DatePreset>('today')
  const [rangeStart, setRangeStart] = useState(today())
  const [rangeEnd, setRangeEnd] = useState(today())
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const startDate = preset === 'today' ? today() : preset === 'tomorrow' ? tomorrow() : rangeStart
  const endDate = preset === 'today' ? today() : preset === 'tomorrow' ? tomorrow() : rangeEnd

  const { orders, loading, error, refetch } = useOrders(startDate, endDate)

  const filteredOrders = searchQuery.trim()
    ? orders.filter(o => o.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    : orders

  const csvLabel = preset === 'range' ? `${rangeStart}_${rangeEnd}` : preset === 'today' ? today() : tomorrow()

  async function handleStatusChange(orderId: string, status: OrderStatus) {
    try {
      await updateOrderStatus(orderId, status)
      setToast({ msg: 'Estado actualizado', type: 'success' })
      refetch()
    } catch {
      setToast({ msg: 'Error al actualizar', type: 'error' })
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <PageIcon className="h-6 w-6 text-[var(--color-text-secondary)]" strokeWidth={1.5} />
          <div>
            <h1 className="text-xl font-bold">Pedidos</h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              {preset === 'range'
                ? `${formatDate(rangeStart)} — ${formatDate(rangeEnd)}`
                : formatDate(startDate)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportCSV(filteredOrders, csvLabel)}
            disabled={filteredOrders.length === 0}
            className="flex items-center gap-1.5 border border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] px-3 py-2 rounded-lg text-sm font-medium hover:bg-[var(--color-surface-warm)] transition-colors duration-200 disabled:opacity-40"
            title="Exportar CSV"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button
            onClick={() => onNavigate('create')}
            className="flex items-center gap-1.5 bg-[var(--color-accent)] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors duration-200"
          >
            <Plus className="h-4 w-4" />
            Nuevo pedido
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Date preset tabs */}
        <div className="flex bg-[var(--color-surface-warm)] p-0.5 rounded-lg">
          {(['today', 'tomorrow', 'range'] as DatePreset[]).map(p => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 flex items-center gap-1.5 ${
                preset === p
                  ? 'bg-white text-[var(--color-text-primary)] shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {p === 'range' && <Calendar className="h-3.5 w-3.5" />}
              {p === 'today' ? 'Hoy' : p === 'tomorrow' ? 'Manana' : 'Rango'}
            </button>
          ))}
        </div>

        {/* Date range inputs — only when range preset is active */}
        {preset === 'range' && (
          <div className="flex items-center gap-2 bg-white border border-[var(--color-border)] rounded-lg px-3 py-1.5">
            <input
              type="date"
              value={rangeStart}
              max={rangeEnd}
              onChange={e => setRangeStart(e.target.value)}
              className="text-sm text-[var(--color-text-primary)] bg-transparent outline-none"
            />
            <span className="text-[var(--color-text-muted)] text-sm">—</span>
            <input
              type="date"
              value={rangeEnd}
              min={rangeStart}
              onChange={e => setRangeEnd(e.target.value)}
              className="text-sm text-[var(--color-text-primary)] bg-transparent outline-none"
            />
          </div>
        )}

        <div className="flex bg-[var(--color-surface-warm)] p-0.5 rounded-lg">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-colors duration-200 ${viewMode === 'list' ? 'bg-white shadow-sm text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'}`}
            aria-label="Vista lista"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`p-1.5 rounded-md transition-colors duration-200 ${viewMode === 'kanban' ? 'bg-white shadow-sm text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'}`}
            aria-label="Vista kanban"
          >
            <Columns3 className="h-4 w-4" />
          </button>
        </div>

        <div className="relative flex-1 max-w-[240px]">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/15 transition-colors duration-200"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <span className="text-xs text-[var(--color-text-muted)] tabular-nums">
          {filteredOrders.length} pedido{filteredOrders.length !== 1 ? 's' : ''}
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-[var(--color-danger-text)] bg-[var(--color-danger-bg)] rounded-lg p-3">
          Error cargando pedidos: {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-[var(--color-text-muted)] pt-4">Cargando pedidos...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-lg border border-[var(--color-border)] py-12 text-center">
          <p className="text-[var(--color-text-muted)] text-sm">
            {searchQuery ? 'Sin resultados' : 'Sin pedidos para este periodo'}
          </p>
        </div>
      ) : viewMode === 'kanban' ? (
        <KanbanBoard orders={filteredOrders} onSelectOrder={(id) => onSelectOrder(id)} onStatusChange={handleStatusChange} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
            <div className="grid grid-cols-[1fr_90px_80px_90px_120px_50px] px-4 py-2.5 border-b border-[var(--color-border)] text-left font-medium text-[var(--color-text-muted)]">
              <span className="text-sm">Cliente</span>
              <span className="text-sm">Canal</span>
              <span className="text-sm">Entrega</span>
              <span className="text-sm text-right">Total</span>
              <span className="text-sm">Estado</span>
              <span></span>
            </div>
            {filteredOrders.map((order, i) => {
              const action = NEXT_STATUS_ACTION[order.status]
              const isTerminal = order.status === 'delivered' || order.status === 'cancelled'
              return (
                <div
                  key={order.id}
                  className={`grid grid-cols-[1fr_90px_80px_90px_120px_50px] px-4 py-2.5 items-center group hover:bg-[var(--color-bg-hover)] transition-colors duration-200 cursor-pointer ${
                    i > 0 ? 'border-t border-[var(--color-border-light)]' : ''
                  }`}
                  onClick={() => onSelectOrder(order.id)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{order.customer_name ?? 'Cliente'}</p>
                    <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                      {order.items?.map(i => `${i.quantity}x ${i.product?.flavor}`).join(', ')}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--color-text-secondary)]">{CHANNEL_LABELS[order.channel]}</span>
                  <span className="text-xs text-[var(--color-text-secondary)] inline-flex items-center gap-1">
                    {order.delivery_type === 'delivery' ? <Bike className="h-3 w-3" /> : <Store className="h-3 w-3" />}
                    {order.delivery_type === 'delivery' ? 'Dom.' : 'Local'}
                  </span>
                  <span className="text-sm font-medium text-right tabular-nums">{formatCOP(order.total)}</span>
                  <StatusBadge status={order.status} size="sm" />
                  {!isTerminal && action && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleStatusChange(order.id, action.next) }}
                      className="opacity-0 group-hover:opacity-100 text-[var(--color-accent)] hover:bg-[var(--color-accent-light)] p-1 rounded-md transition-all"
                      title={action.label}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filteredOrders.map(order => {
              const action = NEXT_STATUS_ACTION[order.status]
              const isTerminal = order.status === 'delivered' || order.status === 'cancelled'
              return (
                <div
                  key={order.id}
                  className="bg-white rounded-lg border border-[var(--color-border)] p-4 cursor-pointer active:bg-[var(--color-bg-active)]"
                  onClick={() => onSelectOrder(order.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{order.customer_name ?? 'Cliente'}</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {CHANNEL_LABELS[order.channel]} · {order.items?.map(i => `${i.quantity}x ${i.product?.flavor}`).join(', ')}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <StatusBadge status={order.status} size="sm" />
                      <p className="text-sm font-semibold tabular-nums">{formatCOP(order.total)}</p>
                    </div>
                  </div>
                  {!isTerminal && action && (
                    <div className="mt-2.5 pt-2.5 border-t border-[var(--color-border-light)]">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStatusChange(order.id, action.next) }}
                        className="flex items-center gap-1 text-xs font-medium text-[var(--color-accent)] min-h-[44px] px-1"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                        {action.label}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {selectedOrderId && (
        <OrderDrawer orderId={selectedOrderId} onClose={() => onSelectOrder(null)} onStatusChange={refetch} />
      )}
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
