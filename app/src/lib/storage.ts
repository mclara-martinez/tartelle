import { supabase } from './supabase'

const BUCKET = 'order-photos'
const MAX_WIDTH = 1200
const JPEG_QUALITY = 0.8

/** Compress image client-side before upload */
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width)
        width = MAX_WIDTH
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas not supported'))
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
        'image/jpeg',
        JPEG_QUALITY,
      )
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

/** Upload a photo to the order-photos bucket. Returns the storage path. */
export async function uploadOrderPhoto(
  file: File,
  orderId: string,
  type: 'dispatch' | 'receipt' | 'invoice',
): Promise<string> {
  const compressed = await compressImage(file)
  const ext = 'jpg'
  const path = `${orderId}/${type}-${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, { contentType: 'image/jpeg', upsert: false })

  if (error) throw new Error(error.message)
  return path
}

/** Get a signed URL for a private photo (valid 1 hour). */
export async function getSignedPhotoUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600)

  if (error || !data?.signedUrl) throw new Error(error?.message ?? 'Failed to get signed URL')
  return data.signedUrl
}
