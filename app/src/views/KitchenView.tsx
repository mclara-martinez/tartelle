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
    <div className="min-h-screen bg-[#111827] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#1F2937] border-b border-[#374151]">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors" aria-label="Volver">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-white text-lg font-bold tracking-wide">COCINA</h1>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-[#374151] p-1 rounded-lg">
          <button
            onClick={() => setMode('production')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[40px] ${
              mode === 'production'
                ? 'bg-[#7C3AED] text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ClipboardList size={16} />
            Produccion
          </button>
          <button
            onClick={() => setMode('dispatch')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[40px] ${
              mode === 'dispatch'
                ? 'bg-[#2563EB] text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Truck size={16} />
            Despacho
          </button>
          <button
            onClick={() => setMode('sales')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[40px] ${
              mode === 'sales'
                ? 'bg-[#D97706] text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ShoppingBag size={16} />
            Ventas
          </button>
          <button
            onClick={() => setMode('closure')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[40px] ${
              mode === 'closure'
                ? 'bg-[#374151] text-white ring-1 ring-white/20'
                : 'text-gray-400 hover:text-white'
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
          : <div className="bg-[var(--color-bg)] min-h-full p-4"><DayClosureView /></div>}
      </div>
    </div>
  )
}
