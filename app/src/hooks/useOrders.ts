import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Order } from '../lib/types'
import { today } from '../lib/utils'
import { adjustInventory } from './useInventory'

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

  const fetchOrders = useCallback(async () => {
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

export async function updateOrderStatus(
  orderId: string,
  status: Order['status'],
  order?: Order
) {
  // Adjust inventory BEFORE patching status so a missing-row 406 never leaves
  // DB and UI out of sync. Items with no inventory_finished row are skipped
  // with a warning — the status transition still completes.
  if (order?.items?.length) {
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

  if (order?.items?.length && status === 'cancelled' && (order.status === 'dispatched' || order.status === 'delivered')) {
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
