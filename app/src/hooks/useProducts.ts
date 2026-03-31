import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Product } from '../lib/types'

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('flavor')
      .order('size')
    if (err) {
      setError(err.message)
    } else {
      setProducts(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { products, loading, error, refetch: fetch }
}
