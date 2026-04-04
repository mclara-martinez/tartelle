import { useState } from 'react'
import { ShoppingBag, LayoutDashboard, ChefHat, Package, Menu, X } from 'lucide-react'

import type { View } from '../App'

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

function SidebarContent({ current, onNavigate, onItemClick }: {
  current: View
  onNavigate: (v: View) => void
  onItemClick?: () => void
}) {
  return (
    <>
      {/* Logo */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-md bg-[var(--color-teal)] border border-[var(--color-gold)]/30 flex items-center justify-center">
          <span className="text-[var(--color-gold)] font-bold text-xs tracking-wider">T</span>
        </div>
        <div className="flex flex-col">
          <span className="text-white font-semibold text-[13px] tracking-widest uppercase">Tartelle</span>
          <span className="text-[var(--color-sidebar-text)] text-[9px] tracking-wide uppercase">Ops</span>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-2 space-y-0.5" aria-label="Navegación principal">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { onNavigate(id); onItemClick?.() }}
            aria-label={label}
            aria-current={current === id ? 'page' : undefined}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors text-left ${
              current === id
                ? 'bg-[var(--color-sidebar-active)] text-white'
                : 'text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)] hover:text-white'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>
    </>
  )
}

export function Layout({ current, onNavigate, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-[var(--color-bg)]">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:text-sm">
        Ir al contenido principal
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-[220px] bg-[var(--color-sidebar-bg)] flex-col border-r border-[#2A3346]">
        <SidebarContent current={current} onNavigate={onNavigate} />
      </aside>

      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[var(--color-sidebar-bg)] px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[var(--color-teal)] border border-[var(--color-gold)]/30 flex items-center justify-center">
            <span className="text-[var(--color-gold)] font-bold text-[10px] tracking-wider">T</span>
          </div>
          <span className="text-white font-semibold text-[13px] tracking-widest uppercase">Tartelle</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
          className="text-[var(--color-sidebar-text)] hover:text-white p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="md:hidden fixed inset-y-0 left-0 z-50 w-[220px] bg-[var(--color-sidebar-bg)] flex flex-col">
            <SidebarContent current={current} onNavigate={onNavigate} onItemClick={() => setSidebarOpen(false)} />
          </aside>
        </>
      )}

      {/* Main content */}
      <main id="main-content" className="flex-1 md:ml-[220px] p-5 pt-16 md:pt-5 max-w-[1200px]">
        {children}
      </main>
    </div>
  )
}
