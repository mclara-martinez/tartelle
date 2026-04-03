import { ShoppingBag, LayoutDashboard, ChefHat, Package } from 'lucide-react'

type View = 'dashboard' | 'orders' | 'kitchen' | 'inventory'

interface Props {
  current: View
  onNavigate: (v: View) => void
  children: React.ReactNode
}

const NAV = [
  { id: 'dashboard' as View, label: 'Resumen', icon: LayoutDashboard },
  { id: 'orders' as View, label: 'Pedidos', icon: ShoppingBag },
  { id: 'kitchen' as View, label: 'Cocina', icon: ChefHat },
  { id: 'inventory' as View, label: 'Inventario', icon: Package },
]

export function Layout({ current, onNavigate, children }: Props) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      {/* Top bar */}
      <header className="bg-[var(--color-teal-dark)] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Tartelle logo — teal circle with gold text */}
          <div className="w-9 h-9 rounded-full bg-[var(--color-teal)] border-2 border-[var(--color-gold)]/30 flex items-center justify-center">
            <span className="text-[var(--color-gold)] font-bold text-sm tracking-wider">T</span>
          </div>
          <div className="flex flex-col">
            <span className="text-white font-semibold text-sm tracking-widest uppercase">Tartelle</span>
            <span className="text-white/40 text-[10px] tracking-wide uppercase">Ops</span>
          </div>
        </div>
        <nav className="flex items-center gap-1">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                current === id
                  ? 'bg-white/15 text-white'
                  : 'text-white/50 hover:bg-white/8 hover:text-white/80'
              }`}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
