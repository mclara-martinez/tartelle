import { useOrders } from '../hooks/useOrders'
import { useInventory } from '../hooks/useInventory'
import { StatusBadge } from '../components/StatusBadge'
import { formatCOP, formatDate, today, tomorrow } from '../lib/utils'
import { CHANNEL_LABELS, LOW_STOCK_THRESHOLD } from '../lib/constants'
import { AlertTriangle, TrendingUp, Package, Clock, Bike, Store } from 'lucide-react'

export function DashboardView() {
  const { orders: todayOrders, loading: loadingToday } = useOrders(today())
  const { orders: tomorrowOrders, loading: loadingTomorrow } = useOrders(tomorrow())
  const { inventory, loading: loadingInv } = useInventory()

  const lowStock = inventory.filter(i => i.quantity <= LOW_STOCK_THRESHOLD)
  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0)
  const pendingToday = todayOrders.filter(o => !['delivered', 'cancelled'].includes(o.status))

  const byChannel = todayOrders.reduce<Record<string, number>>((acc, o) => {
    acc[o.channel] = (acc[o.channel] ?? 0) + 1
    return acc
  }, {})

  if (loadingToday || loadingTomorrow || loadingInv) {
    return <div className="text-[var(--color-text-secondary)] text-[13px] pt-8">Cargando...</div>
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-0.5">Resumen</p>
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
          {formatDate(today())}
        </h1>
      </div>

      {/* Alerts */}
      {lowStock.length > 0 && (
        <div className="bg-[var(--color-warning-light)] border border-[var(--color-warning)] rounded-md p-3 flex items-start gap-2.5">
          <AlertTriangle size={15} className="text-[var(--color-warning)] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[13px] font-medium text-[var(--color-warning)]">Stock bajo</p>
            <p className="text-[12px] text-[var(--color-warning)] mt-0.5 opacity-80">
              {lowStock.map(i => `${i.product?.flavor} ${i.product?.size} (${i.quantity})`).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Pedidos hoy" value={String(todayOrders.length)} icon={<ShoppingBagIcon />} />
        <StatCard label="Pendientes" value={String(pendingToday.length)} icon={<Clock size={15} />} highlight={pendingToday.length > 0} />
        <StatCard label="Venta del día" value={formatCOP(todayRevenue)} icon={<TrendingUp size={15} />} />
        <StatCard label="Para mañana" value={String(tomorrowOrders.length)} icon={<Package size={15} />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today's orders */}
        <div className="bg-white rounded-md border border-[var(--color-border)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
            <h2 className="font-medium text-[13px] text-[var(--color-text-primary)]">Pedidos de hoy</h2>
          </div>
          {todayOrders.length === 0 ? (
            <p className="text-[13px] text-[var(--color-text-secondary)] px-4 py-4">Sin pedidos para hoy</p>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {todayOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between gap-2 px-4 py-2 hover:bg-[var(--color-bg)] transition-colors">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">
                      {order.customer_name ?? 'Cliente'}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      {CHANNEL_LABELS[order.channel]} · {formatCOP(order.total)}
                    </p>
                  </div>
                  <StatusBadge status={order.status} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By channel */}
        <div className="bg-white rounded-md border border-[var(--color-border)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
            <h2 className="font-medium text-[13px] text-[var(--color-text-primary)]">Por canal</h2>
          </div>
          {Object.keys(byChannel).length === 0 ? (
            <p className="text-[13px] text-[var(--color-text-secondary)] px-4 py-4">Sin datos aún</p>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {Object.entries(byChannel).map(([channel, count]) => (
                <div key={channel} className="flex items-center justify-between px-4 py-2">
                  <span className="text-[13px] text-[var(--color-text-primary)]">
                    {CHANNEL_LABELS[channel as keyof typeof CHANNEL_LABELS] ?? channel}
                  </span>
                  <div className="flex items-center gap-2.5">
                    <div className="w-20 bg-[var(--color-border)] rounded-full h-1">
                      <div
                        className="bg-[var(--color-accent)] rounded-full h-1"
                        style={{ width: `${(count / todayOrders.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-[13px] font-medium text-[var(--color-text-primary)] w-4 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tomorrow preview */}
      {tomorrowOrders.length > 0 && (
        <div className="bg-white rounded-md border border-[var(--color-border)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
            <h2 className="font-medium text-[13px] text-[var(--color-text-primary)]">
              Para mañana — {formatDate(tomorrow())}
            </h2>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {tomorrowOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between gap-2 px-4 py-2 hover:bg-[var(--color-bg)] transition-colors">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium truncate">{order.customer_name ?? 'Cliente'}</p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    {order.items?.map(i => `${i.quantity}x ${i.product?.flavor} ${i.product?.size}`).join(', ')}
                  </p>
                </div>
                <span className="text-[11px] text-[var(--color-text-muted)] flex-shrink-0 inline-flex items-center gap-1">
                  {order.delivery_type === 'delivery' ? <><Bike size={10} />Dom.</> : <><Store size={10} />Recoge</>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon, highlight }: {
  label: string; value: string; icon: React.ReactNode; highlight?: boolean
}) {
  return (
    <div className={`rounded-md border p-3 shadow-[var(--shadow-card)] ${highlight ? 'bg-[var(--color-warning-light)] border-[var(--color-warning)]' : 'bg-white border-[var(--color-border)]'}`}>
      <div className="flex items-center gap-1.5 text-[var(--color-text-muted)] mb-1.5">
        {icon}
        <span className="text-[11px]">{label}</span>
      </div>
      <p className="text-lg font-semibold text-[var(--color-text-primary)]">{value}</p>
    </div>
  )
}

function ShoppingBagIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  )
}
