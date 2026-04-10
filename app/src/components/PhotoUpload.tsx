import { useState, useRef, useEffect } from 'react'
import { Camera, Check, Loader2, X } from 'lucide-react'
import { uploadOrderPhoto, getSignedPhotoUrl } from '../lib/storage'

interface Props {
  orderId: string
  type: 'dispatch' | 'receipt' | 'invoice'
  existingPath?: string | null
  onUpload: (path: string) => void
  label?: string
  dark?: boolean
}

export function PhotoUpload({ orderId, type, existingPath, onUpload, label = 'Foto', dark = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [done, setDone] = useState(!!existingPath)

  useEffect(() => {
    if (existingPath) {
      getSignedPhotoUrl(existingPath).then(setPreviewUrl).catch(() => {})
    }
  }, [existingPath])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const path = await uploadOrderPhoto(file, orderId, type)
      const url = await getSignedPhotoUrl(path)
      setPreviewUrl(url)
      setDone(true)
      onUpload(path)
    } catch {
      // silent fail — user can retry
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const bgClass = dark
    ? 'bg-[#374151] hover:bg-[#4B5563] text-white'
    : 'bg-[var(--color-bg)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]'

  if (done && previewUrl) {
    return (
      <div className="relative inline-block">
        <img src={previewUrl} alt={label} className="w-16 h-16 rounded-lg object-cover" />
        <button
          onClick={() => { setDone(false); setPreviewUrl(null) }}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
        >
          <X size={10} />
        </button>
      </div>
    )
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
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
    </>
  )
}
