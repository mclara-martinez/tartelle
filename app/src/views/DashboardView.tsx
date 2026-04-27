import { useOrders } from '../hooks/useOrders'
import { useInventory } from '../hooks/useInventory'
import { StatusBadge } from '../components/StatusBadge'
import { formatCOP, formatDate, today, tomorrow } from '../lib/utils'
import { CHANNEL_LABELS, LOW_STOCK_THRESHOLD, SIZE_LABELS } from '../lib/constants'
import { AlertTriangle, TrendingUp, Package, Clock, Bike, Store, ShoppingBag, ArrowRight, LayoutDashboard, ChefHat, WifiOff } from 'lucide-react'
import type { View } from '../App'

interface Props {
  onNavigate: (v: View) => void
  onSelectOrder: (id: string) => void
}

export function DashboardView({ onNavigate, onSelectOrder }: Props) {
  const { orders: todayOrders, loading: loadingToday } = useOrders(today())
  const { orders: tomorrowOrders, loading: loadingTomorrow } = useOrders(tomorrow())
  const { inventory, loading: loadingInv } = useInventory()

  const lowStock = inventory.filter(
    i => i.quantity <= LOW_STOCK_THRESHOLD && i.product?.size !== 'other'
  )

  // Group low-stock items by flavor
  const lowStockByFlavor = lowStock.reduce<Record<string, typeof lowStock>>((acc, item) => {
    const flavor = item.product?.flavor ?? 'Otro'
    acc[flavor] = acc[flavor] ?? []
    acc[flavor].push(item)
    return acc
  }, {})
  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0)
  const activeOrders = todayOrders.filter(o => !['delivered', 'cancelled'].includes(o.status))
  const readyOrders = todayOrders.filter(o => o.status === 'ready')

  if (loadingToday || loadingTomorrow || loadingInv) {
    return <div className="text-[var(--color-text-muted)] text-sm pt-10">Cargando...</div>
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <LayoutDashboard className="h-6 w-6 text-[var(--color-text-secondary)]" strokeWidth={1.5} />
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Panel</h1>
          <p className="text-sm text-[var(--color-text-muted)]">{formatDate(today())}</p>
        </div>
      </div>

      {/* Low stock alerts */}
      {lowStock.length > 0 && (
        <div className="bg-white rounded-lg border border-[var(--color-warning-border,#FDE68A)] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--color-warning-border,#FDE68A)] bg-[var(--color-warning-bg)]">
            <AlertTriangle className="h-4 w-4 text-[var(--color-warning-text)] flex-shrink-0" />
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              Stock bajo — {lowStock.length} producto{lowStock.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="divide-y divide-[var(--color-border-light)]">
            {Object.entries(lowStockByFlavor).map(([flavor, items]) => (
              <div key={flavor} className="px-4 py-3">
                <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 capitalize">{flavor}</p>
                <div className="space-y-1.5">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm text-[var(--color-text-secondary)]">
                          {SIZE_LABELS[item.product?.size ?? 'other']}
                        </span>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded tabular-nums ${
                          item.quantity === 0
                            ? 'bg-red-100 text-red-700'
                            : 'bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]'
                        }`}>
                          {item.quantity === 0 ? 'Sin stock' : `${item.quantity} uds`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => onNavigate('kitchen')}
                          className="flex items-center gap-1 text-xs font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent-light)] px-2 py-1 rounded-md transition-colors"
                          title="Ir a cocina a producir"
                        >
                          <ChefHat className="h-3.5 w-3.5" />
                          Producir
                        </button>
                        <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-md">
                          <WifiOff className="h-3.5 w-3.5" />
                          Apagar Rappi
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score cards — RestoFlow: grid-cols-2 lg:grid-cols-4 gap-3, p-4 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ScoreCard label="Activos" value={String(activeOrders.length)} icon={<ShoppingBag className="h-4 w-4" />} />
        <ScoreCard label="Listos" value={String(readyOrders.length)} icon={<Package className="h-4 w-4" />} />
        <ScoreCard label="Venta del dia" value={formatCOP(todayRevenue)} icon={<TrendingUp className="h-4 w-4" />} />
        <ScoreCard label="Manana" value={String(tomorrowOrders.length)} icon={<Clock className="h-4 w-4" />} />
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active orders */}
        <section className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[var(--color-border)] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Pedidos activos</h2>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs text-[var(--color-accent)] font-medium flex items-center gap-1 hover:underline"
            >
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {activeOrders.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] px-4 py-8 text-center">Todo entregado</p>
          ) : (
            <div>
              {activeOrders.slice(0, 6).map((order, i) => (
                <button
                  key={order.id}
                  onClick={() => onSelectOrder(order.id)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[var(--color-bg-hover)] transition-colors duration-200 text-left ${
                    i > 0 ? 'border-t border-[var(--color-border-light)]' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{order.customer_name ?? 'Cliente'}</p>
                    <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1 mt-0.5">
                      {order.delivery_type === 'delivery' ? <Bike className="h-3 w-3" /> : <Store className="h-3 w-3" />}
                      {CHANNEL_LABELS[order.channel]} · {formatCOP(order.total)}
                    </p>
                  </div>
                  <StatusBadge status={order.status} size="sm" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Tomorrow preview */}
        <section className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Manana — {formatDate(tomorrow())}</h2>
          </div>
          {tomorrowOrders.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] px-4 py-8 text-center">Sin pedidos</p>
          ) : (
            <div>
              {tomorrowOrders.map((order, i) => (
                <div key={order.id} className={`flex items-center justify-between gap-3 px-4 py-2.5 ${
                  i > 0 ? 'border-t border-[var(--color-border-light)]' : ''
                }`}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{order.customer_name ?? 'Cliente'}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {order.items?.map(i => `${i.quantity}x ${i.product?.flavor}`).join(', ')}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0 flex items-center gap-1">
                    {order.delivery_type === 'delivery' ? <Bike className="h-3 w-3" /> : <Store className="h-3 w-3" />}
                    {formatCOP(order.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

/** RestoFlow ScoreCard: bg-white border rounded-lg p-4, icon h-4 w-4, value text-xl font-bold */
function ScoreCard({ label, value, icon }: {
  label: string; value: string; icon: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-lg border border-[var(--color-border)] p-4">
      <div className="flex items-center gap-2 text-[var(--color-text-muted)] mb-1">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="text-xl font-bold text-[var(--color-text-primary)]">{value}</p>
    </div>
  )
}
