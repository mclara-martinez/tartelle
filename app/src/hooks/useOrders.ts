import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Order } from '../lib/types'
import { today } from '../lib/utils'

export function useOrders(date?: string) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    const targetDate = date ?? today()
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
      .eq('delivery_date', targetDate)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true })

    if (err) {
      setError(err.message)
    } else {
      setOrders(data ?? [])
    }
    setLoading(false)
  }, [date])

  useEffect(() => {
    fetchOrders()

    const channel = supabase
      .channel(`orders-changes-${date ?? 'today'}`)
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

export async function updateOrderStatus(orderId: string, status: Order['status']) {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
  if (error) throw new Error(error.message)
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
