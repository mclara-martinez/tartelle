import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Order } from '../lib/types'
import { today, shiftDay } from '../lib/utils'
import { adjustInventory } from './useInventory'

// Pedidos activos con fecha de entrega anterior a `beforeDate` (ventana de 14
// días para no arrastrar pedidos viejos mal cerrados). Dos lecturas:
// - reservedByProduct: unidades en pedidos 'ready' sin despachar — están dentro
//   del conteo físico de cocina pero comprometidas; se muestran como hint al
//   digitar el conteo nocturno.
// - overdueCount: pedidos sin producir (pending/confirmed/in_production) con
//   fecha ya pasada — se alertan en el tab para que la operadora decida.
export function usePastActiveOrders(beforeDate: string) {
  const [reservedByProduct, setReservedByProduct] = useState<Record<string, number>>({})
  const [overdueCount, setOverdueCount] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchPast = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('id, status, delivery_date, items:order_items(product_id, quantity)')
      .gte('delivery_date', shiftDay(beforeDate, -14))
      .lt('delivery_date', beforeDate)
      .in('status', ['pending', 'confirmed', 'in_production', 'ready'])

    const reserved: Record<string, number> = {}
    let overdue = 0
    const t = today()
    for (const order of data ?? []) {
      if (order.status === 'ready') {
        for (const item of order.items ?? []) {
          reserved[item.product_id] = (reserved[item.product_id] ?? 0) + item.quantity
        }
      } else if (order.delivery_date < t) {
        overdue += 1
      }
    }
    setReservedByProduct(reserved)
    setOverdueCount(overdue)
  }, [beforeDate])

  useEffect(() => {
    fetchPast()

    const channel = supabase
      .channel(`past-orders-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => fetchPast(), 400)
      })
      .subscribe()

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [fetchPast])

  return { reservedByProduct, overdueCount }
}

export async function validateOrderStock(
  items: Array<{ product_id: string; requires_advance_order: boolean; flavor: string; size: string }>,
  deliveryDate: string
): Promise<Array<{ product_id: string; flavor: string; size: string }>> {
  const advanceItems = items.filter(i => i.requires_advance_order && deliveryDate === today())
  if (advanceItems.length === 0) return []

  const { data } = await supabase
    .from('inventory_finished')
    .select('product_id, quantity')
    .in('product_id', advanceItems.map(i => i.product_id))

  const stockMap = Object.fromEntries((data ?? []).map((s: { product_id: string; quantity: number }) => [s.product_id, s.quantity]))
  return advanceItems.filter(i => (stockMap[i.product_id] ?? 0) === 0)
}

export function useOrders(startDate?: string, endDate?: string) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Guards against out-of-order responses: a fetch for an older date range can
  // resolve after a newer one and overwrite its result. Only the latest request
  // is allowed to write state.
  const requestIdRef = useRef(0)

  const fetchOrders = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)
    const start = startDate ?? today()
    const end = endDate ?? start
    const { data, error: err } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items (
          *,
          product:products (*)
        ),
        customer:customers (*)
      `)
      .gte('delivery_date', start)
      .lte('delivery_date', end)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true })

    if (requestId !== requestIdRef.current) return

    if (err) {
      setError(err.message)
    } else {
      setOrders(data ?? [])
    }
    setLoading(false)
  }, [startDate, endDate])

  useEffect(() => {
    fetchOrders()

    const channel = supabase
      .channel(`orders-changes-${startDate ?? 'today'}-${endDate ?? ''}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => fetchOrders(), 400)
      })
      .subscribe()

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [fetchOrders])

  return { orders, loading, error, refetch: fetchOrders }
}

// Ajustes automáticos de inventory_finished desactivados hasta la fase de
// inventario: la tabla está vacía y sin mantenimiento, y el tab Producción
// ahora trabaja con conteos nocturnos por fecha (production_counts). Mientras
// esté en false, cambiar de estado un pedido no mueve stock.
const INVENTORY_SYNC_ENABLED: boolean = false

export async function updateOrderStatus(
  orderId: string,
  status: Order['status'],
  order?: Order
) {
  // Adjust inventory BEFORE patching status so a missing-row 406 never leaves
  // DB and UI out of sync. Items with no inventory_finished row are skipped
  // with a warning — the status transition still completes.
  if (INVENTORY_SYNC_ENABLED && order?.items?.length) {
    if (status === 'ready') {
      await Promise.all(
        order.items.map(item =>
          adjustInventory(item.product_id, item.quantity, 'production', orderId).catch(err => {
            console.warn(`[inventory] skipping adjustment for ${item.product_id}:`, err.message)
          })
        )
      )
    } else if (status === 'dispatched') {
      await Promise.all(
        order.items.map(item =>
          adjustInventory(item.product_id, -item.quantity, 'sale', orderId).catch(err => {
            console.warn(`[inventory] skipping adjustment for ${item.product_id}:`, err.message)
          })
        )
      )
    }
  }

  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
  if (error) throw new Error(error.message)

  if (INVENTORY_SYNC_ENABLED && order?.items?.length && status === 'cancelled' && (order.status === 'dispatched' || order.status === 'delivered')) {
    await Promise.all(
      order.items.map(item =>
        adjustInventory(item.product_id, item.quantity, 'adjustment', orderId, 'Cancelación de pedido')
      )
    )
  }
}

export async function updateOrderFields(orderId: string, fields: Partial<Order>) {
  const { error } = await supabase
    .from('orders')
    .update(fields)
    .eq('id', orderId)
  if (error) throw new Error(error.message)
}

// Edit an order's line items and recompute totals. Replaces the full set of
// order_items (delete + re-insert) and patches the order row. Only safe before
// the order reaches `ready` — at that point inventory_finished has already been
// adjusted per item by updateOrderStatus, so item edits would desync stock.
// The caller enforces that gate (canEditItems). delivery_fee, discount and notes
// are persisted alongside so a single save covers item + field edits.
export async function updateOrderItems(
  orderId: string,
  items: { product_id: string; quantity: number; unit_price: number }[],
  fields: {
    delivery_fee: number
    discount: number
    notes: string | null
    delivery_address: string | null
    delivery_date: string
  }
) {
  if (items.length === 0) throw new Error('El pedido debe tener al menos un producto')

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)
  const total = subtotal + fields.delivery_fee - fields.discount

  const { error: delErr } = await supabase.from('order_items').delete().eq('order_id', orderId)
  if (delErr) throw new Error(delErr.message)

  const rows = items.map(i => ({
    order_id: orderId,
    product_id: i.product_id,
    quantity: i.quantity,
    unit_price: i.unit_price,
    subtotal: i.quantity * i.unit_price,
  }))
  const { error: insErr } = await supabase.from('order_items').insert(rows)
  if (insErr) throw new Error(insErr.message)

  const { error: ordErr } = await supabase
    .from('orders')
    .update({
      subtotal,
      delivery_fee: fields.delivery_fee,
      discount: fields.discount,
      total,
      notes: fields.notes,
      delivery_address: fields.delivery_address,
      delivery_date: fields.delivery_date,
    })
    .eq('id', orderId)
  if (ordErr) throw new Error(ordErr.message)
}

export async function createOrder(order: Omit<Order, 'id' | 'created_at' | 'updated_at'>, items: { product_id: string; quantity: number; unit_price: number }[]) {
  const { data: newOrder, error: orderErr } = await supabase
    .from('orders')
    .insert(order)
    .select()
    .single()
  if (orderErr) throw new Error(orderErr.message)

  const orderItems = items.map(item => ({
    order_id: newOrder.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    subtotal: item.quantity * item.unit_price,
  }))

  const { error: itemsErr } = await supabase.from('order_items').insert(orderItems)
  if (itemsErr) {
    // Rollback the order
    await supabase.from('orders').delete().eq('id', newOrder.id)
    throw new Error(itemsErr.message)
  }

  return newOrder
}
