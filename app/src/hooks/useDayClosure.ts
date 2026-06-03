import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { DayClosure } from '../lib/types'
import { today, dayRangeISO } from '../lib/utils'
import { SIZE_LABELS } from '../lib/constants'
import type { ProductSize } from '../lib/types'

export interface MovementRow {
  product_id: string
  product_name: string
  produced: number
  sold: number
}

export function useDayClosure(date: string = today()) {
  const [todayClosure, setTodayClosure] = useState<DayClosure | null>(null)
  const [movements, setMovements] = useState<MovementRow[]>([])
  const [inventoryMap, setInventoryMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)

    // 1. Check existing closure for this date
    const { data: closure } = await supabase
      .from('day_closures')
      .select('*')
      .eq('date', date)
      .maybeSingle()

    // 2. Today's inventory_log — only production and sale entries
    const { start, end } = dayRangeISO(date)

    const { data: logs } = await supabase
      .from('inventory_log')
      .select('product_id, change, reason, product:products(id, flavor, size, active)')
      .gte('created_at', start)
      .lte('created_at', end)
      .in('reason', ['production', 'sale'])

    // 3. Current inventory_finished
    const { data: inv } = await supabase
      .from('inventory_finished')
      .select('product_id, quantity')

    // Aggregate by product
    const agg: Record<string, { product_name: string; produced: number; sold: number }> = {}
    for (const log of logs ?? []) {
      const p = log.product as unknown as { id: string; flavor: string; size: string; active: boolean } | null
      if (!p?.active) continue
      if (!agg[log.product_id]) {
        const sizePart = p.size !== 'other' ? ` ${SIZE_LABELS[p.size as ProductSize] ?? p.size}` : ''
        agg[log.product_id] = { product_name: `${p.flavor}${sizePart}`, produced: 0, sold: 0 }
      }
      if (log.reason === 'production') agg[log.product_id].produced += log.change
      if (log.reason === 'sale') agg[log.product_id].sold += Math.abs(log.change)
    }

    const movementRows = Object.entries(agg)
      .filter(([, v]) => v.produced > 0 || v.sold > 0)
      .map(([product_id, v]) => ({ product_id, ...v }))

    const invMap: Record<string, number> = {}
    for (const item of inv ?? []) {
      invMap[item.product_id] = item.quantity
    }

    setTodayClosure((closure as DayClosure | null) ?? null)
    setMovements(movementRows)
    setInventoryMap(invMap)
    setLoading(false)
  }, [date])

  useEffect(() => { fetch() }, [fetch])

  return { todayClosure, movements, inventoryMap, loading, refetch: fetch }
}
