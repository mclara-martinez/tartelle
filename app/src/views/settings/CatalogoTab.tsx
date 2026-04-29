import { useState, useMemo, useEffect } from 'react'
import { Plus, Pencil, X } from 'lucide-react'
import { useAdminProducts, type ProductInput } from '../../hooks/useAdminProducts'
import { Toast } from '../../components/Toast'
import { formatCOP } from '../../lib/utils'
import {
  CATALOG_LABELS, TAX_TYPE_LABELS, SIZE_LABELS, CATEGORY_LABELS,
} from '../../lib/constants'
import type { Product, ProductCatalog, ProductSize, ProductCategory, TaxType } from '../../lib/types'

const CATALOG_OPTIONS: { value: ProductCatalog | 'all'; label: string }[] = [
  { value: 'all',       label: 'Todos' },
  { value: 'retail',    label: 'Retail' },
  { value: 'eventos',   label: 'Eventos' },
  { value: 'ambos',     label: 'Ambos' },
  { value: 'cafe_velez', label: 'Café Vélez' },
]

const ACTIVE_OPTIONS = [
  { value: 'all',      label: 'Todos' },
  { value: 'active',   label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
]

const SIZE_VALUES: ProductSize[] = ['grande', 'mediana', 'mini', 'porcion', 'other']
const CATEGORY_VALUES: ProductCategory[] = ['tarta', 'bites', 'cucheareable', 'vela', 'torta', 'galleta', 'brownie', 'pan', 'otro', 'complemento']
const TAX_VALUES: Array<NonNullable<TaxType>> = ['impoconsumo_8', 'iva_19', 'iva_0']

const EMPTY_FORM: ProductInput = {
  sku: '',
  name: '',
  flavor: '',
  size: 'mini',
  category: null,
  base_price: 0,
  tax_type: null,
  requires_advance_order: false,
  catalog: 'retail',
  active: true,
}

function ProductModal({
  product,
  onClose,
  onSave,
}: {
  product: Product | null
  onClose: () => void
  onSave: (data: ProductInput) => Promise<void>
}) {
  const [form, setForm] = useState<ProductInput>(
    product
      ? {
          sku: product.sku ?? '',
          name: product.name,
          flavor: product.flavor,
          size: product.size,
          category: product.category,
          base_price: product.base_price,
          tax_type: product.tax_type,
          requires_advance_order: product.requires_advance_order,
          catalog: product.catalog,
          active: product.active,
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

  function set<K extends keyof ProductInput>(key: K, val: ProductInput[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.flavor.trim()) {
      setErr('Nombre y sabor son obligatorios')
      return
    }
    setSaving(true)
    setErr(null)
    try {
      await onSave({ ...form, sku: form.sku?.trim() || null })
      onClose()
    } catch (e) {
      setErr((e as Error).message)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold">
            {product ? 'Editar producto' : 'Nuevo producto'}
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
                className="w-full text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                placeholder="TARTA GRANDE OG"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Sabor *</label>
              <input
                value={form.flavor}
                onChange={e => set('flavor', e.target.value)}
                className="w-full text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                placeholder="Original"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">SKU</label>
              <input
                value={form.sku ?? ''}
                onChange={e => set('sku', e.target.value)}
                className="w-full text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                placeholder="PT1"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Precio (COP)</label>
              <input
                type="number"
                min={0}
                step={1000}
                value={form.base_price}
                onChange={e => set('base_price', Number(e.target.value))}
                className="w-full text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Tamaño</label>
              <select
                value={form.size}
                onChange={e => set('size', e.target.value as ProductSize)}
                className="w-full text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              >
                {SIZE_VALUES.map(s => <option key={s} value={s}>{SIZE_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Categoría</label>
              <select
                value={form.category ?? ''}
                onChange={e => set('category', (e.target.value || null) as ProductCategory | null)}
                className="w-full text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              >
                <option value="">Sin categoría</option>
                {CATEGORY_VALUES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Catálogo</label>
              <select
                value={form.catalog}
                onChange={e => set('catalog', e.target.value as ProductCatalog)}
                className="w-full text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              >
                {Object.entries(CATALOG_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Impuesto</label>
              <select
                value={form.tax_type ?? ''}
                onChange={e => set('tax_type', (e.target.value || null) as TaxType)}
                className="w-full text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              >
                <option value="">Sin impuesto</option>
                {TAX_VALUES.map(t => <option key={t} value={t}>{TAX_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.requires_advance_order}
                onChange={e => set('requires_advance_order', e.target.checked)}
                className="rounded"
              />
              Requiere pedido anticipado
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={e => set('active', e.target.checked)}
                className="rounded"
              />
              Activo
            </label>
          </div>

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
              {saving ? 'Guardando...' : product ? 'Actualizar' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function CatalogoTab() {
  const { products, loading, error, createProduct, updateProduct, toggleActive } = useAdminProducts()
  const [catalogFilter, setCatalogFilter] = useState<ProductCatalog | 'all'>('all')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const filtered = useMemo(() =>
    products
      .filter(p => catalogFilter === 'all' || p.catalog === catalogFilter)
      .filter(p =>
        activeFilter === 'all' ? true :
        activeFilter === 'active' ? p.active : !p.active
      )
      .filter(p => {
        if (!search) return true
        const q = search.toLowerCase()
        return p.name.toLowerCase().includes(q) || p.flavor.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q)
      }),
    [products, catalogFilter, activeFilter, search]
  )

  async function handleSave(data: ProductInput) {
    if (editingProduct) {
      await updateProduct(editingProduct.id, data)
      setToast({ msg: 'Producto actualizado', type: 'success' })
    } else {
      await createProduct(data)
      setToast({ msg: 'Producto creado', type: 'success' })
    }
  }

  async function handleToggle(p: Product) {
    setTogglingId(p.id)
    try {
      await toggleActive(p.id, !p.active)
      setToast({ msg: p.active ? 'Producto inactivado' : 'Producto activado', type: 'success' })
    } catch {
      setToast({ msg: 'Error al cambiar estado', type: 'error' })
    }
    setTogglingId(null)
  }

  function openCreate() { setEditingProduct(null); setModalOpen(true) }
  function openEdit(p: Product) { setEditingProduct(p); setModalOpen(true) }

  if (loading) return <p className="text-sm text-[var(--color-text-muted)] pt-6">Cargando catálogo...</p>
  if (error) return <p className="text-sm text-[var(--color-danger-text)] bg-[var(--color-danger-bg)] rounded-lg p-3">{error}</p>

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar producto..."
          className="text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] w-48"
        />

        {/* Catalog filter pills */}
        <div className="flex gap-1 p-1 bg-[var(--color-surface-warm)] rounded-lg border border-[var(--color-border)]">
          {CATALOG_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setCatalogFilter(opt.value)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                catalogFilter === opt.value
                  ? 'bg-white text-[var(--color-text-primary)] shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Active filter pills */}
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

        <span className="text-xs text-[var(--color-text-muted)] ml-auto">{filtered.length} productos</span>

        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 bg-[var(--color-accent)] text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity min-h-[36px]"
        >
          <Plus size={14} />
          Nuevo producto
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--color-surface-warm)] text-[var(--color-text-muted)] text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3 font-medium">SKU</th>
              <th className="text-left px-4 py-3 font-medium">Nombre</th>
              <th className="text-left px-4 py-3 font-medium">Sabor</th>
              <th className="text-left px-4 py-3 font-medium">Tamaño</th>
              <th className="text-left px-4 py-3 font-medium">Categoría</th>
              <th className="text-left px-4 py-3 font-medium">Catálogo</th>
              <th className="text-right px-4 py-3 font-medium">Precio</th>
              <th className="text-center px-4 py-3 font-medium">Activo</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-10 text-[var(--color-text-muted)] text-sm">
                  No hay productos
                </td>
              </tr>
            )}
            {filtered.map(p => (
              <tr key={p.id} className="bg-[var(--color-surface)] hover:bg-[var(--color-surface-warm)] transition-colors">
                <td className="px-4 py-3 text-[var(--color-text-muted)] font-mono text-xs">{p.sku ?? '—'}</td>
                <td className="px-4 py-3 font-medium max-w-[180px] truncate">{p.name}</td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)]">{p.flavor}</td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)]">{SIZE_LABELS[p.size]}</td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                  {p.category ? CATEGORY_LABELS[p.category] : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-surface-warm)] text-[var(--color-text-secondary)]">
                    {CATALOG_LABELS[p.catalog]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{formatCOP(p.base_price)}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleToggle(p)}
                    disabled={togglingId === p.id}
                    title={p.active ? 'Inactivar producto' : 'Activar producto'}
                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                      p.active ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform duration-200 ${
                        p.active ? 'translate-x-[18px]' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => openEdit(p)}
                    className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-warm)] hover:text-[var(--color-text-primary)] transition-colors"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <ProductModal
          product={editingProduct}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
