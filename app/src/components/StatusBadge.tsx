import { STATUS_LABELS, STATUS_DOT_COLORS } from '../lib/constants'
import type { OrderStatus } from '../lib/types'

interface Props {
  status: OrderStatus
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'md' }: Props) {
  const textSize = size === 'sm' ? 'text-[11px]' : 'text-xs'
  return (
    <span className={`inline-flex items-center gap-1.5 ${textSize} font-medium text-[var(--color-text-secondary)]`}>
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: STATUS_DOT_COLORS[status] }}
      />
      {STATUS_LABELS[status]}
    </span>
  )
}
