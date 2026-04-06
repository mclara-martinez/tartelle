import { useState, useEffect, useCallback } from 'react'
import { Layout } from './components/Layout'
import { DashboardView } from './views/DashboardView'
import { OrdersView } from './views/OrdersView'
import { KitchenView } from './views/KitchenView'
import { InventoryView } from './views/InventoryView'
import { ProductionView } from './views/ProductionView'
import { OrderCreateView } from './views/OrderCreateView'

export type View = 'dashboard' | 'orders' | 'kitchen' | 'inventory' | 'production' | 'create'

const VALID_VIEWS: View[] = ['dashboard', 'orders', 'kitchen', 'inventory', 'production', 'create']

function viewFromHash(): View {
  const hash = window.location.hash.replace('#', '')
  return VALID_VIEWS.includes(hash as View) ? (hash as View) : 'dashboard'
}

export default function App() {
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

  // Kitchen = full-screen, no Layout wrapper
  if (view === 'kitchen') {
    return <KitchenView onBack={() => navigate('dashboard')} />
  }

  // Order create = full-screen POS mode
  if (view === 'create') {
    return <OrderCreateView onClose={() => navigate('orders')} />
  }

  const sidebarView = view

  return (
    <Layout current={sidebarView} onNavigate={navigate}>
      {view === 'dashboard' && (
        <DashboardView
          onNavigate={navigate}
          onSelectOrder={(id) => { navigate('orders'); setSelectedOrderId(id) }}
        />
      )}
      {view === 'orders' && (
        <OrdersView
          onNavigate={navigate}
          selectedOrderId={selectedOrderId}
          onSelectOrder={setSelectedOrderId}
        />
      )}
      {view === 'inventory' && <InventoryView />}
      {view === 'production' && <ProductionView />}
    </Layout>
  )
}
