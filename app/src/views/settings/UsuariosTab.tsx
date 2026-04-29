import { useState, useEffect } from 'react'
import { Plus, X, Shield } from 'lucide-react'
import { useAdminUsers } from '../../hooks/useAdminUsers'
import { useAuth } from '../../context/AuthContext'
import { Toast } from '../../components/Toast'
import { ROLE_LABELS } from '../../lib/constants'
import type { AppUser, AppRole } from '../../lib/types'

const ROLE_VALUES: AppRole[] = ['admin', 'kitchen', 'driver']

const ROLE_COLORS: Record<AppRole, { bg: string; text: string }> = {
  admin:   { bg: '#EDE9FE', text: '#5B21B6' },
  kitchen: { bg: '#D1FAE5', text: '#065F46' },
  driver:  { bg: '#DBEAFE', text: '#1E40AF' },
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function CreateUserModal({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (data: { email: string; password: string; role: AppRole }) => Promise<void>
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<AppRole>('kitchen')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) { setErr('Email y contraseña son obligatorios'); return }
    if (password.length < 8) { setErr('La contraseña debe tener al menos 8 caracteres'); return }
    setSaving(true)
    setErr(null)
    try {
      await onCreate({ email: email.trim(), password, role })
      onClose()
    } catch (e) {
      setErr((e as Error).message)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold">Nuevo usuario</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-surface-warm)] text-[var(--color-text-muted)]">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {err && (
            <p className="text-sm text-[var(--color-danger-text)] bg-[var(--color-danger-bg)] rounded-lg px-3 py-2">{err}</p>
          )}
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Email *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              placeholder="cocina@tartelle.co"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Contraseña *</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Rol</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as AppRole)}
              className="w-full text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              {ROLE_VALUES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-surface-warm)] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 text-sm font-medium bg-[var(--color-accent)] text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ChangeRoleModal({ user, onClose, onUpdate }: {
  user: AppUser
  onClose: () => void
  onUpdate: (role: AppRole) => Promise<void>
}) {
  const [role, setRole] = useState<AppRole>(user.role)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      await onUpdate(role)
      onClose()
    } catch (e) {
      setErr((e as Error).message)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold">Cambiar rol</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-surface-warm)] text-[var(--color-text-muted)]">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">{user.email}</p>
          {err && (
            <p className="text-sm text-[var(--color-danger-text)] bg-[var(--color-danger-bg)] rounded-lg px-3 py-2">{err}</p>
          )}
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Nuevo rol</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as AppRole)}
              className="w-full text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              {ROLE_VALUES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-surface-warm)] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 text-sm font-medium bg-[var(--color-accent)] text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function UsuariosTab() {
  const { user: currentUser } = useAuth()
  const { users, loading, error, createUser, updateRole, deactivateUser } = useAdminUsers()
  const [createOpen, setCreateOpen] = useState(false)
  const [roleModalUser, setRoleModalUser] = useState<AppUser | null>(null)
  const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  async function handleCreate(data: { email: string; password: string; role: AppRole }) {
    await createUser(data)
    setToast({ msg: 'Usuario creado correctamente', type: 'success' })
  }

  async function handleRoleUpdate(role: AppRole) {
    if (!roleModalUser) return
    await updateRole(roleModalUser.id, role)
    setToast({ msg: 'Rol actualizado', type: 'success' })
    setRoleModalUser(null)
  }

  async function handleDeactivate(id: string) {
    setActionLoading(id)
    try {
      await deactivateUser(id)
      setToast({ msg: 'Usuario desactivado', type: 'success' })
    } catch (e) {
      setToast({ msg: (e as Error).message, type: 'error' })
    }
    setActionLoading(null)
    setConfirmDeactivate(null)
  }

  if (loading) return <p className="text-sm text-[var(--color-text-muted)] pt-6">Cargando usuarios...</p>
  if (error) return <p className="text-sm text-[var(--color-danger-text)] bg-[var(--color-danger-bg)] rounded-lg p-3">{error}</p>

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--color-text-muted)]">{users.length} usuarios</span>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[var(--color-accent)] text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity min-h-[36px]"
        >
          <Plus size={14} />
          Nuevo usuario
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--color-surface-warm)] text-[var(--color-text-muted)] text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-left px-4 py-3 font-medium">Rol</th>
              <th className="text-left px-4 py-3 font-medium">Creado</th>
              <th className="text-left px-4 py-3 font-medium">Último acceso</th>
              <th className="text-left px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-[var(--color-text-muted)] text-sm">No hay usuarios</td>
              </tr>
            )}
            {users.map(u => {
              const isDeactivated = !!u.banned_until
              const isSelf = u.id === currentUser?.id
              const colors = ROLE_COLORS[u.role] ?? ROLE_COLORS.kitchen
              return (
                <tr key={u.id} className="bg-[var(--color-surface)] hover:bg-[var(--color-surface-warm)] transition-colors">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      {isSelf && <Shield size={12} className="text-[var(--color-accent)] shrink-0" aria-label="Tu cuenta" />}
                      {u.email}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: colors.bg, color: colors.text }}
                      >
                        {ROLE_LABELS[u.role]}
                      </span>
                      <button
                        onClick={() => setRoleModalUser(u)}
                        className="text-xs text-[var(--color-accent)] hover:underline"
                      >
                        Cambiar
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">{formatDate(u.last_sign_in_at)}</td>
                  <td className="px-4 py-3">
                    {isDeactivated ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[#FEE2E2] text-[#991B1B]">Desactivado</span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[#D1FAE5] text-[#065F46]">Activo</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!isDeactivated && !isSelf && (
                      confirmDeactivate === u.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-[var(--color-text-muted)]">¿Confirmar?</span>
                          <button
                            onClick={() => handleDeactivate(u.id)}
                            disabled={actionLoading === u.id}
                            className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {actionLoading === u.id ? '...' : 'Sí, desactivar'}
                          </button>
                          <button
                            onClick={() => setConfirmDeactivate(null)}
                            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeactivate(u.id)}
                          className="text-xs text-red-500 hover:text-red-700 hover:underline transition-colors"
                        >
                          Desactivar
                        </button>
                      )
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {createOpen && (
        <CreateUserModal
          onClose={() => setCreateOpen(false)}
          onCreate={handleCreate}
        />
      )}
      {roleModalUser && (
        <ChangeRoleModal
          user={roleModalUser}
          onClose={() => setRoleModalUser(null)}
          onUpdate={handleRoleUpdate}
        />
      )}
    </div>
  )
}
