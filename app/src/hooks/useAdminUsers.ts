import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { AppUser, AppRole } from '../lib/types'

const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''
  return fetch(`${EDGE_FN_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
}

export function useAdminUsers() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch('')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al cargar usuarios')
      setUsers(data as AppUser[])
    } catch (e) {
      setError((e as Error).message)
    }
    setLoading(false)
  }, [])

  useEffect(() => { refetch() }, [refetch])

  const createUser = useCallback(async (payload: { email: string; password: string; role: AppRole }) => {
    const res = await authFetch('', { method: 'POST', body: JSON.stringify(payload) })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Error al crear usuario')
    await refetch()
  }, [refetch])

  const updateRole = useCallback(async (id: string, role: AppRole) => {
    const res = await authFetch(`/${id}`, { method: 'PATCH', body: JSON.stringify({ role }) })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Error al actualizar rol')
    await refetch()
  }, [refetch])

  const deactivateUser = useCallback(async (id: string) => {
    const res = await authFetch(`/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Error al desactivar usuario')
    await refetch()
  }, [refetch])

  return { users, loading, error, refetch, createUser, updateRole, deactivateUser }
}
