import { useState, useRef, useEffect } from 'react'
import { Camera, Check, Loader2, X, Plus, ClipboardPaste } from 'lucide-react'
import { uploadOrderPhoto, getSignedPhotoUrl } from '../lib/storage'

interface Props {
  orderId: string
  type: 'dispatch' | 'receipt' | 'invoice'
  existingPath?: string | null
  onUpload: (path: string) => void
  label?: string
  dark?: boolean
  /** Render as a large drop zone with a visible "+" on drag-over and global Ctrl+V paste. Used for the payment receipt. */
  dropzone?: boolean
}

export function PhotoUpload({ orderId, type, existingPath, onUpload, label = 'Foto', dark = false, dropzone = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [done, setDone] = useState(!!existingPath)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (existingPath) {
      getSignedPhotoUrl(existingPath).then(setPreviewUrl).catch(() => {})
    }
  }, [existingPath])

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('El archivo no es una imagen.')
      return
    }
    setError(null)
    setUploading(true)
    try {
      const path = await uploadOrderPhoto(file, orderId, type)
      const url = await getSignedPhotoUrl(path)
      setPreviewUrl(url)
      setDone(true)
      onUpload(path)
    } catch {
      setError('No se pudo subir la imagen. Intenta de nuevo.')
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  // Extract an image File from a drag or paste event. Handles:
  // - real files (Finder, imagen descargada, app de WhatsApp de escritorio)
  // - imágenes arrastradas desde una página web con URL http(s) accesible (best-effort)
  async function fileFromDataTransfer(dt: DataTransfer): Promise<File | 'unreadable' | null> {
    const direct = Array.from(dt.files).find(f => f.type.startsWith('image/'))
    if (direct) return direct

    const url = dt.getData('text/uri-list') || dt.getData('text/plain')
    if (url && /^https?:\/\//i.test(url)) {
      try {
        const res = await fetch(url)
        const blob = await res.blob()
        if (blob.type.startsWith('image/')) {
          return new File([blob], `comprobante-${Date.now()}.jpg`, { type: blob.type })
        }
      } catch {
        // cross-origin / blob: URL de WhatsApp Web no se puede leer → cae a "unreadable"
      }
    }
    // Se soltó algo (p. ej. imagen de WhatsApp Web) pero no pudimos obtener el archivo
    if (dt.types.includes('text/uri-list') || dt.types.includes('text/html')) return 'unreadable'
    return null
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (uploading) return
    const result = await fileFromDataTransfer(e.dataTransfer)
    if (result === 'unreadable') {
      setError('No pude leer la imagen arrastrada. Copia la imagen (clic derecho → Copiar imagen) y pégala aquí con Ctrl+V.')
      return
    }
    if (result) handleFile(result)
  }

  function onPaste(e: React.ClipboardEvent) {
    if (uploading) return
    const file = Array.from(e.clipboardData.files).find(f => f.type.startsWith('image/'))
    if (file) {
      e.preventDefault()
      handleFile(file)
    }
  }

  // Modo dropzone: pegar desde cualquier parte del formulario + evitar que soltar
  // fuera de la zona haga que el navegador abra la imagen y se pierda el pedido.
  useEffect(() => {
    if (!dropzone || done) return

    function onWindowPaste(e: ClipboardEvent) {
      if (uploading || !e.clipboardData) return
      const file = Array.from(e.clipboardData.files).find(f => f.type.startsWith('image/'))
      if (file) {
        e.preventDefault()
        handleFile(file)
      }
    }
    function preventNav(e: DragEvent) {
      e.preventDefault()
    }

    window.addEventListener('paste', onWindowPaste)
    window.addEventListener('dragover', preventNav)
    window.addEventListener('drop', preventNav)
    return () => {
      window.removeEventListener('paste', onWindowPaste)
      window.removeEventListener('dragover', preventNav)
      window.removeEventListener('drop', preventNav)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropzone, done, uploading])

  const bgClass = dark
    ? 'bg-[#374151] hover:bg-[#4B5563] text-white'
    : 'bg-[var(--color-bg)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]'

  if (done && previewUrl) {
    return (
      <div className="relative inline-block">
        <img src={previewUrl} alt={label} className="w-16 h-16 rounded-lg object-cover" />
        <button
          onClick={() => { setDone(false); setPreviewUrl(null); setError(null) }}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
        >
          <X size={10} />
        </button>
      </div>
    )
  }

  // Zona de drop amplia con "+" visible (comprobante de pago)
  if (dropzone) {
    return (
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={onInputChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); if (!uploading) setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onPaste={onPaste}
          disabled={uploading}
          className={`w-full flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 min-h-[112px] text-center transition-colors disabled:opacity-60 ${
            dragOver
              ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]'
              : 'border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-text-muted)]'
          }`}
        >
          {uploading ? (
            <>
              <Loader2 size={28} className="animate-spin text-[var(--color-accent)]" />
              <span className="text-sm text-[var(--color-text-secondary)]">Subiendo…</span>
            </>
          ) : dragOver ? (
            <>
              <Plus size={32} className="text-[var(--color-accent)]" />
              <span className="text-sm font-semibold text-[var(--color-accent)]">Suelta la imagen aquí</span>
            </>
          ) : (
            <>
              <Plus size={28} className="text-[var(--color-text-muted)]" />
              <span className="text-sm font-medium text-[var(--color-text-primary)]">{label}</span>
              <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                <ClipboardPaste size={12} />
                Arrastra la imagen o pégala con Ctrl+V
              </span>
            </>
          )}
        </button>
        {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
      </div>
    )
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); if (!uploading) setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onPaste={onPaste}
      className={`inline-flex rounded-lg transition-shadow ${dragOver ? 'ring-2 ring-[var(--color-accent)]' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onInputChange}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title="Click, arrastra o pega (Ctrl+V) una imagen"
        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] min-w-[44px] ${bgClass} disabled:opacity-50`}
      >
        {uploading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : done ? (
          <Check size={16} className="text-green-500" />
        ) : (
          <Camera size={16} />
        )}
        {label}
      </button>
    </div>
  )
}
