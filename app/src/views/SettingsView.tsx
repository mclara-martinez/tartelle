import { useState } from 'react'
import { Settings } from 'lucide-react'
import { CatalogoTab } from './settings/CatalogoTab'
import { UsuariosTab } from './settings/UsuariosTab'

type Tab = 'catalogo' | 'usuarios'

export function SettingsView() {
  const [tab, setTab] = useState<Tab>('catalogo')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-[var(--color-text-secondary)]" strokeWidth={1.5} />
        <div>
          <h1 className="text-xl font-bold">Ajustes</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Administración</p>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-[var(--color-surface-warm)] rounded-lg w-fit border border-[var(--color-border)]">
        {(['catalogo', 'usuarios'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 ${
              tab === t
                ? 'bg-white text-[var(--color-text-primary)] shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {t === 'catalogo' ? 'Catálogo' : 'Usuarios'}
          </button>
        ))}
      </div>

      {tab === 'catalogo' ? <CatalogoTab /> : <UsuariosTab />}
    </div>
  )
}
