import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { today } from '../lib/utils'
import type { Order } from '../lib/types'

// Pedidos con fecha de entrega pasada que nunca se cerraron (ni delivered ni cancelled).
// Sin canal realtime: se refresca al montar y vía refetch tras cambios de estado.
export function useOverdueOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items (
          *,
          product:products (*)
        ),
        customer:customers (*)
      `)
      .lt('delivery_date', today())
      .not('status', 'in', '(delivered,cancelled)')
      .order('delivery_date', { ascending: true })
    setOrders(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { refetch() }, [refetch])

  return { orders, loading, refetch }
}
