import { useState, useEffect, useCallback } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Layout } from './components/Layout'
import { LoginView } from './views/LoginView'
import { DashboardView } from './views/DashboardView'
import { OrdersView } from './views/OrdersView'
import { KitchenView } from './views/KitchenView'
import { InventoryView } from './views/InventoryView'
import { ProductionView } from './views/ProductionView'
import { OrderCreateView } from './views/OrderCreateView'
import { DomiciliarioView } from './views/DomiciliarioView'
import { SettingsView } from './views/SettingsView'

export type View = 'dashboard' | 'orders' | 'kitchen' | 'inventory' | 'production' | 'create' | 'domiciliario' | 'settings'

const VALID_VIEWS: View[] = ['dashboard', 'orders', 'kitchen', 'inventory', 'production', 'create', 'domiciliario', 'settings']

function viewFromHash(): View {
  const hash = window.location.hash.replace('#', '')
  return VALID_VIEWS.includes(hash as View) ? (hash as View) : 'dashboard'
}

function AppContent() {
  const { user, role, loading, signOut } = useAuth()
  const [view, setView] = useState<View>(viewFromHash)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  const navigate = useCallback((v: View) => {
    setView(v)
    window.location.hash = v
    if (v !== 'orders') setSelectedOrderId(null)
  }, [])

  useEffect(() => {
    function onHashChange() { setView(viewFromHash()) }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <LoginView />
  }

  // Kitchen role: tablet-only view
  if (role === 'kitchen') {
    return <KitchenView onBack={() => {}} />
  }

  // Driver role: delivery view only
  if (role === 'driver') {
    return <DomiciliarioView />
  }

  // Admin role: full app with hash routing
  // Guard: if admin navigates to domiciliario hash, redirect to dashboard
  const safeView = view === 'domiciliario' ? 'dashboard' : view

  if (safeView === 'kitchen') {
    return <KitchenView onBack={() => navigate('dashboard')} />
  }

  if (safeView === 'create') {
    return <OrderCreateView onClose={() => navigate('orders')} />
  }

  return (
    <Layout current={safeView} onNavigate={navigate} onSignOut={signOut}>
      {safeView === 'dashboard' && (
        <DashboardView
          onNavigate={navigate}
          onSelectOrder={(id) => { navigate('orders'); setSelectedOrderId(id) }}
        />
      )}
      {safeView === 'orders' && (
        <OrdersView
          onNavigate={navigate}
          selectedOrderId={selectedOrderId}
          onSelectOrder={setSelectedOrderId}
        />
      )}
      {safeView === 'inventory' && <InventoryView />}
      {safeView === 'production' && <ProductionView />}
      {safeView === 'settings' && <SettingsView />}
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
