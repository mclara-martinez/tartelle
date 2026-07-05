import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { InventoryFinished, InventoryLog, InventoryReason, Product } from '../lib/types'

export type ProductionLogEntry = InventoryLog & { product: Product | null }

export function useInventory() {
  const [inventory, setInventory] = useState<InventoryFinished[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Only the latest request may write state — prevents an older in-flight
  // response from overwriting a newer one (see useOrders).
  const requestIdRef = useRef(0)

  const fetchInventory = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('inventory_finished')
      .select('*, product:products(*)')
      .order('product(flavor)')

    if (requestId !== requestIdRef.current) return

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
      .channel(`inventory-changes-${Math.random().toString(36).slice(2)}`)
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

export function useProductionToday() {
  const [entries, setEntries] = useState<ProductionLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestIdRef = useRef(0)

  const fetch = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const { data } = await supabase
      .from('inventory_log')
      .select('*, product:products(id, sku, name, flavor, size, category, base_price, tax_type, requires_advance_order, catalog, active, created_at)')
      .eq('reason', 'production')
      .gte('created_at', startOfToday.toISOString())
      .order('created_at', { ascending: false })
    if (requestId !== requestIdRef.current) return
    setEntries((data as ProductionLogEntry[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
    const channel = supabase
      .channel(`production-log-today-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inventory_log' }, () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => fetch(), 400)
      })
      .subscribe()
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [fetch])

  return { entries, loading }
}

export async function adjustInventory(
  productId: string,
  change: number,
  reason: InventoryReason,
  referenceId?: string,
  notes?: string
) {
  const { data: { user } } = await supabase.auth.getUser()

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
    user_id: user?.id ?? null,
    user_email: user?.email ?? null,
  })

  if (logErr) throw new Error(logErr.message)
}
