import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { today, shiftDay, formatCOP, formatDate } from '../lib/utils'
import { STATUS_LABELS, STATUS_COLORS, SIZE_LABELS } from '../lib/constants'
import { Camera, X, Search } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { Order, OrderItem, Product, QualityLog } from '../lib/types'

const BUCKET = 'order-photos'

type PhotoCategory = 'pago' | 'calidad' | 'despacho' | 'factura'
type OrderWithItems = Order & { items: (OrderItem & { product: Product | null })[] }
type QualityLogWithProduct = QualityLog & { product: Product | null }

interface GalleryPhoto {
  key: string
  path: string
  category: PhotoCategory
  date: string
  time: string | null
  title: string
  subtitle: string
  order?: OrderWithItems
  qualityLog?: QualityLogWithProduct
  /** Clave de agrupación: id del pedido (o la propia key si la foto no tiene pedido). */
  groupKey: string
}

const CATEGORY_META: Record<PhotoCategory, { label: string; badge: string }> = {
  pago:     { label: 'Pago',     badge: 'bg-green-100 text-green-700' },
  calidad:  { label: 'Calidad',  badge: 'bg-amber-100 text-amber-700' },
  despacho: { label: 'Despacho', badge: 'bg-teal-100 text-teal-700' },
  factura:  { label: 'Factura',  badge: 'bg-purple-100 text-purple-700' },
}

const CATEGORY_ORDER: PhotoCategory[] = ['pago', 'calidad', 'despacho', 'factura']

function hhmm(iso: string | null): string | null {
  if (!iso) return null
  try { return format(parseISO(iso), 'HH:mm') } catch { return null }
}

function productLabel(p: Product | null | undefined): string {
  if (!p) return '—'
  const size = p.size && p.size !== 'NA' ? ` · ${SIZE_LABELS[p.size]}` : ''
  return `${p.flavor || p.name}${size}`
}

export function PhotosView() {
  const [fromDate, setFromDate] = useState(() => shiftDay(today(), -6))
  const [toDate, setToDate] = useState(() => today())
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [qualityLogs, setQualityLogs] = useState<QualityLogWithProduct[]>([])
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const [activeCategory, setActiveCategory] = useState<PhotoCategory | 'todas'>('todas')
  const [search, setSearch] = useState('')

  // Detalle: agrupa por pedido. Guardamos la key del grupo y la foto activa.
  const [detail, setDetail] = useState<{ groupKey: string; activePath: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setSignedUrls({})

      const [ordersRes, qualityRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*, items:order_items(*, product:products(*))')
          .gte('delivery_date', fromDate)
          .lte('delivery_date', toDate)
          .or('payment_receipt_url.not.is.null,dispatch_photo_url.not.is.null,invoice_photo_url.not.is.null')
          .order('delivery_date', { ascending: false }),
        supabase
          .from('quality_logs')
          .select('*, product:products(*)')
          .gte('date', fromDate)
          .lte('date', toDate)
          .not('photo_path', 'is', null)
          .order('created_at', { ascending: false }),
      ])

      if (cancelled) return

      const orderRows = (ordersRes.data ?? []) as OrderWithItems[]
      const qualityRows = (qualityRes.data ?? []) as QualityLogWithProduct[]
      setOrders(orderRows)
      setQualityLogs(qualityRows)

      // Reunir todas las rutas y pedir URLs firmadas en un solo batch.
      const paths: string[] = []
      for (const o of orderRows) {
        if (o.payment_receipt_url) paths.push(o.payment_receipt_url)
        if (o.dispatch_photo_url) paths.push(o.dispatch_photo_url)
        if (o.invoice_photo_url) paths.push(o.invoice_photo_url)
      }
      for (const q of qualityRows) {
        if (q.photo_path) paths.push(q.photo_path)
      }

      if (paths.length > 0) {
        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600)
        if (!cancelled && signed) {
          const map: Record<string, string> = {}
          for (const item of signed) {
            if (item.signedUrl && item.path) map[item.path] = item.signedUrl
          }
          setSignedUrls(map)
        }
      }

      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [fromDate, toDate])

  // Construir la lista unificada de fotos a partir de ambas fuentes.
  const allPhotos = useMemo<GalleryPhoto[]>(() => {
    const list: GalleryPhoto[] = []

    for (const o of orders) {
      const productsSummary = (o.items ?? [])
        .map(i => `${i.quantity}× ${i.product?.flavor ?? '?'}`)
        .join(', ')
      const title = o.customer_name ?? 'Cliente'

      if (o.payment_receipt_url) {
        list.push({
          key: `${o.id}-pago`, path: o.payment_receipt_url, category: 'pago',
          date: o.delivery_date, time: hhmm(o.created_at),
          title, subtitle: productsSummary, order: o, groupKey: o.id,
        })
      }
      if (o.dispatch_photo_url) {
        list.push({
          key: `${o.id}-despacho`, path: o.dispatch_photo_url, category: 'despacho',
          date: o.delivery_date, time: hhmm(o.picked_up_at ?? o.created_at),
          title, subtitle: productsSummary, order: o, groupKey: o.id,
        })
      }
      if (o.invoice_photo_url) {
        list.push({
          key: `${o.id}-factura`, path: o.invoice_photo_url, category: 'factura',
          date: o.delivery_date, time: hhmm(o.picked_up_at ?? o.created_at),
          title, subtitle: productsSummary, order: o, groupKey: o.id,
        })
      }
    }

    for (const q of qualityLogs) {
      if (!q.photo_path) continue
      const subtitle = q.observacion || (q.items_fallidos?.length ? `Fallas: ${q.items_fallidos.join(', ')}` : 'Control de calidad')
      list.push({
        key: `q-${q.id}`, path: q.photo_path, category: 'calidad',
        date: q.date, time: hhmm(q.created_at),
        title: productLabel(q.product), subtitle,
        qualityLog: q, groupKey: q.order_id ?? `q-${q.id}`,
      })
    }

    // Orden: fecha desc, luego hora desc.
    list.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1
      return (b.time ?? '') < (a.time ?? '') ? -1 : 1
    })
    return list
  }, [orders, qualityLogs])

  const counts = useMemo(() => {
    const c: Record<string, number> = { todas: allPhotos.length, pago: 0, calidad: 0, despacho: 0, factura: 0 }
    for (const p of allPhotos) c[p.category]++
    return c
  }, [allPhotos])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allPhotos.filter(p => {
      if (activeCategory !== 'todas' && p.category !== activeCategory) return false
      if (q) {
        const hay = `${p.title} ${p.subtitle} ${p.order?.customer_phone ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [allPhotos, activeCategory, search])

  // Fotos del grupo (pedido) abierto en el detalle.
  const detailGroup = useMemo(() => {
    if (!detail) return null
    const photos = allPhotos.filter(p => p.groupKey === detail.groupKey)
    const active = photos.find(p => p.path === detail.activePath) ?? photos[0]
    const order = photos.find(p => p.order)?.order ?? null
    return { photos, active, order }
  }, [detail, allPhotos])

  const filterChips: ({ key: PhotoCategory | 'todas'; label: string })[] = [
    { key: 'todas', label: 'Todas' },
    ...CATEGORY_ORDER.map(c => ({ key: c, label: CATEGORY_META[c].label })),
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Camera className="h-6 w-6 text-[var(--color-text-secondary)]" strokeWidth={1.5} />
        <div>
          <h1 className="text-xl font-bold">Galería de fotos</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Pagos, calidad, despacho y factura</p>
        </div>
      </div>

      {/* Controles */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Rango de fechas */}
          <div className="flex items-center gap-1.5 bg-white border border-[var(--color-border)] rounded-lg px-2 py-1.5">
            <input
              type="date"
              value={fromDate}
              max={toDate}
              onChange={e => setFromDate(e.target.value)}
              className="text-sm font-medium bg-transparent border-none outline-none cursor-pointer"
              aria-label="Desde"
            />
            <span className="text-[var(--color-text-muted)] text-sm">→</span>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              onChange={e => setToDate(e.target.value)}
              className="text-sm font-medium bg-transparent border-none outline-none cursor-pointer"
              aria-label="Hasta"
            />
          </div>

          {/* Búsqueda por cliente */}
          <div className="flex items-center gap-2 bg-white border border-[var(--color-border)] rounded-lg px-3 py-1.5 flex-1 min-w-[200px] max-w-xs">
            <Search size={15} className="text-[var(--color-text-muted)] flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por cliente o producto…"
              className="text-sm bg-transparent border-none outline-none w-full"
            />
            {search && (
              <button onClick={() => setSearch('')} aria-label="Limpiar búsqueda" className="text-[var(--color-text-muted)]">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Chips de categoría */}
        <div className="flex flex-wrap gap-2">
          {filterChips.map(chip => {
            const active = activeCategory === chip.key
            return (
              <button
                key={chip.key}
                onClick={() => setActiveCategory(chip.key)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  active
                    ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                    : 'bg-white text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
                }`}
              >
                {chip.label}
                <span className={`ml-1.5 text-xs ${active ? 'text-white/80' : 'text-[var(--color-text-muted)]'}`}>
                  {counts[chip.key] ?? 0}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-sm text-[var(--color-text-muted)] pt-10 text-center">Cargando fotos…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[var(--color-border)] rounded-lg p-10 text-center">
          <Camera size={32} className="mx-auto text-[var(--color-text-muted)] mb-3" strokeWidth={1.5} />
          <p className="text-[var(--color-text-muted)]">Sin fotos para este filtro</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map(photo => {
            const url = signedUrls[photo.path]
            const meta = CATEGORY_META[photo.category]
            return (
              <button
                key={photo.key}
                onClick={() => setDetail({ groupKey: photo.groupKey, activePath: photo.path })}
                className="group text-left"
              >
                <div className="relative aspect-square rounded-lg overflow-hidden bg-[var(--color-bg)] border border-[var(--color-border)]">
                  {url ? (
                    <img
                      src={url}
                      alt={`${meta.label} ${photo.title}`}
                      className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera size={20} className="text-[var(--color-text-muted)]" strokeWidth={1.5} />
                    </div>
                  )}
                  <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${meta.badge}`}>
                    {meta.label}
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium text-[var(--color-text-primary)] truncate">{photo.title}</p>
                <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                  {formatDate(photo.date)}{photo.time ? ` · ${photo.time}` : ''}
                </p>
              </button>
            )
          })}
        </div>
      )}

      {/* Detalle del pedido */}
      {detail && detailGroup && detailGroup.active && (
        <DetailModal
          group={detailGroup}
          signedUrls={signedUrls}
          onSelectPath={path => setDetail({ groupKey: detail.groupKey, activePath: path })}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  )
}

interface DetailModalProps {
  group: { photos: GalleryPhoto[]; active: GalleryPhoto; order: OrderWithItems | null }
  signedUrls: Record<string, string>
  onSelectPath: (path: string) => void
  onClose: () => void
}

function DetailModal({ group, signedUrls, onSelectPath, onClose }: DetailModalProps) {
  const { photos, active, order } = group
  const activeUrl = signedUrls[active.path]

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto flex flex-col md:flex-row"
        onClick={e => e.stopPropagation()}
      >
        {/* Imagen */}
        <div className="md:w-1/2 bg-black flex items-center justify-center relative min-h-[240px]">
          {activeUrl ? (
            <img src={activeUrl} alt={active.title} className="w-full max-h-[70vh] object-contain" />
          ) : (
            <Camera size={40} className="text-white/40" />
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 text-white bg-white/10 rounded-full hover:bg-white/20 transition-colors md:hidden"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Detalle */}
        <div className="md:w-1/2 p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${CATEGORY_META[active.category].badge}`}>
                {CATEGORY_META[active.category].label}
              </span>
              <h2 className="text-lg font-bold mt-2">{active.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="hidden md:block p-1.5 rounded-lg hover:bg-[var(--color-bg)] text-[var(--color-text-muted)]"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tira de fotos del mismo pedido */}
          {photos.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {photos.map(p => {
                const url = signedUrls[p.path]
                const isActive = p.path === active.path
                return (
                  <button
                    key={p.key}
                    onClick={() => onSelectPath(p.path)}
                    className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                      isActive ? 'border-[var(--color-accent)]' : 'border-transparent'
                    }`}
                    title={CATEGORY_META[p.category].label}
                  >
                    {url ? (
                      <img src={url} alt={CATEGORY_META[p.category].label} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[var(--color-bg)]">
                        <Camera size={16} className="text-[var(--color-text-muted)]" />
                      </div>
                    )}
                    <span className={`absolute bottom-0 inset-x-0 text-[9px] font-semibold text-center ${CATEGORY_META[p.category].badge}`}>
                      {CATEGORY_META[p.category].label}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Datos del pedido o de calidad */}
          {order ? (
            <div className="space-y-2.5 text-sm">
              <DetailRow label="Cliente" value={order.customer_name ?? 'Cliente'} />
              {order.customer_phone && <DetailRow label="Teléfono" value={order.customer_phone} />}
              <DetailRow label="Fecha de pedido" value={formatDate(order.created_at)} />
              <DetailRow label="Fecha de entrega" value={formatDate(order.delivery_date)} />
              <div>
                <p className="text-[var(--color-text-muted)] text-xs mb-1">Productos</p>
                <ul className="space-y-0.5">
                  {(order.items ?? []).map(it => (
                    <li key={it.id} className="text-[var(--color-text-primary)]">
                      {it.quantity}× {productLabel(it.product)}
                    </li>
                  ))}
                </ul>
              </div>
              <DetailRow label="Valor final" value={formatCOP(order.total)} strong />
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-muted)] text-xs">Estado</span>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: STATUS_COLORS[order.status].bg, color: STATUS_COLORS[order.status].text }}
                >
                  {STATUS_LABELS[order.status]}
                </span>
              </div>
            </div>
          ) : active.qualityLog ? (
            <div className="space-y-2.5 text-sm">
              <DetailRow label="Producto" value={productLabel(active.qualityLog.product)} />
              <DetailRow label="Fecha" value={formatDate(active.qualityLog.date)} />
              {active.qualityLog.items_fallidos?.length > 0 && (
                <DetailRow label="Ítems con falla" value={active.qualityLog.items_fallidos.join(', ')} />
              )}
              {active.qualityLog.observacion && (
                <div>
                  <p className="text-[var(--color-text-muted)] text-xs mb-1">Observación</p>
                  <p className="text-[var(--color-text-primary)]">{active.qualityLog.observacion}</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[var(--color-text-muted)] text-xs">{label}</span>
      <span className={`text-right ${strong ? 'font-bold text-[var(--color-text-primary)]' : 'text-[var(--color-text-primary)]'}`}>
        {value}
      </span>
    </div>
  )
}
