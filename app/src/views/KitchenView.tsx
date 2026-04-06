import { useState } from 'react'
import { useOrders, updateOrderStatus } from '../hooks/useOrders'
import { Toast } from '../components/Toast'
import { today } from '../lib/utils'
import { STATUS_LABELS, NEXT_STATUS_ACTION } from '../lib/constants'
import { ArrowLeft, Bike, Store, Clock, CheckCircle, Truck, Play, AlertTriangle } from 'lucide-react'
import type { Order, OrderStatus } from '../lib/types'

interface Props {
  onBack: () => void
}

export function KitchenView({ onBack }: Props) {
  const { orders, loading, refetch } = useOrders(today())
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const active = orders.filter(o => !['delivered', 'cancelled'].includes(o.status))
  const done = orders.filter(o => o.status === 'delivered')

  async function handleAction(orderId: string, status: OrderStatus) {
    setUpdatingId(orderId)
    try {
      await updateOrderStatus(orderId, status)
      setToast({ msg: STATUS_LABELS[status], type: 'success' })
      refetch()
    } catch {
      setToast({ msg: 'Error', type: 'error' })
    }
    setUpdatingId(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111827] flex items-center justify-center">
        <p className="text-white text-xl">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#111827] flex flex-col">
      {/* Minimal top bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#1F2937] border-b border-[#374151]">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors" aria-label="Volver">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-white text-lg font-bold tracking-wide">COCINA</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-2xl font-bold text-white">{active.length}</span>
          <span className="text-sm text-gray-400">activos</span>
          {done.length > 0 && (
            <span className="text-sm text-gray-500 ml-2">{done.length} entregados</span>
          )}
        </div>
      </div>

      {/* Cards grid */}
      <div className="flex-1 p-4 overflow-y-auto">
        {active.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <CheckCircle size={64} className="text-green-500 mb-4" />
            <p className="text-white text-2xl font-bold">Todo listo</p>
            <p className="text-gray-400 text-lg mt-1">No hay pedidos pendientes</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {active.map(order => (
              <KitchenCard
                key={order.id}
                order={order}
                isUpdating={updatingId === order.id}
                onAction={handleAction}
              />
            ))}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

function KitchenCard({ order, isUpdating, onAction }: {
  order: Order
  isUpdating: boolean
  onAction: (orderId: string, status: OrderStatus) => void
}) {
  const action = NEXT_STATUS_ACTION[order.status]
  const isReady = order.status === 'ready'
  const isProduction = order.status === 'in_production'

  // Color scheme per status
  const borderColor = isReady ? '#10B981' : isProduction ? '#8B5CF6' : '#F59E0B'
  const statusBgColor = isReady ? '#064E3B' : isProduction ? '#4C1D95' : '#78350F'
  const statusTextColor = isReady ? '#6EE7B7' : isProduction ? '#C4B5FD' : '#FCD34D'

  // Action button config
  const actionConfig = action ? getActionConfig(order.status) : null

  return (
    <div
      className={`bg-[#1F2937] rounded-xl border-l-4 overflow-hidden ${isReady ? 'kitchen-card-ready' : ''}`}
      style={{ borderLeftColor: borderColor }}
    >
      {/* Card header */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-white text-xl font-bold truncate">{order.customer_name ?? 'Cliente'}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-gray-400 text-sm flex items-center gap-1">
              {order.delivery_type === 'delivery' ? (
                <><Bike size={14} className="text-orange-400" /> Domicilio</>
              ) : (
                <><Store size={14} className="text-blue-400" /> Local</>
              )}
            </span>
            {order.customer_phone && (
              <span className="text-gray-500 text-sm">{order.customer_phone}</span>
            )}
          </div>
        </div>
        <span
          className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full flex-shrink-0"
          style={{ backgroundColor: statusBgColor, color: statusTextColor }}
        >
          {STATUS_LABELS[order.status]}
        </span>
      </div>

      {/* Items — large and clear */}
      <div className="px-5 pb-3 space-y-1">
        {order.items?.map(item => (
          <div key={item.id} className="flex items-center justify-between">
            <span className="text-white text-lg font-semibold">
              {item.quantity}x {item.product?.flavor}
            </span>
            <span className="text-gray-400 text-base capitalize">{item.product?.size}</span>
          </div>
        ))}
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="mx-5 mb-3 bg-yellow-900/40 border border-yellow-600/30 rounded-lg px-3 py-2 flex items-start gap-2">
          <AlertTriangle size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
          <p className="text-yellow-200 text-sm">{order.notes}</p>
        </div>
      )}

      {/* ONE action button — full width, large, obvious */}
      {actionConfig && (
        <button
          onClick={() => onAction(order.id, action!.next)}
          disabled={isUpdating}
          className="w-full py-4 text-base font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          style={{
            backgroundColor: actionConfig.bgColor,
            color: actionConfig.textColor,
          }}
        >
          {actionConfig.icon}
          {action!.label}
        </button>
      )}
    </div>
  )
}

function getActionConfig(status: OrderStatus): { bgColor: string; textColor: string; icon: React.ReactNode } | null {
  switch (status) {
    case 'pending':
    case 'confirmed':
      return {
        bgColor: '#7C3AED',
        textColor: '#FFFFFF',
        icon: <Play size={18} />,
      }
    case 'in_production':
      return {
        bgColor: '#059669',
        textColor: '#FFFFFF',
        icon: <CheckCircle size={18} />,
      }
    case 'ready':
      return {
        bgColor: '#2563EB',
        textColor: '#FFFFFF',
        icon: <Truck size={18} />,
      }
    case 'dispatched':
      return {
        bgColor: '#374151',
        textColor: '#9CA3AF',
        icon: <Clock size={18} />,
      }
    default:
      return null
  }
}
