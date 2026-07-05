import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Customer } from '../lib/types'

export function useCustomerSearch() {
  const [results, setResults] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  // Only the latest search may write state — typing fast can make an older
  // query's response arrive after a newer one (see useOrders).
  const requestIdRef = useRef(0)

  const search = useCallback(async (query: string) => {
    const requestId = ++requestIdRef.current
    if (query.trim().length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('active', true)
        .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
        .order('name')
        .limit(8)
      if (requestId !== requestIdRef.current) return
      setResults(data ?? [])
    } catch {
      // Silently fail — customer search is a convenience, not a gate
      if (requestId !== requestIdRef.current) return
      setResults([])
    }
    setLoading(false)
  }, [])

  return { results, loading, search }
}

export function useRecentCustomers(limit = 5) {
  const [customers, setCustomers] = useState<Customer[]>([])

  useEffect(() => {
    async function fetch() {
      try {
        // Get distinct customer_ids from recent orders
        const { data: recentOrders } = await supabase
          .from('orders')
          .select('customer_id')
          .not('customer_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(50)

        if (!recentOrders?.length) return

        // Deduplicate customer_ids preserving order
        const seen = new Set<string>()
        const uniqueIds: string[] = []
        for (const o of recentOrders) {
          if (o.customer_id && !seen.has(o.customer_id)) {
            seen.add(o.customer_id)
            uniqueIds.push(o.customer_id)
            if (uniqueIds.length >= limit) break
          }
        }

        if (!uniqueIds.length) return

        const { data } = await supabase
          .from('customers')
          .select('*')
          .in('id', uniqueIds)
          .eq('active', true)

        // Reorder to match the uniqueIds order (most recent first)
        if (data) {
          const map = new Map(data.map(c => [c.id, c]))
          setCustomers(uniqueIds.map(id => map.get(id)).filter(Boolean) as Customer[])
        }
      } catch {
        // Silently fail — recent customers is a convenience
      }
    }
    fetch()
  }, [limit])

  return customers
}

export async function createCustomer(data: {
  name: string
  phone?: string | null
  address?: string | null
  email?: string | null
  cedula?: string | null
  nit?: string | null
  razon_social?: string | null
  type?: Customer['type']
}): Promise<Customer | null> {
  try {
    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        name: data.name,
        phone: data.phone ?? null,
        address: data.address ?? null,
        email: data.email ?? null,
        cedula: data.cedula ?? null,
        nit: data.nit ?? null,
        razon_social: data.razon_social ?? null,
        type: data.type ?? 'b2c',
      })
      .select()
      .single()

    if (error) throw error
    return customer
  } catch {
    // Return null if customer creation fails — order can still proceed without it
    return null
  }
}
