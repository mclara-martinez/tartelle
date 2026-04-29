import { useState } from 'react'
import { ShoppingBag, LayoutDashboard, ChefHat, Package, ClipboardList, Settings, Menu, X, LogOut } from 'lucide-react'
import type { View } from '../App'
import { useAuth } from '../context/AuthContext'

interface Props {
  current: View
  onNavigate: (v: View) => void
  onSignOut: () => void
  children: React.ReactNode
}

const NAV = [
  { id: 'dashboard' as View, label: 'Panel', icon: LayoutDashboard },
  { id: 'orders' as View, label: 'Pedidos', icon: ShoppingBag },
  { id: 'production' as View, label: 'Produccion', icon: ClipboardList },
  { id: 'inventory' as View, label: 'Inventario', icon: Package },
  { id: 'kitchen' as View, label: 'Cocina', icon: ChefHat },
  { id: 'settings' as View, label: 'Ajustes', icon: Settings },
]

function SidebarContent({ current, onNavigate, onSignOut, onItemClick }: {
  current: View
  onNavigate: (v: View) => void
  onSignOut: () => void
  onItemClick?: () => void
}) {
  const { user } = useAuth()

  return (
    <div className="flex flex-col h-full">
      {/* Logo — large icon + bold name, generous top padding */}
      <div className="px-5 pt-7 pb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)] flex items-center justify-center">
          <span className="text-white font-bold text-base">T</span>
        </div>
        <span className="text-[var(--color-text-primary)] font-bold text-lg">Tartelle</span>
      </div>

      {/* User info — with border separator */}
      <div className="px-5 pb-4 mb-2 border-b border-[var(--color-border-light)]">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">Administrador</p>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">{user?.email}</p>
      </div>

      {/* Nav — generous spacing between items like RestoFlow */}
      <nav className="flex-1 px-3 py-3 space-y-2" aria-label="Navegacion principal">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = current === id
          return (
            <button
              key={id}
              onClick={() => { onNavigate(id); onItemClick?.() }}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-lg text-sm transition-colors duration-200 text-left ${
                active
                  ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)] font-semibold'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] font-medium'
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} />
              {label}
              {id === 'kitchen' && (
                <span className="ml-auto text-[10px] text-[var(--color-text-muted)] font-normal">Tablet</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-[var(--color-border-light)]">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3.5 px-4 py-3 rounded-lg text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] transition-colors duration-200 text-left"
        >
          <LogOut className="h-5 w-5" strokeWidth={1.75} />
          Cerrar sesion
        </button>
      </div>
    </div>
  )
}

export function Layout({ current, onNavigate, onSignOut, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-[var(--color-bg)]">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:text-sm">
        Ir al contenido principal
      </a>

      {/* Desktop sidebar — w-60 = 240px */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-60 bg-white border-r border-[var(--color-border)] flex-col">
        <SidebarContent current={current} onNavigate={onNavigate} onSignOut={onSignOut} />
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-[var(--color-border)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)] flex items-center justify-center">
            <span className="text-white font-bold text-xs">T</span>
          </div>
          <span className="text-[var(--color-text-primary)] font-bold text-base">Tartelle</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? 'Cerrar menu' : 'Abrir menu'}
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-enter" onClick={() => setSidebarOpen(false)} />
          <aside className="lg:hidden fixed inset-y-0 left-0 z-50 w-60 bg-white shadow-xl flex flex-col">
            <SidebarContent current={current} onNavigate={onNavigate} onSignOut={onSignOut} onItemClick={() => setSidebarOpen(false)} />
          </aside>
        </>
      )}

      {/* Main content */}
      <main id="main-content" className="flex-1 lg:ml-60 p-4 pt-16 lg:p-6 lg:pt-6">
        {children}
      </main>
    </div>
  )
}
