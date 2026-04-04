import { useOrders, updateOrderStatus } from '../hooks/useOrders'
import { useInventory, adjustInventory } from '../hooks/useInventory'
import { Toast } from '../components/Toast'
import { StatusBadge } from '../components/StatusBadge'
import { formatCOP, today } from '../lib/utils'
import { LOW_STOCK_THRESHOLD } from '../lib/constants'
import { AlertTriangle, CheckCircle, Truck, Plus, Minus, Bike, Store, FileText } from 'lucide-react'
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
      setToast({ msg: 'Pedido despachado', type: 'success' })
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
    return <div className="text-[var(--color-text-secondary)] text-[13px] pt-8">Cargando...</div>
  }

  if (error) {
    return <div className="text-[13px] text-[var(--color-danger)] bg-[var(--color-danger-light)] rounded-md px-3 py-2">{error}</div>
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-0.5">Cocina</p>
        <h1 className="text-lg font-semibold">Vista cocina</h1>
        <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">
          {active.length} pendientes · {done.length} entregados
        </p>
      </div>

      {/* Low stock alerts */}
      {lowStock.length > 0 && (
        <div className="bg-[var(--color-danger-light)] border border-[var(--color-danger)] rounded-md p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle size={14} className="text-[var(--color-danger)]" />
            <p className="text-[13px] font-medium text-[var(--color-danger)]">Apagar en Rappi</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {lowStock.map(i => (
              <span key={i.id} className="text-[11px] bg-white border border-[var(--color-danger)] text-[var(--color-danger)] px-2 py-0.5 rounded font-medium">
                {i.product?.flavor} {i.product?.size} — {i.quantity}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active orders */}
        <div className="lg:col-span-2 space-y-2">
          {active.length === 0 ? (
            <div className="bg-white rounded-md border border-[var(--color-border)] shadow-[var(--shadow-card)] p-8 text-center">
              <CheckCircle size={22} className="mx-auto text-[var(--color-success)] mb-1.5" />
              <p className="text-[13px] text-[var(--color-text-secondary)]">Todo listo por ahora</p>
            </div>
          ) : (
            active.map(order => (
              <div key={order.id} className={`bg-white rounded-md border shadow-[var(--shadow-card)] p-3 ${
                order.status === 'ready' ? 'border-[var(--color-success)]' : 'border-[var(--color-border)]'
              }`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-[13px]">{order.customer_name ?? 'Cliente'}</p>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1">
                      {order.delivery_type === 'delivery' ? <><Bike size={11} />Domicilio</> : <><Store size={11} />Recoge</>}
                      {order.customer_phone && ` · ${order.customer_phone}`}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                {/* Items */}
                <div className="space-y-0.5 mb-3">
                  {order.items?.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-[13px]">
                      <span className="font-medium">{item.quantity}× {item.product?.flavor}</span>
                      <span className="text-[var(--color-text-muted)] capitalize text-[12px]">{item.product?.size}</span>
                    </div>
                  ))}
                  {order.notes && (
                    <p className="text-[11px] text-[var(--color-warning)] mt-1 bg-[var(--color-warning-light)] px-2 py-1 rounded flex items-start gap-1.5">
                      <FileText size={11} className="flex-shrink-0 mt-0.5" />
                      {order.notes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-[var(--color-border)]">
                  {order.status === 'in_production' && (
                    <button
                      onClick={() => handleReady(order.id)}
                      disabled={updatingId === order.id}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-[var(--color-success-light)] text-[var(--color-success)] border border-[var(--color-success)] py-1.5 rounded-md text-[12px] font-medium hover:bg-[#d5ebe0] disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle size={13} />
                      Listo
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button
                      onClick={() => handleDispatch(order.id)}
                      disabled={updatingId === order.id}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-[var(--color-accent)] text-white py-1.5 rounded-md text-[12px] font-medium hover:bg-[var(--color-teal-dark)] disabled:opacity-50 transition-colors"
                    >
                      <Truck size={13} />
                      Despachar
                    </button>
                  )}
                  {(order.status === 'pending' || order.status === 'confirmed') && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'in_production').then(refetch)}
                      className="flex-1 py-1.5 border border-[var(--color-border)] rounded-md text-[12px] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
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
        <div className="bg-white rounded-md border border-[var(--color-border)] shadow-[var(--shadow-card)] overflow-hidden h-fit">
          <div className="px-3 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
            <h2 className="font-medium text-[13px] text-[var(--color-text-primary)]">Inventario actual</h2>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {inventory.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-[var(--color-text-primary)] truncate">
                    {item.product?.flavor}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-muted)] capitalize">{item.product?.size}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleStock(item.product_id, -1)}
                    aria-label={`Reducir ${item.product?.flavor}`}
                    className="w-7 h-7 rounded border border-[var(--color-border)] flex items-center justify-center hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] transition-colors"
                    disabled={item.quantity === 0}
                  >
                    <Minus size={12} />
                  </button>
                  <span className={`text-[13px] font-semibold w-5 text-center ${
                    item.quantity <= LOW_STOCK_THRESHOLD ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-primary)]'
                  }`}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => handleStock(item.product_id, 1)}
                    aria-label={`Aumentar ${item.product?.flavor}`}
                    className="w-7 h-7 rounded border border-[var(--color-border)] flex items-center justify-center hover:border-[var(--color-success)] hover:text-[var(--color-success)] transition-colors"
                  >
                    <Plus size={12} />
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
          <p className="text-[11px] font-medium text-[var(--color-text-muted)] mb-1.5">Entregados hoy ({done.length})</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {done.map(order => (
              <div key={order.id} className="bg-white rounded border border-[var(--color-border)] p-2 opacity-60">
                <p className="text-[12px] font-medium truncate">{order.customer_name}</p>
                <p className="text-[11px] text-[var(--color-text-muted)]">{formatCOP(order.total)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
