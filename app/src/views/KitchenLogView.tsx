import { useState, useEffect } from 'react'
import { useQualityLogs } from '../hooks/useQualityLog'
import { useComponentLogs } from '../hooks/useComponentLog'
import type { ComponentLogEntry } from '../hooks/useComponentLog'
import { getSignedPhotoUrl } from '../lib/storage'
import { today } from '../lib/utils'
import { format, parseISO, addDays, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ClipboardCheck, ChevronLeft, ChevronRight,
  CheckCircle, AlertTriangle, Camera, Package,
} from 'lucide-react'
import type { QualityLog } from '../lib/types'

export function KitchenLogView() {
  const [selectedDate, setSelectedDate] = useState(today())
  const { logs, loading }                           = useQualityLogs(selectedDate)
  const { logs: componentLogs, loading: loadingComponents } = useComponentLogs(selectedDate)

  const okLogs     = logs.filter(l => l.items_fallidos.length === 0)
  const failedLogs = logs.filter(l => l.items_fallidos.length > 0)

  function dateLabel(d: string) {
    if (d === today()) return 'Hoy'
    return format(parseISO(d), "EEE d MMM", { locale: es })
  }
  function prev() { setSelectedDate(d => format(subDays(parseISO(d), 1), 'yyyy-MM-dd')) }
  function next() { setSelectedDate(d => format(addDays(parseISO(d), 1), 'yyyy-MM-dd')) }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-6 w-6 text-[var(--color-text-secondary)]" strokeWidth={1.5} />
          <div>
            <h1 className="text-xl font-bold">Registro de cocina</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Calidad · Componentes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prev} className="p-2 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold w-24 text-center tabular-nums">{dateLabel(selectedDate)}</span>
          <button onClick={next} className="p-2 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* — Calidad — */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Registros de calidad</h2>
            <div className="flex items-center gap-2 text-xs">
              {okLogs.length > 0 && (
                <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full font-medium">
                  {okLogs.length} OK
                </span>
              )}
              {failedLogs.length > 0 && (
                <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded-full font-medium">
                  {failedLogs.length} con falla
                </span>
              )}
            </div>
          </div>
          {loading ? (
            <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
          ) : logs.length === 0 ? (
            <EmptySection text="Sin registros de calidad para esta fecha" />
          ) : (
            <div className="space-y-2">
              {logs.map(log => <QualityLogCard key={log.id} log={log} />)}
            </div>
          )}
        </section>

        {/* — Componentes — */}
        <section>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">Componentes producidos</h2>
          {loadingComponents ? (
            <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
          ) : componentLogs.length === 0 ? (
            <EmptySection
              text="Sin componentes registrados"
              icon={<Package className="h-5 w-5 text-[var(--color-text-muted)] mx-auto mb-2" strokeWidth={1.5} />}
            />
          ) : (
            <div className="bg-white border border-[var(--color-border)] rounded-lg overflow-hidden">
              <div className="divide-y divide-[var(--color-border-light)]">
                {componentLogs.map(entry => <ComponentLogRow key={entry.id} entry={entry} />)}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function EmptySection({ text, icon }: { text: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-lg px-4 py-8 text-center">
      {icon}
      <p className="text-sm text-[var(--color-text-muted)]">{text}</p>
    </div>
  )
}

function QualityLogCard({ log }: { log: QualityLog }) {
  const isOk  = log.items_fallidos.length === 0
  const time  = new Date(log.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  const label = log.product?.flavor ?? log.product_id

  return (
    <div className={`bg-white border rounded-lg overflow-hidden ${isOk ? 'border-[var(--color-border)]' : 'border-red-200'}`}>
      <div className={`px-4 py-3 flex items-start justify-between gap-3 ${!isOk ? 'bg-red-50' : ''}`}>
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          {isOk
            ? <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
            : <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          }
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium capitalize">{label}</p>
            {isOk ? (
              <p className="text-xs text-green-600 mt-0.5">Todo OK</p>
            ) : (
              <div className="mt-1 space-y-1">
                <p className="text-xs text-red-600 font-medium">Falló: {log.items_fallidos.join(', ')}</p>
                {log.observacion && (
                  <p className="text-xs text-[var(--color-text-secondary)] bg-red-50 rounded px-2 py-1 border border-red-100">
                    {log.observacion}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-[var(--color-text-muted)] tabular-nums">{time}</p>
          {log.user_email && (
            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 max-w-[100px] truncate">
              {log.user_email.split('@')[0]}
            </p>
          )}
        </div>
      </div>
      {log.photo_path && (
        <div className="px-4 pb-3 pt-2 border-t border-[var(--color-border-light)] flex items-center gap-2">
          <Camera size={12} className="text-[var(--color-text-muted)]" />
          <PhotoThumb path={log.photo_path} />
        </div>
      )}
    </div>
  )
}

function ComponentLogRow({ entry }: { entry: ComponentLogEntry }) {
  const time = new Date(entry.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  return (
    <div className="px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">{entry.nombre}</p>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{entry.cantidad_descripcion}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs text-[var(--color-text-muted)] tabular-nums">{time}</p>
        {entry.user_email && (
          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 max-w-[100px] truncate">
            {entry.user_email.split('@')[0]}
          </p>
        )}
      </div>
    </div>
  )
}

function PhotoThumb({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    getSignedPhotoUrl(path).then(setUrl).catch(() => {})
  }, [path])

  if (!url) return <div className="w-16 h-16 rounded-lg bg-[var(--color-bg-hover)] animate-pulse" />
  return <img src={url} alt="Foto del lote" className="w-16 h-16 rounded-lg object-cover border border-[var(--color-border)]" />
}
