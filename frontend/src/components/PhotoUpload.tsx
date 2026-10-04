import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Spinner } from './ui/LoadingState'

export const PROFILE_PHOTO_BUCKET = 'student-photos'
const MAX_SIZE = 3 * 1024 * 1024

interface PhotoUploadProps {
  value: string | null
  onChange: (url: string | null) => void
  folder?: string
}

function objectPathFromUrl(url: string): string | null {
  const marker = `/object/public/${PROFILE_PHOTO_BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + marker.length))
}

export default function PhotoUpload({ value, onChange, folder = 'students' }: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function removeObject(url: string) {
    const path = objectPathFromUrl(url)
    if (!path) return
    const { error } = await supabase.storage.from(PROFILE_PHOTO_BUCKET).remove([path])
    if (error) console.error('Failed to remove old photo:', error.message)
  }

  async function handleFileChange(file: File | undefined) {
    if (!file) return
    setError(null)
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    if (file.size > MAX_SIZE) {
      setError('Image must be 3 MB or smaller.')
      return
    }

    setUploading(true)
    try {
      const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
      const path = `${folder}/${Date.now()}-${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from(PROFILE_PHOTO_BUCKET)
        .upload(path, file, { cacheControl: '3600' })
      if (uploadError) throw new Error(uploadError.message)

      if (value) await removeObject(value)

      const { data } = supabase.storage.from(PROFILE_PHOTO_BUCKET).getPublicUrl(path)
      onChange(data.publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleRemove() {
    setError(null)
    if (value) {
      await removeObject(value)
      onChange(null)
    }
  }

  return (
    <div>
      <span className="block text-sm font-medium text-gray-700">Profile Photo</span>
      <div className="mt-2 flex items-center gap-4">
        {value ? (
          <img
            src={value}
            alt="Profile"
            className="h-20 w-20 rounded-full border border-gray-200 bg-gray-50 object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-gray-300 bg-gray-50 text-2xl font-semibold text-gray-400">
            ?
          </div>
        )}
        <div className="flex flex-col items-start gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading && <Spinner className="h-4 w-4" />}
              {uploading ? 'Uploading...' : value ? 'Replace photo' : 'Upload photo'}
            </button>
            {value && (
              <button
                type="button"
                disabled={uploading}
                onClick={handleRemove}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Remove
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400">JPG/PNG up to 3 MB. Stored in Supabase storage.</p>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => handleFileChange(e.target.files?.[0])}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}