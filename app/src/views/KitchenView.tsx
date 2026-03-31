import { useOrders, updateOrderStatus } from '../hooks/useOrders'
import { useInventory, adjustInventory } from '../hooks/useInventory'
import { Toast } from '../components/Toast'
import { StatusBadge } from '../components/StatusBadge'
import { formatCOP, today } from '../lib/utils'
import { LOW_STOCK_THRESHOLD } from '../lib/constants'
import { AlertTriangle, CheckCircle, Truck, Plus, Minus } from 'lucide-react'
import { useState } from 'react'

export function KitchenView() {
  const { orders, loading, error, refetch } = useOrders(today())
  const { inventory, loading: loadingInv, refetch: refetchInv } = useInventory()
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const active = orders.filter(o => !['delivered', 'cancelled'].includes(o.status))
  const done = orders.filter(o => o.status === 'delivered')
  const lowStock = inventory.filter(i => i.quantity <= LOW_STOCK_THRESHOLD)

  async function handleDispatch(orderId: string) {
    setUpdatingId(orderId)
    try {
      await updateOrderStatus(orderId, 'dispatched')
      setToast({ msg: '✓ Pedido despachado — notifica al cliente', type: 'success' })
      refetch()
    } catch {
      setToast({ msg: 'Error al actualizar', type: 'error' })
    }
    setUpdatingId(null)
  }

  async function handleReady(orderId: string) {
    setUpdatingId(orderId)
    try {
      await updateOrderStatus(orderId, 'ready')
      setToast({ msg: 'Pedido marcado como listo', type: 'success' })
      refetch()
    } catch {
      setToast({ msg: 'Error al actualizar', type: 'error' })
    }
    setUpdatingId(null)
  }

  async function handleStock(productId: string, change: number) {
    try {
      await adjustInventory(productId, change, 'production')
      refetchInv()
    } catch {
      setToast({ msg: 'Error al actualizar inventario', type: 'error' })
    }
  }

  if (loading || loadingInv) {
    return <div className="text-[var(--color-text-secondary)] text-sm pt-8">Cargando...</div>
  }

  if (error) {
    return <div className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-light)] rounded-lg px-4 py-3">{error}</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Vista cocina</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
          {active.length} pendientes · {done.length} entregados
        </p>
      </div>

      {/* Low stock alerts */}
      {lowStock.length > 0 && (
        <div className="bg-[var(--color-danger-light)] border border-[var(--color-danger)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={15} className="text-[var(--color-danger)]" />
            <p className="text-sm font-medium text-[var(--color-danger)]">Apagar en Rappi</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map(i => (
              <span key={i.id} className="text-xs bg-white border border-[var(--color-danger)] text-[var(--color-danger)] px-2.5 py-1 rounded-full font-medium">
                {i.product?.flavor} {i.product?.size} — {i.quantity} uds
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active orders */}
        <div className="lg:col-span-2 space-y-3">
          {active.length === 0 ? (
            <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-10 text-center">
              <CheckCircle size={24} className="mx-auto text-[var(--color-success)] mb-2" />
              <p className="text-sm text-[var(--color-text-secondary)]">Todo listo por ahora</p>
            </div>
          ) : (
            active.map(order => (
              <div key={order.id} className={`bg-[var(--color-surface)] rounded-xl border p-4 ${
                order.status === 'ready' ? 'border-[var(--color-success)]' : 'border-[var(--color-border)]'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-[var(--color-text-primary)]">{order.customer_name ?? 'Cliente'}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                      {order.delivery_type === 'delivery' ? '🛵 Domicilio' : '🏪 Recoge'}
                      {order.customer_phone && ` · ${order.customer_phone}`}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                {/* Items */}
                <div className="space-y-1 mb-4">
                  {order.items?.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.quantity}× {item.product?.flavor}</span>
                      <span className="text-[var(--color-text-secondary)] capitalize">{item.product?.size}</span>
                    </div>
                  ))}
                  {order.notes && (
                    <p className="text-xs text-[var(--color-warning)] mt-1 bg-[var(--color-warning-light)] px-2.5 py-1.5 rounded-lg">
                      📝 {order.notes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-[var(--color-border)]">
                  {order.status === 'in_production' && (
                    <button
                      onClick={() => handleReady(order.id)}
                      disabled={updatingId === order.id}
                      className="flex-1 flex items-center justify-center gap-2 bg-[var(--color-success-light)] text-[var(--color-success)] border border-[var(--color-success)] py-2 rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity"
                    >
                      <CheckCircle size={14} />
                      Listo
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button
                      onClick={() => handleDispatch(order.id)}
                      disabled={updatingId === order.id}
                      className="flex-1 flex items-center justify-center gap-2 bg-[var(--color-accent)] text-white py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      <Truck size={14} />
                      Despachar
                    </button>
                  )}
                  {(order.status === 'pending' || order.status === 'confirmed') && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'in_production').then(refetch)}
                      className="flex-1 py-2 border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
                    >
                      Iniciar
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Inventory panel */}
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5 h-fit">
          <h2 className="font-medium text-sm text-[var(--color-text-primary)] mb-4">Inventario actual</h2>
          <div className="space-y-3">
            {inventory.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">
                    {item.product?.flavor}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] capitalize">{item.product?.size}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleStock(item.product_id, -1)}
                    className="w-6 h-6 rounded-md border border-[var(--color-border)] flex items-center justify-center hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] transition-colors"
                    disabled={item.quantity === 0}
                  >
                    <Minus size={10} />
                  </button>
                  <span className={`text-sm font-semibold w-5 text-center ${
                    item.quantity <= LOW_STOCK_THRESHOLD ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-primary)]'
                  }`}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => handleStock(item.product_id, 1)}
                    className="w-6 h-6 rounded-md border border-[var(--color-border)] flex items-center justify-center hover:border-[var(--color-success)] hover:text-[var(--color-success)] transition-colors"
                  >
                    <Plus size={10} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Delivered */}
      {done.length > 0 && (
        <div>
          <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">Entregados hoy ({done.length})</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {done.map(order => (
              <div key={order.id} className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-3 opacity-60">
                <p className="text-sm font-medium truncate">{order.customer_name}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">{formatCOP(order.total)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
