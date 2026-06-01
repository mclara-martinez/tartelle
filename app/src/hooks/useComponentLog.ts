import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { today } from '../lib/utils'

export interface ComponentLogEntry {
  id: string
  nombre: string
  cantidad_descripcion: string
  fecha: string
  user_id: string | null
  user_email: string | null
  created_at: string
}

export async function insertComponentLog(params: {
  nombre: string
  cantidad_descripcion: string
}) {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('component_log').insert({
    ...params,
    fecha: today(),
    user_id: user?.id ?? null,
    user_email: user?.email ?? null,
  })
  if (error) throw new Error(error.message)
}

export function useComponentLogs(date: string) {
  const [logs, setLogs] = useState<ComponentLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('component_log')
      .select('*')
      .eq('fecha', date)
      .order('created_at', { ascending: false })
    setLogs(data ?? [])
    setLoading(false)
  }, [date])

  useEffect(() => { fetch() }, [fetch])

  return { logs, loading, refetch: fetch }
}
