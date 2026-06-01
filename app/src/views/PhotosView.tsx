import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { today } from '../lib/utils'
import { Camera, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, parseISO, addDays, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Order, OrderItem, Product } from '../lib/types'

const BUCKET = 'order-photos'

type OrderWithItems = Order & { items: (OrderItem & { product: Product | null })[] }

function formatPickerDate(dateStr: string): string {
  const t = today()
  if (dateStr === t) return 'Hoy'
  return format(parseISO(dateStr), "EEE d MMM", { locale: es })
}

export function PhotosView() {
  const [selectedDate, setSelectedDate] = useState(today())
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setSignedUrls({})

      const { data } = await supabase
        .from('orders')
        .select('*, items:order_items(*, product:products(*))')
        .not('dispatch_photo_url', 'is', null)
        .eq('delivery_date', selectedDate)
        .order('picked_up_at', { ascending: true, nullsFirst: false })

      if (cancelled) return

      const rows = (data ?? []) as OrderWithItems[]
      setOrders(rows)

      // Batch-fetch signed URLs for all dispatch photos
      const paths = rows
        .map(o => o.dispatch_photo_url)
        .filter(Boolean) as string[]

      if (paths.length > 0) {
        const { data: signed } = await supabase.storage
          .from(BUCKET)
          .createSignedUrls(paths, 3600)

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
  }, [selectedDate])

  function prevDay() {
    setSelectedDate(d => format(subDays(parseISO(d), 1), 'yyyy-MM-dd'))
  }
  function nextDay() {
    setSelectedDate(d => format(addDays(parseISO(d), 1), 'yyyy-MM-dd'))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Camera className="h-6 w-6 text-[var(--color-text-secondary)]" strokeWidth={1.5} />
          <div>
            <h1 className="text-xl font-bold">Fotos del día</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Fotos de despacho registradas</p>
          </div>
        </div>

        {/* Date navigator */}
        <div className="flex items-center gap-1 bg-white border border-[var(--color-border)] rounded-lg p-1">
          <button
            onClick={prevDay}
            className="p-1.5 rounded-md hover:bg-[var(--color-bg)] transition-colors text-[var(--color-text-secondary)]"
            aria-label="Día anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="text-sm font-medium text-[var(--color-text-primary)] bg-transparent border-none outline-none px-1 cursor-pointer"
          />
          <span className="text-xs text-[var(--color-text-muted)] pr-1">{formatPickerDate(selectedDate)}</span>
          <button
            onClick={nextDay}
            className="p-1.5 rounded-md hover:bg-[var(--color-bg)] transition-colors text-[var(--color-text-secondary)]"
            aria-label="Día siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-sm text-[var(--color-text-muted)] pt-10 text-center">Cargando fotos...</div>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-[var(--color-border)] rounded-lg p-10 text-center">
          <Camera size={32} className="mx-auto text-[var(--color-text-muted)] mb-3" strokeWidth={1.5} />
          <p className="text-[var(--color-text-muted)]">Sin fotos de despacho para esta fecha</p>
        </div>
      ) : (
        <div className="bg-white border border-[var(--color-border)] rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[var(--color-border)]">
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
              {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'} con foto
            </p>
          </div>
          <div className="divide-y divide-[var(--color-border-light)]">
            {orders.map(order => {
              const path = order.dispatch_photo_url!
              const signedUrl = signedUrls[path]
              const dispatchTime = order.picked_up_at
                ? format(parseISO(order.picked_up_at), 'HH:mm')
                : '—'
              const productsSummary = (order.items ?? [])
                .map(i => `${i.quantity}x ${i.product?.flavor ?? '?'}`)
                .join(', ')

              return (
                <div key={order.id} className="px-4 py-3 flex items-center gap-4">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-[var(--color-bg)] border border-[var(--color-border)]">
                    {signedUrl ? (
                      <img
                        src={signedUrl}
                        alt={`Despacho ${order.customer_name}`}
                        className="w-full h-full object-cover cursor-pointer active:opacity-80 transition-opacity"
                        onClick={() => setLightboxUrl(signedUrl)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera size={20} className="text-[var(--color-text-muted)]" strokeWidth={1.5} />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                      {order.customer_name ?? 'Cliente'}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)] truncate mt-0.5">
                      {productsSummary || '—'}
                    </p>
                  </div>

                  {/* Dispatch time */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs text-[var(--color-text-muted)]">Despacho</p>
                    <p className="text-sm font-semibold tabular-nums">{dispatchTime}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 text-white bg-white/10 rounded-full hover:bg-white/20 transition-colors"
            onClick={() => setLightboxUrl(null)}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
          <img
            src={lightboxUrl}
            alt="Foto de despacho"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
