import { useMemo } from 'react'
import { useOrders } from './useOrders'
import { useProductionExtras } from './useProductionExtras'
import { useProductionCounts } from './useProductionCounts'
import { CATEGORY_LABELS, PRODUCT_CATEGORY_ORDER } from '../lib/constants'
import type { ProductCategory, ProductSize } from '../lib/types'

// Estados que aún requieren producción. Excluye ready/dispatched/delivered
// (ya se hicieron) y cancelled. 'pending' existe en la DB aunque no está en el
// union de OrderStatus, por eso el array es string[].
export const PRODUCIBLE_STATUSES: string[] = ['pending', 'confirmed', 'in_production']

export interface ProductionNeed {
  productId: string
  flavor: string
  size: ProductSize
  category: ProductCategory | null
  fromOrders: number
  fromExtras: number
  available: number
  toMake: number
}

// Agrupación del plan: categoría (orden del catálogo) → sabor (alfabético) →
// tamaño. El sabor solo es ambiguo — "Arequipe · Unidad" puede ser
// cucheareable o torta en capacillo — así que la categoría siempre encabeza.
export interface ProductionCategoryGroup {
  category: string
  label: string
  flavors: Array<{ flavor: string; items: ProductionNeed[] }>
}

function categoryRank(cat: string): number {
  const i = PRODUCT_CATEGORY_ORDER.indexOf(cat as ProductCategory)
  return i === -1 ? PRODUCT_CATEGORY_ORDER.length : i
}

// Plan de producción para una fecha de entrega objetivo:
// pedidos + extras − terminado disponible = a producir (HACER).
// Única fuente de verdad compartida entre el tab Produccion del admin y la
// vista Producir de la tablet de cocina — mismo cálculo, sin drift.
export function useProductionPlan(targetDate: string) {
  const { orders, loading: loadingOrders } = useOrders(targetDate)
  const { extras, upsertExtra, removeExtra } = useProductionExtras(targetDate)
  const {
    counts,
    loading: loadingCounts,
    upsertCount,
    removeCount,
    refetch: refetchCounts,
  } = useProductionCounts(targetDate)

  const countsMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of counts) map[c.product_id] = c.quantity
    return map
  }, [counts])

  const needs = useMemo(() => {
    const acc: Record<string, ProductionNeed> = {}

    const ensure = (productId: string, flavor: string, size: ProductSize, category: ProductCategory | null) => {
      if (!acc[productId]) {
        acc[productId] = { productId, flavor, size, category, fromOrders: 0, fromExtras: 0, available: countsMap[productId] ?? 0, toMake: 0 }
      }
      return acc[productId]
    }

    for (const order of orders) {
      if (!PRODUCIBLE_STATUSES.includes(order.status)) continue
      for (const item of order.items ?? []) {
        if (!item.product) continue
        ensure(item.product_id, item.product.flavor, item.product.size, item.product.category).fromOrders += item.quantity
      }
    }

    for (const extra of extras) {
      if (!extra.product) continue
      ensure(extra.product_id, extra.product.flavor, extra.product.size, extra.product.category).fromExtras += extra.quantity
    }

    for (const n of Object.values(acc)) {
      n.toMake = Math.max(0, n.fromOrders + n.fromExtras - n.available)
    }

    return Object.values(acc).sort((a, b) => a.flavor.localeCompare(b.flavor) || a.size.localeCompare(b.size))
  }, [orders, extras, countsMap])

  const needsByCategory = useMemo<ProductionCategoryGroup[]>(() => {
    const byCat: Record<string, ProductionNeed[]> = {}
    for (const item of needs) {
      const cat = item.category ?? 'otro'
      byCat[cat] = byCat[cat] ?? []
      byCat[cat].push(item)
    }
    return Object.entries(byCat)
      .sort(([a], [b]) => categoryRank(a) - categoryRank(b))
      .map(([category, items]) => {
        const byFlavor: Record<string, ProductionNeed[]> = {}
        for (const item of items) {
          byFlavor[item.flavor] = byFlavor[item.flavor] ?? []
          byFlavor[item.flavor].push(item)
        }
        return {
          category,
          label: CATEGORY_LABELS[category as ProductCategory] ?? 'Otros',
          flavors: Object.entries(byFlavor)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([flavor, flavorItems]) => ({ flavor, items: flavorItems })),
        }
      })
  }, [needs])

  const totalToMake = useMemo(() => needs.reduce((s, n) => s + n.toMake, 0), [needs])

  return {
    needs,
    needsByCategory,
    totalToMake,
    loading: loadingOrders || loadingCounts,
    extras,
    counts,
    upsertExtra,
    removeExtra,
    upsertCount,
    removeCount,
    refetchCounts,
  }
}
