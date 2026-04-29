import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { ProductionExtra } from '../lib/types'

export function useProductionExtras(date: string) {
  const [extras, setExtras] = useState<ProductionExtra[]>([])
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchExtras = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('production_extras')
      .select('*, product:products(*)')
      .eq('date', date)
      .order('created_at')

    setExtras(data ?? [])
    setLoading(false)
  }, [date])

  useEffect(() => {
    fetchExtras()

    const channel = supabase
      .channel(`production-extras-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_extras' }, () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => fetchExtras(), 400)
      })
      .subscribe()

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [fetchExtras])

  const upsertExtra = useCallback(async (productId: string, quantity: number, notes?: string) => {
    const { error } = await supabase
      .from('production_extras')
      .upsert(
        { date, product_id: productId, quantity, notes: notes ?? null },
        { onConflict: 'date,product_id' }
      )
    if (error) throw new Error(error.message)
    await fetchExtras()
  }, [date, fetchExtras])

  const removeExtra = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('production_extras')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
    await fetchExtras()
  }, [fetchExtras])

  return { extras, loading, upsertExtra, removeExtra, refetch: fetchExtras }
}
