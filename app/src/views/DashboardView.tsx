import { useOrders } from '../hooks/useOrders'
import { useInventory } from '../hooks/useInventory'
import { StatusBadge } from '../components/StatusBadge'
import { formatCOP, formatDate, today, tomorrow } from '../lib/utils'
import { CHANNEL_LABELS, LOW_STOCK_THRESHOLD } from '../lib/constants'
import { AlertTriangle, TrendingUp, Package, Clock } from 'lucide-react'

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
    return <div className="text-[var(--color-text-secondary)] text-sm pt-8">Cargando...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
          {formatDate(today())}
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">Resumen del día</p>
      </div>

      {/* Alerts */}
      {lowStock.length > 0 && (
        <div className="bg-[var(--color-warning-light)] border border-[var(--color-warning)] rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-[var(--color-warning)] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-[var(--color-warning)]">Stock bajo</p>
            <p className="text-sm text-[var(--color-warning)] mt-1 opacity-80">
              {lowStock.map(i => `${i.product?.flavor} ${i.product?.size} (${i.quantity} uds)`).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Pedidos hoy" value={String(todayOrders.length)} icon={<ShoppingBagIcon />} />
        <StatCard label="Pendientes" value={String(pendingToday.length)} icon={<Clock size={16} />} highlight={pendingToday.length > 0} />
        <StatCard label="Venta del día" value={formatCOP(todayRevenue)} icon={<TrendingUp size={16} />} />
        <StatCard label="Para mañana" value={String(tomorrowOrders.length)} icon={<Package size={16} />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Today's orders */}
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
          <h2 className="font-medium text-sm text-[var(--color-text-primary)] mb-4">Pedidos de hoy</h2>
          {todayOrders.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">Sin pedidos para hoy</p>
          ) : (
            <div className="space-y-3">
              {todayOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                      {order.customer_name ?? 'Cliente'}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
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
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
          <h2 className="font-medium text-sm text-[var(--color-text-primary)] mb-4">Por canal</h2>
          {Object.keys(byChannel).length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">Sin datos aún</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(byChannel).map(([channel, count]) => (
                <div key={channel} className="flex items-center justify-between">
                  <span className="text-sm text-[var(--color-text-primary)]">
                    {CHANNEL_LABELS[channel as keyof typeof CHANNEL_LABELS] ?? channel}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-[var(--color-border)] rounded-full h-1.5">
                      <div
                        className="bg-[var(--color-accent)] rounded-full h-1.5"
                        style={{ width: `${(count / todayOrders.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-[var(--color-text-primary)] w-4 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tomorrow preview */}
      {tomorrowOrders.length > 0 && (
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
          <h2 className="font-medium text-sm text-[var(--color-text-primary)] mb-4">
            Para mañana — {formatDate(tomorrow())}
          </h2>
          <div className="space-y-3">
            {tomorrowOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{order.customer_name ?? 'Cliente'}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {order.items?.map(i => `${i.quantity}x ${i.product?.flavor} ${i.product?.size}`).join(', ')}
                  </p>
                </div>
                <span className="text-xs text-[var(--color-text-secondary)] flex-shrink-0">
                  {order.delivery_type === 'delivery' ? '🛵 Domicilio' : '🏪 Recoge'}
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
    <div className={`rounded-xl border p-4 ${highlight ? 'bg-[var(--color-warning-light)] border-[var(--color-warning)]' : 'bg-[var(--color-surface)] border-[var(--color-border)]'}`}>
      <div className="flex items-center gap-2 text-[var(--color-text-secondary)] mb-2">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-xl font-semibold text-[var(--color-text-primary)]">{value}</p>
    </div>
  )
}

function ShoppingBagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  )
}
