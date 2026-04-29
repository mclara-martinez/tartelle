import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Product, ProductSize, ProductCategory, ProductCatalog, TaxType } from '../lib/types'

export interface ProductInput {
  sku: string | null
  name: string
  flavor: string
  size: ProductSize
  category: ProductCategory | null
  base_price: number
  tax_type: TaxType
  requires_advance_order: boolean
  catalog: ProductCatalog
  active: boolean
}

export function useAdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('products')
      .select('*')
      .order('name')
    if (err) {
      setError(err.message)
    } else {
      setProducts(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { refetch() }, [refetch])

  const createProduct = useCallback(async (data: ProductInput) => {
    const { error: err } = await supabase.from('products').insert(data)
    if (err) throw new Error(err.message)
    await refetch()
  }, [refetch])

  const updateProduct = useCallback(async (id: string, data: Partial<ProductInput>) => {
    const { error: err } = await supabase.from('products').update(data).eq('id', id)
    if (err) throw new Error(err.message)
    await refetch()
  }, [refetch])

  const toggleActive = useCallback(async (id: string, active: boolean) => {
    const { error: err } = await supabase.from('products').update({ active }).eq('id', id)
    if (err) throw new Error(err.message)
    await refetch()
  }, [refetch])

  return { products, loading, error, refetch, createProduct, updateProduct, toggleActive }
}
