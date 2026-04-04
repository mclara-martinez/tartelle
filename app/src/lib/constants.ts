import type { OrderChannel, OrderStatus, ProductSize } from './types'

export const DELIVERY_FEE = 8000

export const CHANNEL_LABELS: Record<OrderChannel, string> = {
  whatsapp: 'WhatsApp',
  rappi: 'Rappi',
  instagram: 'Instagram',
  walk_in: 'Local',
  b2b: 'Restaurante',
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  in_production: 'En producción',
  ready: 'Listo',
  dispatched: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

export const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]',
  confirmed: 'bg-[var(--color-teal-light)] text-[var(--color-teal)]',
  in_production: 'bg-[var(--color-info-light)] text-[var(--color-info)]',
  ready: 'bg-[var(--color-teal-light)] text-[var(--color-teal-dark)]',
  dispatched: 'bg-[var(--color-gold-light)] text-[var(--color-gold-dark)]',
  delivered: 'bg-[var(--color-bg)] text-[var(--color-text-muted)]',
  cancelled: 'bg-[var(--color-danger-light)] text-[var(--color-danger)]',
}

export const SIZE_LABELS: Record<ProductSize, string> = {
  grande: 'Grande',
  mediana: 'Mediana',
  mini: 'Mini',
}

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'pending', 'confirmed', 'in_production', 'ready', 'dispatched', 'delivered',
]

export const LOW_STOCK_THRESHOLD = 2

export const STATUS_DOT_COLORS: Record<OrderStatus, string> = {
  pending: '#D4A017',
  confirmed: '#1A6B5A',
  in_production: '#3B7CB8',
  ready: '#15803D',
  dispatched: '#B8923A',
  delivered: '#9CA3AF',
  cancelled: '#B54848',
}
