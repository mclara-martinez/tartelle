import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Customer, CustomerType } from '../lib/types'

export interface CustomerInput {
  name: string
  phone: string | null
  email: string | null
  address: string | null
  type: CustomerType
  cedula: string | null
  razon_social: string | null
  nit: string | null
  discount_pct: number
  notes: string | null
  active: boolean
}

export function useAdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('customers')
      .select('*')
      .order('name')
    if (err) {
      setError(err.message)
    } else {
      setCustomers(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { refetch() }, [refetch])

  const createCustomer = useCallback(async (data: CustomerInput) => {
    const { error: err } = await supabase.from('customers').insert({
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      type: data.type,
      cedula: data.cedula || null,
      razon_social: data.razon_social || null,
      nit: data.nit || null,
      discount_pct: data.discount_pct,
      notes: data.notes || null,
      active: data.active,
    })
    if (err) throw new Error(err.message)
    await refetch()
  }, [refetch])

  const updateCustomer = useCallback(async (id: string, data: CustomerInput) => {
    const { error: err } = await supabase
      .from('customers')
      .update({
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        type: data.type,
        cedula: data.cedula || null,
        razon_social: data.razon_social || null,
        nit: data.nit || null,
        discount_pct: data.discount_pct,
        notes: data.notes || null,
        active: data.active,
      })
      .eq('id', id)
    if (err) throw new Error(err.message)
    await refetch()
  }, [refetch])

  const toggleActive = useCallback(async (id: string, active: boolean) => {
    const { error: err } = await supabase.from('customers').update({ active }).eq('id', id)
    if (err) throw new Error(err.message)
    setCustomers(cs => cs.map(c => c.id === id ? { ...c, active } : c))
  }, [])

  return { customers, loading, error, refetch, createCustomer, updateCustomer, toggleActive }
}
