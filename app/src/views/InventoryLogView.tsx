import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useProducts } from '../hooks/useProducts'
import { today, dayRangeISO } from '../lib/utils'
import { ScrollText, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { InventoryReason, Product } from '../lib/types'

const PAGE_SIZE = 20

const REASON_LABELS: Record<InventoryReason, string> = {
  production: 'Producción',
  sale:       'Venta',
  adjustment: 'Ajuste',
  waste:      'Merma',
}

const REASON_COLORS: Record<InventoryReason, { bg: string; text: string }> = {
  production: { bg: '#D1FAE5', text: '#065F46' },
  sale:       { bg: '#DBEAFE', text: '#1E40AF' },
  adjustment: { bg: '#FEF3C7', text: '#92400E' },
  waste:      { bg: '#FEE2E2', text: '#991B1B' },
}

interface LogRow {
  id: string
  product_id: string
  change: number
  reason: InventoryReason
  notes: string | null
  user_email: string | null
  created_at: string
  product: Pick<Product, 'id' | 'flavor' | 'size'> | null
}

export function InventoryLogView() {
  const { products } = useProducts()

  const [dateFilter, setDateFilter] = useState(today())
  const [productFilter, setProductFilter] = useState('')
  const [reasonFilter, setReasonFilter] = useState<InventoryReason | ''>('')
  const [page, setPage] = useState(0)

  const [rows, setRows] = useState<LogRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    const { start, end } = dayRangeISO(dateFilter)

    let query = supabase
      .from('inventory_log')
      .select('id, product_id, change, reason, notes, user_email, created_at, product:products(id, flavor, size)', { count: 'exact' })
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (productFilter) query = query.eq('product_id', productFilter)
    if (reasonFilter)  query = query.eq('reason', reasonFilter)

    const { data, count } = await query

    setRows((data ?? []) as unknown as LogRow[])
    setTotal(count ?? 0)
    setLoading(false)
  }, [dateFilter, productFilter, reasonFilter, page])

  useEffect(() => { load() }, [load])

  function handleFilterChange(setter: (v: string) => void) {
    return (v: string) => { setter(v); setPage(0) }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1
  const to = Math.min((page + 1) * PAGE_SIZE, total)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ScrollText className="h-6 w-6 text-[var(--color-text-secondary)]" strokeWidth={1.5} />
        <div>
          <h1 className="text-xl font-bold">Movimientos de inventario</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Historial de inventory_log</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="date"
          value={dateFilter}
          onChange={e => { handleFilterChange(setDateFilter)(e.target.value) }}
          className="border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[var(--color-accent)]"
        />

        <select
          value={productFilter}
          onChange={e => handleFilterChange(setProductFilter)(e.target.value)}
          className="border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[var(--color-accent)] max-w-[200px]"
        >
          <option value="">Todos los productos</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>
              {p.flavor} {p.size !== 'other' ? p.size : ''}
            </option>
          ))}
        </select>

        <select
          value={reasonFilter}
          onChange={e => { setReasonFilter(e.target.value as InventoryReason | ''); setPage(0) }}
          className="border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[var(--color-accent)]"
        >
          <option value="">Todos los tipos</option>
          {(Object.entries(REASON_LABELS) as [InventoryReason, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-[var(--color-border)] rounded-lg overflow-hidden">
        {loading ? (
          <div className="py-10 text-center text-sm text-[var(--color-text-muted)]">Cargando...</div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-[var(--color-text-muted)]">Sin movimientos para los filtros seleccionados</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                  <th className="px-4 py-3">Fecha/hora</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3 text-right">Cantidad</th>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const colors = REASON_COLORS[row.reason] ?? REASON_COLORS.adjustment
                  const isPositive = row.change > 0
                  const p = row.product as Pick<Product, 'id' | 'flavor' | 'size'> | null
                  return (
                    <tr key={row.id} className={`${i > 0 ? 'border-t border-[var(--color-border-light)]' : ''} hover:bg-[var(--color-bg-hover)] transition-colors`}>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)] tabular-nums whitespace-nowrap">
                        {format(parseISO(row.created_at), "d MMM, HH:mm", { locale: es })}
                      </td>
                      <td className="px-4 py-3 font-medium capitalize">
                        {p ? `${p.flavor}${p.size !== 'other' ? ` ${p.size}` : ''}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: colors.bg, color: colors.text }}
                        >
                          {REASON_LABELS[row.reason]}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right tabular-nums font-semibold ${isPositive ? 'text-[var(--color-success-text)]' : 'text-[var(--color-danger-text)]'}`}>
                        {isPositive ? `+${row.change}` : row.change}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)] text-xs truncate max-w-[160px]">
                        {row.user_email ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)] text-xs max-w-[200px] truncate">
                        {row.notes ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="border-t border-[var(--color-border)] px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-muted)]">
              {from}–{to} de {total}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 0}
                className="p-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-bg)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Página anterior"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 text-xs font-medium text-[var(--color-text-secondary)]">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-bg)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Página siguiente"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
