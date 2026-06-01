import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { today } from '../lib/utils'
import type { QualityLog } from '../lib/types'

export async function insertQualityLog(params: {
  product_id: string
  items_fallidos: string[]
  observacion: string | null
  order_id: string | null
  photo_path: string | null
}) {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('quality_logs').insert({
    ...params,
    date: today(),
    user_id: user?.id ?? null,
    user_email: user?.email ?? null,
  })
  if (error) throw new Error(error.message)
}

export function useQualityLogs(date: string) {
  const [logs, setLogs] = useState<QualityLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('quality_logs')
      .select('*, product:products(*)')
      .eq('date', date)
      .order('created_at', { ascending: false })
    setLogs((data as QualityLog[]) ?? [])
    setLoading(false)
  }, [date])

  useEffect(() => { fetch() }, [fetch])

  return { logs, loading, refetch: fetch }
}
