import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { ProductionCount } from '../lib/types'

// Conteo nocturno de producto terminado DISPONIBLE (neto), amarrado a la fecha
// de producción (t+1). La operadora digita el neto: conteo físico de cocina
// menos lo reservado a pedidos 'ready' sin entregar. Snapshot por fecha — las
// ventas del día siguiente no lo mueven; si algo cambia, se edita.
export function useProductionCounts(date: string) {
  const [counts, setCounts] = useState<ProductionCount[]>([])
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchCounts = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('production_counts')
      .select('*, product:products(*)')
      .eq('date', date)
      .order('created_at')

    setCounts(data ?? [])
    setLoading(false)
  }, [date])

  useEffect(() => {
    fetchCounts()

    const channel = supabase
      .channel(`production-counts-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_counts' }, () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => fetchCounts(), 400)
      })
      .subscribe()

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [fetchCounts])

  const upsertCount = useCallback(async (productId: string, quantity: number) => {
    const { error } = await supabase
      .from('production_counts')
      .upsert(
        { date, product_id: productId, quantity },
        { onConflict: 'date,product_id' }
      )
    if (error) throw new Error(error.message)
  }, [date])

  const removeCount = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('production_counts')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
    await fetchCounts()
  }, [fetchCounts])

  return { counts, loading, upsertCount, removeCount, refetch: fetchCounts }
}
