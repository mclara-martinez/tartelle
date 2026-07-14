import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { ProductionCheck } from '../lib/types'

// Checks de línea del plan de producción: cocina marca una línea (producto)
// del plan de una fecha como hecha. Check = fila existe; desmarcar = delete.
// Keyed a la fecha objetivo del plan (= fecha de entrega), igual que
// production_extras y production_counts.
export function useProductionChecks(date: string) {
  const [checks, setChecks] = useState<ProductionCheck[]>([])
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Only the latest request may write state — a fetch for an older date can
  // resolve after a newer one (see useOrders).
  const requestIdRef = useRef(0)

  const fetchChecks = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    const { data } = await supabase
      .from('production_checks')
      .select('*')
      .eq('date', date)
      .order('created_at')
    if (requestId !== requestIdRef.current) return
    setChecks(data ?? [])
    setLoading(false)
  }, [date])

  useEffect(() => {
    fetchChecks()

    const channel = supabase
      .channel(`production-checks-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_checks' }, () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => fetchChecks(), 400)
      })
      .subscribe()

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [fetchChecks])

  const checksByProduct = useMemo(() => {
    const map: Record<string, ProductionCheck> = {}
    for (const c of checks) map[c.product_id] = c
    return map
  }, [checks])

  const toggleCheck = useCallback(async (productId: string) => {
    const existing = checks.find(c => c.product_id === productId)
    if (existing) {
      const { error } = await supabase
        .from('production_checks')
        .delete()
        .eq('id', existing.id)
      if (error) throw new Error(error.message)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('production_checks').insert({
        date,
        product_id: productId,
        user_id: user?.id ?? null,
        user_email: user?.email ?? null,
      })
      if (error) throw new Error(error.message)
    }
    await fetchChecks()
  }, [checks, date, fetchChecks])

  return { checks, checksByProduct, loading, toggleCheck, refetch: fetchChecks }
}
