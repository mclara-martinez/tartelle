import { useState, useEffect, useCallback } from 'react'
import { Layout } from './components/Layout'
import { DashboardView } from './views/DashboardView'
import { OrdersView } from './views/OrdersView'
import { KitchenView } from './views/KitchenView'
import { InventoryView } from './views/InventoryView'
import { IntakeWizardView } from './views/IntakeWizardView'

export type View = 'dashboard' | 'orders' | 'kitchen' | 'inventory' | 'intake'

const VALID_VIEWS: View[] = ['dashboard', 'orders', 'kitchen', 'inventory', 'intake']

function viewFromHash(): View {
  const hash = window.location.hash.replace('#', '')
  return VALID_VIEWS.includes(hash as View) ? (hash as View) : 'dashboard'
}

export default function App() {
  const [view, setView] = useState<View>(viewFromHash)

  const navigate = useCallback((v: View) => {
    setView(v)
    window.location.hash = v
  }, [])

  // Listen for browser back/forward
  useEffect(() => {
    function onHashChange() {
      setView(viewFromHash())
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Close wizard on Escape
  useEffect(() => {
    if (view !== 'intake') return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') navigate('orders')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view, navigate])

  // The sidebar view to highlight (orders when wizard is open)
  const sidebarView = view === 'intake' ? 'orders' : view
  const contentView = view === 'intake' ? 'orders' : view

  return (
    <>
      <Layout current={sidebarView} onNavigate={navigate}>
        {contentView === 'dashboard' && <DashboardView />}
        {contentView === 'orders' && <OrdersView onNavigate={navigate} />}
        {contentView === 'kitchen' && <KitchenView />}
        {contentView === 'inventory' && <InventoryView />}
      </Layout>

      {/* Wizard modal overlay */}
      {view === 'intake' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <IntakeWizardView onClose={() => navigate('orders')} />
          </div>
        </div>
      )}
    </>
  )
}
