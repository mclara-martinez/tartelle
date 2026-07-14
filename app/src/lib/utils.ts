import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), "d 'de' MMMM", { locale: es })
}

export function formatDateTime(dateStr: string): string {
  return format(parseISO(dateStr), "d MMM, h:mm a", { locale: es })
}

export function today(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function tomorrow(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return format(d, 'yyyy-MM-dd')
}

export function shiftDay(date: string, delta: number): string {
  const d = parseISO(date)
  d.setDate(d.getDate() + delta)
  return format(d, 'yyyy-MM-dd')
}

// Rango [inicio, fin] de un día de Bogotá (UTC−5 fijo, sin DST) para un 'yyyy-MM-dd',
// devuelto en ISO/UTC para consultas por created_at. El offset explícito hace que sea
// independiente del timezone del proceso (el servidor puede correr en UTC).
export function dayRangeISO(date: string): { start: string; end: string } {
  return {
    start: new Date(`${date}T00:00:00.000-05:00`).toISOString(),
    end: new Date(`${date}T23:59:59.999-05:00`).toISOString(),
  }
}

// Orden por hora estimada de entrega: sin hora al final. Compartido entre la
// vista del domiciliario y el modo Entregas de cocina.
export function compareByEstimatedTime(
  a: { estimated_delivery_time: string | null },
  b: { estimated_delivery_time: string | null }
): number {
  if (!a.estimated_delivery_time && !b.estimated_delivery_time) return 0
  if (!a.estimated_delivery_time) return 1
  if (!b.estimated_delivery_time) return -1
  return a.estimated_delivery_time.localeCompare(b.estimated_delivery_time)
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
