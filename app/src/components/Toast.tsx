import { useEffect, useState } from 'react'
import { CheckCircle, AlertCircle, X } from 'lucide-react'

interface Props {
  message: string
  type?: 'success' | 'error'
  onClose: () => void
}

export function Toast({ message, type = 'success', onClose }: Props) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300)
    }, 3500)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-3 py-2.5 rounded-md shadow-[var(--shadow-dropdown)] border transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} ${type === 'success' ? 'bg-[var(--color-success-light)] border-[var(--color-success)] text-[var(--color-success)]' : 'bg-[var(--color-danger-light)] border-[var(--color-danger)] text-[var(--color-danger)]'}`}
    >
      {type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={() => { setVisible(false); setTimeout(onClose, 300) }} aria-label="Cerrar notificación" className="ml-2 opacity-60 hover:opacity-100 min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2">
        <X size={14} />
      </button>
    </div>
  )
}
