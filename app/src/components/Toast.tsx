import { useEffect, useState } from 'react'
import { CheckCircle, AlertCircle, X } from 'lucide-react'

interface Props {
  message: string
  type?: 'success' | 'error'
  onClose: () => void
}

/** RestoFlow toast: fixed top-center, auto-dismiss 4s, slide-in-from-top */
export function Toast({ message, type = 'success', onClose }: Props) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 150)
    }, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-50 flex justify-center transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <div className={`mx-4 mt-4 flex items-center gap-2 rounded-lg px-5 py-3 shadow-lg ${
        type === 'success'
          ? 'bg-[var(--color-success-bg)] text-[var(--color-success-text)]'
          : 'bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]'
      }`}>
        {type === 'success'
          ? <CheckCircle className="h-4 w-4 flex-shrink-0" />
          : <AlertCircle className="h-4 w-4 flex-shrink-0" />
        }
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={() => { setVisible(false); setTimeout(onClose, 150) }}
          aria-label="Cerrar notificacion"
          className="ml-1 opacity-60 hover:opacity-100 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
