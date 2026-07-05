import { useEffect, useState } from 'react'
import { X, Bike, Store, Phone, ChevronRight, Ban, Clock, Pencil, Plus, Minus, Trash2, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { StatusBadge } from './StatusBadge'
import { Toast } from './Toast'
import { useProducts } from '../hooks/useProducts'
import { formatCOP, formatDateTime } from '../lib/utils'
import { STATUS_LABELS, CHANNEL_LABELS, NEXT_STATUS_ACTION, ORDER_STATUS_FLOW, SIZE_LABELS } from '../lib/constants'
import { updateOrderStatus, updateOrderItems, updateOrderFields } from '../hooks/useOrders'
import type { Order, OrderStatus, Product } from '../lib/types'

interface Props {
  orderId: string
  onClose: () => void
  onStatusChange?: () => void
}

interface EditItem {
  key: string
  product: Product
  quantity: number
  unit_price: number
}

// Items/quantities/prices can only be edited before stock is committed.
// updateOrderStatus adjusts inventory_finished on `ready` (+) and `dispatched` (−),
// so editing lines after `ready` would desync stock. Fields (domicilio, notas) stay
// editable in any non-terminal status.
const ITEM_EDITABLE_STATUSES: OrderStatus[] = ['confirmed', 'in_production']

export function OrderDrawer({ orderId, onClose, onStatusChange }: Props) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { products } = useProducts()

  // Edit mode
  const [editing, setEditing] = useState(false)
  const [editItems, setEditItems] = useState<EditItem[]>([])
  const [editDeliveryFee, setEditDeliveryFee] = useState(0)
  const [editDiscount, setEditDiscount] = useState(0)
  const [editDeliveryAddress, setEditDeliveryAddress] = useState('')
  const [editDeliveryDate, setEditDeliveryDate] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [productQuery, setProductQuery] = useState('')

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
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') { if (editing) setEditing(false); else onClose() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, editing])

  async function handleStatusChange(status: OrderStatus) {
    if (submitting || !order) return
    const prevStatus = order.status
    setSubmitting(true)
    setOrder(prev => prev ? { ...prev, status } : prev)
    try {
      await updateOrderStatus(orderId, status, order)
      setToast({ msg: `Estado: ${STATUS_LABELS[status]}`, type: 'success' })
      onStatusChange?.()
      if (status === 'cancelled' || status === 'delivered') onClose()
    } catch {
      setToast({ msg: 'Error al actualizar', type: 'error' })
      setOrder(prev => prev ? { ...prev, status: prevStatus } : prev)
    } finally {
      setSubmitting(false)
    }
  }

  function startEditing() {
    if (!order) return
    setEditItems(
      (order.items ?? []).map(it => ({
        key: it.id,
        product: it.product as Product,
        quantity: it.quantity,
        unit_price: it.unit_price,
      }))
    )
    setEditDeliveryFee(order.delivery_fee)
    setEditDiscount(order.discount)
    setEditDeliveryAddress(order.delivery_address ?? '')
    setEditDeliveryDate(order.delivery_date)
    setEditNotes(order.notes ?? '')
    setProductQuery('')
    setEditing(true)
  }

  const canEditItems = order ? ITEM_EDITABLE_STATUSES.includes(order.status) : false

  function changeQty(key: string, delta: number) {
    setEditItems(prev => prev
      .map(i => i.key === key ? { ...i, quantity: i.quantity + delta } : i)
      .filter(i => i.quantity > 0)
    )
  }

  function changePrice(key: string, value: number) {
    setEditItems(prev => prev.map(i => i.key === key ? { ...i, unit_price: Math.max(0, value) } : i))
  }

  function addProduct(product: Product) {
    setEditItems(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { key: `new-${product.id}-${prev.length}`, product, quantity: 1, unit_price: product.base_price }]
    })
    setProductQuery('')
  }

  const editSubtotal = editItems.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)
  const editTotal = editSubtotal + editDeliveryFee - editDiscount

  const productMatches = productQuery.trim().length >= 2
    ? products
        .filter(p => {
          const q = productQuery.toLowerCase()
          return (p.flavor?.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
        })
        .slice(0, 8)
    : []

  async function handleSave() {
    if (!order || saving) return
    if (editItems.length === 0) {
      setToast({ msg: 'El pedido debe tener al menos un producto', type: 'error' })
      return
    }
    if (!editDeliveryDate) {
      setToast({ msg: 'La fecha de entrega no puede quedar vacía', type: 'error' })
      return
    }
    const totalToSave = canEditItems ? editTotal : order.subtotal + editDeliveryFee - editDiscount
    if (totalToSave < 0) {
      setToast({ msg: 'El descuento no puede ser mayor que el total del pedido', type: 'error' })
      return
    }
    setSaving(true)
    try {
      if (canEditItems) {
        await updateOrderItems(
          orderId,
          editItems.map(i => ({ product_id: i.product.id, quantity: i.quantity, unit_price: i.unit_price })),
          {
            delivery_fee: editDeliveryFee,
            discount: editDiscount,
            notes: editNotes.trim() || null,
            delivery_address: editDeliveryAddress.trim() || null,
            delivery_date: editDeliveryDate,
          }
        )
      } else {
        // Items locked: only persist fields, recompute total from existing subtotal.
        const newTotal = order.subtotal + editDeliveryFee - editDiscount
        await updateOrderFields(orderId, {
          delivery_fee: editDeliveryFee,
          discount: editDiscount,
          notes: editNotes.trim() || null,
          delivery_address: editDeliveryAddress.trim() || null,
          delivery_date: editDeliveryDate,
          total: newTotal,
        })
      }
      // Refetch to reflect persisted state
      const { data } = await supabase
        .from('orders')
        .select(`*, items:order_items(*, product:products(*)), customer:customers(*)`)
        .eq('id', orderId)
        .single()
      setOrder(data)
      setEditing(false)
      setToast({ msg: 'Pedido actualizado', type: 'success' })
      onStatusChange?.()
    } catch (e) {
      setToast({ msg: e instanceof Error ? e.message : 'Error al guardar', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const action = order ? NEXT_STATUS_ACTION[order.status] : null
  const isTerminal = order?.status === 'delivered' || order?.status === 'cancelled'

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-enter" onClick={() => editing ? undefined : onClose()} />

      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[460px] bg-white shadow-[var(--shadow-drawer)] flex flex-col drawer-enter">
        {/* Header — RestoFlow modal: px-6 py-4 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            {editing ? 'Editar pedido' : 'Detalle del pedido'}
          </h2>
          <div className="flex items-center gap-1">
            {order && !isTerminal && !editing && (
              <button
                onClick={startEditing}
                className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-[var(--color-bg-hover)] rounded-md transition-colors duration-200 text-[var(--color-text-secondary)] text-xs font-medium"
                aria-label="Editar pedido"
              >
                <Pencil className="h-3.5 w-3.5" /> Editar
              </button>
            )}
            <button onClick={() => editing ? setEditing(false) : onClose()} className="p-1.5 hover:bg-[var(--color-bg-hover)] rounded-md transition-colors duration-200 text-[var(--color-text-muted)]" aria-label="Cerrar">
              <X className="h-4 w-4" />
            </button>
          </div>
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

              {editing ? (
                <div className="space-y-2.5">
                  <label className="block">
                    <span className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Fecha de entrega</span>
                    <input
                      type="date"
                      value={editDeliveryDate}
                      onChange={e => setEditDeliveryDate(e.target.value)}
                      className="mt-1 w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
                    />
                  </label>
                  {order.delivery_type === 'delivery' && (
                    <label className="block">
                      <span className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Dirección de entrega</span>
                      <textarea
                        placeholder="Dirección de entrega..."
                        value={editDeliveryAddress}
                        onChange={e => setEditDeliveryAddress(e.target.value)}
                        rows={2}
                        className="mt-1 w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)] resize-none"
                      />
                    </label>
                  )}
                </div>
              ) : (
                order.delivery_address && (
                  <p className="text-sm text-[var(--color-text-secondary)] bg-[var(--color-bg-hover)] rounded-lg px-3 py-2">
                    {order.delivery_address}
                  </p>
                )
              )}

              {(order.billing_name || order.billing_id_number || order.billing_email) && (
                <div className="border border-[var(--color-border)] rounded-lg px-3 py-2.5 space-y-0.5">
                  <p className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">Facturación</p>
                  {order.billing_name && <p className="text-sm font-medium">{order.billing_name}</p>}
                  {order.billing_id_number && <p className="text-sm text-[var(--color-text-secondary)]">{order.billing_id_number}</p>}
                  {order.billing_email && <p className="text-sm text-[var(--color-text-secondary)]">{order.billing_email}</p>}
                </div>
              )}
            </div>

            {/* Items */}
            <div className="px-6 py-4 border-t border-[var(--color-border)]">
              <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Productos</h3>

              {!editing ? (
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
              ) : (
                <div className="space-y-2">
                  {!canEditItems && (
                    <p className="text-[11px] text-[var(--color-warning-text)] bg-[var(--color-warning-bg)] rounded-md px-2.5 py-1.5">
                      El pedido ya está en preparación; los productos no se pueden cambiar. Podés editar domicilio y notas.
                    </p>
                  )}
                  {editItems.map(item => (
                    <div key={item.key} className="bg-[var(--color-bg)] rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium capitalize truncate">{item.product?.flavor || item.product?.name}</p>
                          <p className="text-[11px] text-[var(--color-text-muted)] capitalize">{SIZE_LABELS[item.product.size] ?? item.product.size}</p>
                        </div>
                        {canEditItems && (
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => changeQty(item.key, -1)} className="w-7 h-7 rounded-md border border-[var(--color-border)] bg-white flex items-center justify-center hover:border-[var(--color-text-muted)] transition-colors">
                              {item.quantity === 1 ? <Trash2 size={12} className="text-[var(--color-danger-text)]" /> : <Minus size={12} />}
                            </button>
                            <span className="w-5 text-center text-sm font-semibold">{item.quantity}</span>
                            <button onClick={() => changeQty(item.key, 1)} className="w-7 h-7 rounded-md border border-[var(--color-border)] bg-white flex items-center justify-center hover:border-[var(--color-text-muted)] transition-colors">
                              <Plus size={12} />
                            </button>
                          </div>
                        )}
                        {!canEditItems && <span className="text-sm font-semibold">{item.quantity}x</span>}
                      </div>
                      {canEditItems && (
                        <div className="flex items-center justify-between gap-2 mt-2">
                          <label className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
                            Precio c/u
                            <span className="text-[var(--color-text-muted)]">$</span>
                            <input
                              type="number"
                              min={0}
                              value={item.unit_price}
                              onChange={e => changePrice(item.key, parseInt(e.target.value || '0', 10))}
                              className="w-24 border border-[var(--color-border)] rounded-md px-2 py-1 text-sm tabular-nums focus:outline-none focus:border-[var(--color-accent)]"
                            />
                          </label>
                          <span className="text-sm font-medium tabular-nums">{formatCOP(item.quantity * item.unit_price)}</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {canEditItems && (
                    <div className="relative">
                      <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                        <input
                          type="text"
                          placeholder="Agregar producto..."
                          value={productQuery}
                          onChange={e => setProductQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 border border-dashed border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--color-accent)]"
                        />
                      </div>
                      {productMatches.length > 0 && (
                        <div className="absolute z-10 left-0 right-0 mt-1 border border-[var(--color-border)] rounded-lg bg-white shadow-lg divide-y divide-[var(--color-border)] max-h-[200px] overflow-y-auto">
                          {productMatches.map(p => (
                            <button key={p.id} onClick={() => addProduct(p)} className="w-full text-left px-3 py-2 hover:bg-[var(--color-bg)] transition-colors flex items-center justify-between gap-2">
                              <span className="text-sm capitalize truncate">{p.flavor || p.name} <span className="text-[var(--color-text-muted)]">· {SIZE_LABELS[p.size] ?? p.size}</span></span>
                              <span className="text-sm tabular-nums">{formatCOP(p.base_price)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="px-6 py-4 border-t border-[var(--color-border)] space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">Subtotal</span>
                <span className="tabular-nums">{formatCOP(editing ? (canEditItems ? editSubtotal : order.subtotal) : order.subtotal)}</span>
              </div>

              {editing ? (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[var(--color-text-muted)]">Domicilio</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[var(--color-text-muted)]">$</span>
                    <input
                      type="number"
                      min={0}
                      value={editDeliveryFee}
                      onChange={e => setEditDeliveryFee(Math.max(0, parseInt(e.target.value || '0', 10)))}
                      className="w-24 border border-[var(--color-border)] rounded-md px-2 py-1 text-sm tabular-nums text-right focus:outline-none focus:border-[var(--color-accent)]"
                    />
                  </div>
                </div>
              ) : (
                order.delivery_fee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--color-text-muted)]">Domicilio</span>
                    <span className="tabular-nums">{formatCOP(order.delivery_fee)}</span>
                  </div>
                )
              )}

              {editing ? (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[var(--color-text-muted)]">Descuento</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[var(--color-text-muted)]">$</span>
                    <input
                      type="number"
                      min={0}
                      value={editDiscount}
                      onChange={e => setEditDiscount(Math.max(0, parseInt(e.target.value || '0', 10)))}
                      className="w-24 border border-[var(--color-border)] rounded-md px-2 py-1 text-sm tabular-nums text-right focus:outline-none focus:border-[var(--color-accent)]"
                    />
                  </div>
                </div>
              ) : (
                order.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--color-text-muted)]">Descuento</span>
                    <span className="text-[var(--color-success-text)] tabular-nums">-{formatCOP(order.discount)}</span>
                  </div>
                )
              )}
              <div className="flex justify-between text-base font-semibold pt-2.5 border-t border-[var(--color-border)]">
                <span>Total</span>
                <span className="tabular-nums">
                  {formatCOP(editing ? (canEditItems ? editTotal : order.subtotal + editDeliveryFee - editDiscount) : order.total)}
                </span>
              </div>
            </div>

            {/* Notes */}
            {editing ? (
              <div className="px-6 py-4 border-t border-[var(--color-border)]">
                <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Notas / tarjeta</h3>
                <textarea
                  placeholder="Notas del pedido o mensaje de tarjeta..."
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)] resize-none"
                />
              </div>
            ) : (
              order.notes && (
                <div className="px-6 py-4 border-t border-[var(--color-border)]">
                  <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Notas</h3>
                  <p className="text-sm text-[var(--color-warning-text)] bg-[var(--color-warning-bg)] px-3 py-2 rounded-lg">
                    {order.notes}
                  </p>
                </div>
              )
            )}

            {/* Status progress */}
            {!editing && (
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
            )}
          </div>
        )}

        {/* Footer */}
        {order && editing ? (
          <div className="px-6 py-4 border-t border-[var(--color-border)] flex gap-2">
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-muted)] hover:border-[var(--color-text-primary)] hover:text-[var(--color-text-primary)] transition-colors duration-200 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || editItems.length === 0}
              className="flex-1 flex items-center justify-center gap-2 bg-[var(--color-accent)] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors duration-200 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        ) : (
          order && !isTerminal && (
            <div className="px-6 py-4 border-t border-[var(--color-border)] flex gap-2">
              {action && (
                <button
                  onClick={() => handleStatusChange(action.next)}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-[var(--color-accent)] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors duration-200 disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                  {submitting ? 'Actualizando...' : action.label}
                </button>
              )}
              <button
                onClick={() => handleStatusChange('cancelled')}
                disabled={submitting}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-muted)] hover:border-[var(--color-danger-text)] hover:text-[var(--color-danger-text)] transition-colors duration-200 disabled:opacity-50"
              >
                <Ban className="h-3.5 w-3.5" />
                Cancelar
              </button>
            </div>
          )
        )}
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}
