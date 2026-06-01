import { useState } from 'react'
import { useDayClosure } from '../hooks/useDayClosure'
import { adjustInventory } from '../hooks/useInventory'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Toast } from '../components/Toast'
import { today } from '../lib/utils'
import { Lock, CheckCircle, AlertTriangle } from 'lucide-react'
import type { DayClosureDetail } from '../lib/types'

export function DayClosureView() {
  const { user } = useAuth()
  const { todayClosure, movements, inventoryMap, loading, refetch } = useDayClosure()
  const [surplusValues, setSurplusValues] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const rows = movements.map(m => ({
    ...m,
    system_stock: inventoryMap[m.product_id] ?? 0,
  }))

  const allFilled = rows.length > 0 && rows.every(r => {
    const v = surplusValues[r.product_id]
    return v !== undefined && v !== '' && !isNaN(Number(v)) && Number(v) >= 0
  })

  async function handleClose() {
    if (!allFilled) return
    setSubmitting(true)
    try {
      const details: DayClosureDetail[] = rows.map(row => ({
        product_id: row.product_id,
        product_name: row.product_name,
        produced: row.produced,
        sold: row.sold,
        system_stock: row.system_stock,
        declared_surplus: Number(surplusValues[row.product_id]),
      }))

      let is_adjusted = false

      for (const detail of details) {
        const discrepancy = detail.declared_surplus - detail.system_stock
        if (discrepancy !== 0) {
          await adjustInventory(
            detail.product_id,
            discrepancy,
            'adjustment',
            undefined,
            'Ajuste de cierre del día'
          )
          is_adjusted = true
        }
      }

      const { error } = await supabase.from('day_closures').insert({
        date: today(),
        user_id: user?.id ?? null,
        is_adjusted,
        details,
      })

      if (error) throw new Error(error.message)

      setToast({ msg: 'Día cerrado correctamente', type: 'success' })
      refetch()
    } catch {
      setToast({ msg: 'Error al cerrar el día', type: 'error' })
    }
    setSubmitting(false)
  }

  if (loading) {
    return <div className="text-sm text-[var(--color-text-muted)] pt-10 text-center">Cargando...</div>
  }

  // Read-only: closure already exists for today
  if (todayClosure) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-6 w-6 text-[var(--color-success-text)]" />
          <div>
            <h1 className="text-xl font-bold">Cierre del día</h1>
            <p className="text-sm text-[var(--color-text-muted)] flex items-center gap-2 flex-wrap">
              Cerrado el {new Date(todayClosure.closed_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
              {todayClosure.is_adjusted && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-warning-text)] bg-[var(--color-warning-bg)] px-2 py-0.5 rounded-full">
                  <AlertTriangle size={10} /> Con ajustes
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="bg-white border border-[var(--color-border)] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3 text-right">Producido</th>
                  <th className="px-4 py-3 text-right">Vendido</th>
                  <th className="px-4 py-3 text-right">En nevera</th>
                  <th className="px-4 py-3 text-right">Sobrante</th>
                </tr>
              </thead>
              <tbody>
                {todayClosure.details.map((detail, i) => (
                  <tr key={detail.product_id} className={i > 0 ? 'border-t border-[var(--color-border-light)]' : ''}>
                    <td className="px-4 py-3 font-medium capitalize">{detail.product_name}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{detail.produced}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{detail.sold}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{detail.system_stock}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={detail.declared_surplus !== detail.system_stock
                        ? 'text-[var(--color-warning-text)] font-semibold'
                        : ''
                      }>
                        {detail.declared_surplus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    )
  }

  // Editable: no closure yet for today
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Lock className="h-6 w-6 text-[var(--color-text-secondary)]" strokeWidth={1.5} />
        <div>
          <h1 className="text-xl font-bold">Cierre del día</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white border border-[var(--color-border)] rounded-lg p-8 text-center">
          <p className="text-[var(--color-text-muted)]">Sin movimientos hoy — no hay productos que cerrar</p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-[var(--color-border)] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3 text-right">Producido hoy</th>
                    <th className="px-4 py-3 text-right">Vendido hoy</th>
                    <th className="px-4 py-3 text-right">En nevera</th>
                    <th className="px-4 py-3 text-right min-w-[140px]">Sobrante no vendido</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.product_id} className={i > 0 ? 'border-t border-[var(--color-border-light)]' : ''}>
                      <td className="px-4 py-3 font-medium capitalize">{row.product_name}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.produced}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.sold}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.system_stock}</td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          min={0}
                          placeholder="—"
                          value={surplusValues[row.product_id] ?? ''}
                          onChange={e => setSurplusValues(prev => ({ ...prev, [row.product_id]: e.target.value }))}
                          className="w-20 border border-[var(--color-border)] rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/15"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleClose}
              disabled={!allFilled || submitting}
              className="flex items-center gap-2 px-6 py-3 bg-[var(--color-accent)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--color-teal-dark)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[48px]"
            >
              <Lock size={16} />
              {submitting ? 'Cerrando...' : 'Cerrar día'}
            </button>
          </div>
        </>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
