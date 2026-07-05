import { STATUS_LABELS, STATUS_COLORS } from '../lib/constants'
import type { OrderStatus } from '../lib/types'

interface Props {
  status: OrderStatus
  size?: 'sm' | 'md'
}

// La DB puede traer estados legacy que ya no existen en OrderStatus (p.ej. 'pending'
// de datos importados). Sin fallback, un solo pedido legacy tumba la vista completa.
const FALLBACK_COLORS = { bg: 'var(--color-bg-hover)', text: 'var(--color-text-secondary)' }

/** RestoFlow badge pattern: rounded-full px-2.5 py-0.5 text-xs font-medium */
export function StatusBadge({ status, size = 'md' }: Props) {
  const colors = STATUS_COLORS[status] ?? FALLBACK_COLORS
  const cls = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-0.5'
  return (
    <span
      className={`inline-flex items-center ${cls} font-medium rounded-full`}
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}
