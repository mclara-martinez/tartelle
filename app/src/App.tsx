import { useState } from 'react'
import { Layout } from './components/Layout'
import { DashboardView } from './views/DashboardView'
import { OrdersView } from './views/OrdersView'
import { KitchenView } from './views/KitchenView'
import { InventoryView } from './views/InventoryView'

type View = 'dashboard' | 'orders' | 'kitchen' | 'inventory'

export default function App() {
  const [view, setView] = useState<View>('dashboard')
  return (
    <Layout current={view} onNavigate={setView}>
      {view === 'dashboard' && <DashboardView />}
      {view === 'orders' && <OrdersView />}
      {view === 'kitchen' && <KitchenView />}
      {view === 'inventory' && <InventoryView />}
    </Layout>
  )
}
