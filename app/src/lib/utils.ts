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

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
