import type { OrderChannel, OrderStatus, ProductSize, ProductCategory, ProductCatalog, TaxType, PaymentStatus, PaymentMethod, PaymentBank, AppRole } from './types'

export const DELIVERY_FEE = 8000

export const CHANNEL_LABELS: Record<OrderChannel, string> = {
  whatsapp:  'WhatsApp',
  rappi:     'Rappi',
  didi:      'Didi',
  instagram: 'Instagram',
  walk_in:   'Local',
  b2b:       'Restaurante',
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  confirmed:     'Confirmado',
  in_production: 'En cocina',
  ready:         'Listo',
  dispatched:    'En camino',
  delivered:     'Entregado',
  cancelled:     'Cancelado',
}

export const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string; dot: string }> = {
  confirmed:     { bg: 'var(--color-status-confirmed-bg)',  text: 'var(--color-status-confirmed)',  dot: '#3B82F6' },
  in_production: { bg: 'var(--color-status-production-bg)', text: 'var(--color-status-production)', dot: '#8B5CF6' },
  ready:         { bg: 'var(--color-status-ready-bg)',       text: 'var(--color-status-ready)',       dot: '#10B981' },
  dispatched:    { bg: 'var(--color-status-dispatched-bg)', text: 'var(--color-status-dispatched)', dot: '#F97316' },
  delivered:     { bg: 'var(--color-status-delivered-bg)',   text: 'var(--color-status-delivered)',   dot: '#6B7280' },
  cancelled:     { bg: 'var(--color-status-cancelled-bg)',  text: 'var(--color-status-cancelled)',  dot: '#EF4444' },
}

export const SIZE_LABELS: Record<ProductSize, string> = {
  grande:  'Grande',
  mediana: 'Mediana',
  mini:    'Mini',
  porcion: 'Porción',
  other:   'Otro',
  unidad:  'Unidad',
  x4:      'x4',
  x8:      'x8',
  x12:     'x12',
  x16:     'x16',
  x20:     'x20',
  x35:     'x35',
  x41:     'x41',
  x49:     'x49',
  '320g':  '320g',
  NA:      'N/A',
}

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  tartas:        'Tartas',
  bites:         'Bites',
  cucheareables: 'Cuchareables',
  tortas:        'Torta en Capacillo',
  galletas:      'Galletas',
  brownies:      'Brownies',
  complementos:  'Complementos',
  duos:          'Dúos',
  naisha:        'Naisha',
  catering:      'Catering',
}

export const PRODUCT_CATEGORY_ORDER: ProductCategory[] = [
  'tartas', 'bites', 'tortas', 'cucheareables', 'galletas', 'complementos', 'duos', 'brownies', 'naisha', 'catering',
]

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'confirmed', 'in_production', 'ready', 'dispatched', 'delivered',
]

export const NEXT_STATUS_ACTION: Partial<Record<OrderStatus, { next: OrderStatus; label: string }>> = {
  confirmed:     { next: 'in_production', label: 'A cocina' },
  in_production: { next: 'ready',         label: 'Marcar listo' },
  ready:         { next: 'dispatched',    label: 'Despachar' },
  dispatched:    { next: 'delivered',     label: 'Entregado' },
}

/** Kanban columns — only active statuses, no delivered/cancelled */
export const KANBAN_COLUMNS: { status: OrderStatus; label: string }[] = [
  { status: 'confirmed',     label: 'Confirmados' },
  { status: 'in_production', label: 'En cocina' },
  { status: 'ready',         label: 'Listo' },
  { status: 'dispatched',    label: 'En camino' },
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
  bold: 'Link Bold',
  rappi: 'Rappi',
  credit: 'Crédito',
}

export const PAYMENT_BANK_LABELS: Record<PaymentBank, string> = {
  bancolombia: 'Bancolombia',
  itau: 'Itaú',
  davivienda: 'Davivienda',
  nequi: 'Nequi',
  bbva: 'BBVA',
}

export const LOW_STOCK_THRESHOLD = 2

export const CATALOG_LABELS: Record<ProductCatalog, string> = {
  retail:     'Retail',
  eventos:    'Eventos',
  ambos:      'Ambos',
  velez_cafe: 'Vélez Café',
}

export const TAX_TYPE_LABELS: Record<NonNullable<TaxType>, string> = {
  impoconsumo_8: 'Impoconsumo 8%',
  iva_19:        'IVA 19%',
  iva_0:         'IVA 0%',
}

export const ROLE_LABELS: Record<AppRole, string> = {
  admin:   'Administrador',
  kitchen: 'Cocina',
  driver:  'Domiciliario',
  owner:   'Propietaria',
}

export const STATUS_DOT_COLORS: Record<OrderStatus, string> = Object.fromEntries(
  Object.entries(STATUS_COLORS).map(([k, v]) => [k, v.dot])
) as Record<OrderStatus, string>
