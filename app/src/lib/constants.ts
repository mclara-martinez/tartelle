import type { OrderChannel, OrderStatus, ProductSize, ProductCategory, PaymentStatus, PaymentMethod, PaymentBank, CardType } from './types'

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

export const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string; dot: string }> = {
  pending:       { bg: 'var(--color-status-pending-bg)',    text: 'var(--color-status-pending)',    dot: '#F59E0B' },
  confirmed:     { bg: 'var(--color-status-confirmed-bg)',  text: 'var(--color-status-confirmed)',  dot: '#3B82F6' },
  in_production: { bg: 'var(--color-status-production-bg)', text: 'var(--color-status-production)', dot: '#8B5CF6' },
  ready:         { bg: 'var(--color-status-ready-bg)',       text: 'var(--color-status-ready)',       dot: '#10B981' },
  dispatched:    { bg: 'var(--color-status-dispatched-bg)', text: 'var(--color-status-dispatched)', dot: '#F97316' },
  delivered:     { bg: 'var(--color-status-delivered-bg)',   text: 'var(--color-status-delivered)',   dot: '#6B7280' },
  cancelled:     { bg: 'var(--color-status-cancelled-bg)',  text: 'var(--color-status-cancelled)',  dot: '#EF4444' },
}

export const SIZE_LABELS: Record<ProductSize, string> = {
  grande: 'Grande',
  mediana: 'Mediana',
  mini: 'Mini',
  porcion: 'Porción',
  other: 'Otro',
}

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  tarta: 'Tarta',
  bites: 'Bites',
  cucheareable: 'Cucheareable',
  vela: 'Vela',
  torta: 'Torta',
  galleta: 'Galleta',
  brownie: 'Brownie',
  pan: 'Pan',
  otro: 'Otro',
}

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'pending', 'confirmed', 'in_production', 'ready', 'dispatched', 'delivered',
]

export const NEXT_STATUS_ACTION: Partial<Record<OrderStatus, { next: OrderStatus; label: string }>> = {
  pending:       { next: 'confirmed',     label: 'Confirmar' },
  confirmed:     { next: 'in_production', label: 'A producción' },
  in_production: { next: 'ready',         label: 'Marcar listo' },
  ready:         { next: 'dispatched',    label: 'Despachar' },
  dispatched:    { next: 'delivered',     label: 'Entregado' },
}

/** Kanban columns — only active statuses, no delivered/cancelled */
export const KANBAN_COLUMNS: { status: OrderStatus; label: string }[] = [
  { status: 'pending',       label: 'Pendiente' },
  { status: 'confirmed',     label: 'Confirmado' },
  { status: 'in_production', label: 'En producción' },
  { status: 'ready',         label: 'Listo' },
  { status: 'dispatched',    label: 'Despachado' },
]

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  credit: 'Crédito',
}

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, { bg: string; text: string }> = {
  pending: { bg: '#FEF3C7', text: '#92400E' },
  paid: { bg: '#D1FAE5', text: '#065F46' },
  credit: { bg: '#DBEAFE', text: '#1E40AF' },
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  transfer: 'Transferencia',
  cash: 'Efectivo',
  card: 'Tarjeta',
  rappi: 'Rappi',
}

export const PAYMENT_BANK_LABELS: Record<PaymentBank, string> = {
  bancolombia: 'Bancolombia',
  itau: 'Itaú',
  davivienda: 'Davivienda',
  nequi: 'Nequi',
  bbva: 'BBVA',
}

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  debit: 'Débito',
  credit: 'Crédito',
}

export const LOW_STOCK_THRESHOLD = 2

/** Legacy compat — some components may still reference these */
export const STATUS_DOT_COLORS: Record<OrderStatus, string> = Object.fromEntries(
  Object.entries(STATUS_COLORS).map(([k, v]) => [k, v.dot])
) as Record<OrderStatus, string>
