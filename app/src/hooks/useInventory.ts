import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { InventoryFinished, InventoryReason } from '../lib/types'

export function useInventory() {
  const [inventory, setInventory] = useState<InventoryFinished[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchInventory = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('inventory_finished')
      .select('*, product:products(*)')
      .order('product(flavor)')

    if (err) {
      setError(err.message)
    } else {
      setInventory(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchInventory()

    const channel = supabase
      .channel('inventory-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_finished' }, () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => fetchInventory(), 400)
      })
      .subscribe()

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [fetchInventory])

  return { inventory, loading, error, refetch: fetchInventory }
}

export async function adjustInventory(
  productId: string,
  change: number,
  reason: InventoryReason,
  referenceId?: string,
  notes?: string
) {
  // Update inventory_finished
  const { data: current, error: fetchErr } = await supabase
    .from('inventory_finished')
    .select('quantity')
    .eq('product_id', productId)
    .single()

  if (fetchErr) throw new Error(fetchErr.message)

  const newQty = Math.max(0, (current?.quantity ?? 0) + change)

  const { error: updateErr } = await supabase
    .from('inventory_finished')
    .update({ quantity: newQty, updated_at: new Date().toISOString() })
    .eq('product_id', productId)

  if (updateErr) throw new Error(updateErr.message)

  // Write to log
  const { error: logErr } = await supabase.from('inventory_log').insert({
    product_id: productId,
    change,
    reason,
    reference_id: referenceId ?? null,
    notes: notes ?? null,
  })

  if (logErr) throw new Error(logErr.message)
}
