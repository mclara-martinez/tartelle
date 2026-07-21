import { useState, useMemo, useEffect } from 'react'
import { Plus, Pencil, X } from 'lucide-react'
import { useAdminCustomers, type CustomerInput } from '../../hooks/useAdminCustomers'
import { Toast } from '../../components/Toast'
import type { Customer, CustomerType } from '../../lib/types'

const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  b2c: 'Particular',
  b2b: 'Empresa',
}

const CUSTOMER_TYPE_COLORS: Record<CustomerType, { bg: string; text: string }> = {
  b2c: { bg: '#DBEAFE', text: '#1E40AF' },
  b2b: { bg: '#EDE9FE', text: '#5B21B6' },
}

const TYPE_VALUES: CustomerType[] = ['b2c', 'b2b']

const ACTIVE_OPTIONS = [
  { value: 'all',      label: 'Todos' },
  { value: 'active',   label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
]

const EMPTY_FORM: CustomerInput = {
  name: '',
  phone: null,
  email: null,
  address: null,
  type: 'b2c',
  cedula: null,
  razon_social: null,
  nit: null,
  discount_pct: 0,
  notes: null,
  active: true,
}

function CustomerModal({
  customer,
  onClose,
  onSave,
}: {
  customer: Customer | null
  onClose: () => void
  onSave: (data: CustomerInput) => Promise<void>
}) {
  const [form, setForm] = useState<CustomerInput>(
    customer
      ? {
          name: customer.name,
          phone: customer.phone ?? '',
          email: customer.email ?? '',
          address: customer.address ?? '',
          type: customer.type,
          cedula: customer.cedula ?? '',
          razon_social: customer.razon_social ?? '',
          nit: customer.nit ?? '',
          discount_pct: customer.discount_pct ?? 0,
          notes: customer.notes ?? '',
          active: customer.active,
        }
      : EMPTY_FORM
  )
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function set<K extends keyof CustomerInput>(key: K, val: CustomerInput[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setErr('El nombre es obligatorio')
      return
    }
    setSaving(true)
    setErr(null)
    try {
      await onSave(form)
      onClose()
    } catch (e) {
      setErr((e as Error).message)
    }
    setSaving(false)
  }

  const inputClass = 'w-full text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold">
            {customer ? 'Editar cliente' : 'Nuevo cliente'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-surface-warm)] text-[var(--color-text-muted)]">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {err && (
            <p className="text-sm text-[var(--color-danger-text)] bg-[var(--color-danger-bg)] rounded-lg px-3 py-2">{err}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Nombre *</label>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className={inputClass}
                placeholder="Restaurante XYZ"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Tipo</label>
              <select
                value={form.type}
                onChange={e => set('type', e.target.value as CustomerType)}
                className={inputClass}
              >
                {TYPE_VALUES.map(t => <option key={t} value={t}>{CUSTOMER_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Teléfono</label>
              <input
                value={form.phone ?? ''}
                onChange={e => set('phone', e.target.value)}
                className={inputClass}
                placeholder="300 000 0000"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Email</label>
              <input
                type="email"
                value={form.email ?? ''}
                onChange={e => set('email', e.target.value)}
                className={inputClass}
                placeholder="contacto@empresa.co"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Dirección de entrega</label>
            <input
              value={form.address ?? ''}
              onChange={e => set('address', e.target.value)}
              className={inputClass}
              placeholder="Calle 10 # 43-20, El Poblado"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">
                {form.type === 'b2b' ? 'Razón social' : 'Cédula'}
              </label>
              {form.type === 'b2b' ? (
                <input
                  value={form.razon_social ?? ''}
                  onChange={e => set('razon_social', e.target.value)}
                  className={inputClass}
                  placeholder="Empresa S.A.S."
                />
              ) : (
                <input
                  value={form.cedula ?? ''}
                  onChange={e => set('cedula', e.target.value)}
                  className={inputClass}
                  placeholder="1000000000"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">
                {form.type === 'b2b' ? 'NIT' : 'Doc. identidad alt.'}
              </label>
              <input
                value={form.type === 'b2b' ? (form.nit ?? '') : (form.cedula ?? '')}
                onChange={e => form.type === 'b2b' ? set('nit', e.target.value) : set('cedula', e.target.value)}
                className={inputClass}
                placeholder={form.type === 'b2b' ? '900000000-1' : ''}
              />
            </div>
          </div>

          {form.type === 'b2b' && (
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Cédula contacto</label>
              <input
                value={form.cedula ?? ''}
                onChange={e => set('cedula', e.target.value)}
                className={inputClass}
                placeholder="Cédula del contacto principal"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Descuento (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={form.discount_pct}
              onChange={e => set('discount_pct', Number(e.target.value))}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Notas</label>
            <textarea
              value={form.notes ?? ''}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              className={`${inputClass} resize-none`}
              placeholder="Horario de entrega, términos de crédito, marcación mínima..."
            />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={e => set('active', e.target.checked)}
              className="rounded"
            />
            Activo
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-surface-warm)] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 text-sm font-medium bg-[var(--color-accent)] text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Guardando...' : customer ? 'Actualizar' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ClientesTab() {
  const { customers, loading, error, createCustomer, updateCustomer, toggleActive } = useAdminCustomers()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<CustomerType | 'all'>('all')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('active')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const filtered = useMemo(() =>
    customers
      .filter(c => typeFilter === 'all' || c.type === typeFilter)
      .filter(c =>
        activeFilter === 'all' ? true :
        activeFilter === 'active' ? c.active : !c.active
      )
      .filter(c => {
        if (!search) return true
        const q = search.toLowerCase()
        return (
          c.name.toLowerCase().includes(q) ||
          (c.phone ?? '').includes(q) ||
          (c.razon_social ?? '').toLowerCase().includes(q) ||
          (c.nit ?? '').includes(q)
        )
      }),
    [customers, typeFilter, activeFilter, search]
  )

  async function handleSave(data: CustomerInput) {
    if (editingCustomer) {
      await updateCustomer(editingCustomer.id, data)
      setToast({ msg: 'Cliente actualizado', type: 'success' })
    } else {
      await createCustomer(data)
      setToast({ msg: 'Cliente creado', type: 'success' })
    }
  }

  async function handleToggle(c: Customer) {
    setTogglingId(c.id)
    try {
      await toggleActive(c.id, !c.active)
      setToast({ msg: c.active ? 'Cliente inactivado' : 'Cliente activado', type: 'success' })
    } catch {
      setToast({ msg: 'Error al cambiar estado', type: 'error' })
    }
    setTogglingId(null)
  }

  function openCreate() { setEditingCustomer(null); setModalOpen(true) }
  function openEdit(c: Customer) { setEditingCustomer(c); setModalOpen(true) }

  if (loading) return <p className="text-sm text-[var(--color-text-muted)] pt-6">Cargando clientes...</p>
  if (error) return <p className="text-sm text-[var(--color-danger-text)] bg-[var(--color-danger-bg)] rounded-lg p-3">{error}</p>

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar cliente..."
          className="text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] w-48"
        />

        {/* Type filter pills */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              typeFilter === 'all'
                ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
            }`}
          >
            Todos
          </button>
          {TYPE_VALUES.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(typeFilter === t ? 'all' : t)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                typeFilter === t
                  ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
              }`}
            >
              {CUSTOMER_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Active filter */}
        <div className="flex gap-1 p-1 bg-[var(--color-surface-warm)] rounded-lg border border-[var(--color-border)]">
          {ACTIVE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setActiveFilter(opt.value as typeof activeFilter)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeFilter === opt.value
                  ? 'bg-white text-[var(--color-text-primary)] shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-[var(--color-text-muted)] ml-auto">{filtered.length} clientes</span>

        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 bg-[var(--color-accent)] text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity min-h-[36px]"
        >
          <Plus size={14} />
          Nuevo cliente
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--color-surface-warm)] text-[var(--color-text-muted)] text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3 font-medium">Nombre</th>
              <th className="text-left px-4 py-3 font-medium">Tipo</th>
              <th className="text-left px-4 py-3 font-medium">Teléfono</th>
              <th className="text-left px-4 py-3 font-medium">Razón social / Doc.</th>
              <th className="text-right px-4 py-3 font-medium">Descuento</th>
              <th className="text-center px-4 py-3 font-medium">Activo</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-[var(--color-text-muted)] text-sm">
                  No hay clientes
                </td>
              </tr>
            )}
            {filtered.map(c => {
              const colors = CUSTOMER_TYPE_COLORS[c.type]
              const identity = c.razon_social || c.nit || c.cedula || '—'
              return (
                <tr key={c.id} className="bg-[var(--color-surface)] hover:bg-[var(--color-surface-warm)] transition-colors">
                  <td className="px-4 py-3 font-medium max-w-[180px]">
                    <span className="block truncate">{c.name}</span>
                    {c.address && (
                      <span className="block text-xs text-[var(--color-text-muted)] truncate max-w-[180px]">{c.address}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: colors.bg, color: colors.text }}
                    >
                      {CUSTOMER_TYPE_LABELS[c.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)] max-w-[160px]">
                    <span className="block truncate">{identity}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {c.discount_pct > 0 ? `${c.discount_pct}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggle(c)}
                      disabled={togglingId === c.id}
                      title={c.active ? 'Inactivar cliente' : 'Activar cliente'}
                      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                        c.active ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform duration-200 ${
                          c.active ? 'translate-x-[18px]' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openEdit(c)}
                      className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-warm)] hover:text-[var(--color-text-primary)] transition-colors"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <CustomerModal
          customer={editingCustomer}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
