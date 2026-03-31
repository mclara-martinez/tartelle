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
      <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)] flex items-center justify-center">
            <span className="text-white font-semibold text-sm">T</span>
          </div>
          <span className="font-semibold text-[var(--color-text-primary)] tracking-tight">Tartelle Ops</span>
        </div>
        <nav className="flex items-center gap-1">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                current === id
                  ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]'
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
