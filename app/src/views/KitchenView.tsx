import { useState } from 'react'
import { ArrowLeft, ClipboardList, Truck, ShoppingBag, Lock } from 'lucide-react'
import { KitchenProductionMode } from './kitchen/KitchenProductionMode'
import { KitchenDispatchMode } from './kitchen/KitchenDispatchMode'
import { KitchenSalesMode } from './kitchen/KitchenSalesMode'
import { DayClosureView } from './DayClosureView'

type KitchenMode = 'production' | 'dispatch' | 'sales' | 'closure'

interface Props {
  onBack: () => void
}

export function KitchenView({ onBack }: Props) {
  const [mode, setMode] = useState<KitchenMode>('production')

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] rounded-lg transition-colors" aria-label="Volver">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-[var(--color-text-primary)] text-lg font-bold tracking-wide">COCINA</h1>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-[var(--color-surface-warm)] p-1 rounded-lg">
          <button
            onClick={() => setMode('production')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[40px] ${
              mode === 'production'
                ? 'bg-[var(--color-status-production)] text-white'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <ClipboardList size={16} />
            Producir
          </button>
          <button
            onClick={() => setMode('dispatch')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[40px] ${
              mode === 'dispatch'
                ? 'bg-[var(--color-status-confirmed)] text-white'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <Truck size={16} />
            Entregas
          </button>
          <button
            onClick={() => setMode('sales')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[40px] ${
              mode === 'sales'
                ? 'bg-[var(--color-status-pending)] text-white'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <ShoppingBag size={16} />
            Ventas
          </button>
          <button
            onClick={() => setMode('closure')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[40px] ${
              mode === 'closure'
                ? 'bg-white text-[var(--color-text-primary)] shadow-sm ring-1 ring-[var(--color-border)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <Lock size={16} />
            Cierre
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {mode === 'production' ? <KitchenProductionMode />
          : mode === 'dispatch' ? <KitchenDispatchMode />
          : mode === 'sales' ? <KitchenSalesMode />
          : <div className="min-h-full p-4"><DayClosureView /></div>}
      </div>
    </div>
  )
}
