'use client'

import { useEffect, useRef, useState } from 'react'

import { uploadMediaFile } from '@/lib/artOfficial/uploadMedia'

export function ImageUpload({
  onUploaded,
  disabled = false,
  accept = 'image/jpeg,image/png,image/webp',
  altLabel,
}: {
  onUploaded: (mediaId: number) => void
  disabled?: boolean
  accept?: string
  altLabel?: string
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const id = await uploadMediaFile(file, altLabel)
      if (!mountedRef.current) return
      onUploaded(id)
    } catch (err) {
      if (!mountedRef.current) return
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      if (mountedRef.current) {
        setUploading(false)
        e.target.value = ''
      }
    }
  }

  return (
    <div className="art-official-chat__upload-input">
      <input
        type="file"
        accept={accept}
        disabled={disabled || uploading}
        onChange={handleChange}
      />
      {uploading ? <p className="art-official-chat__upload-hint">Uploading…</p> : null}
      {error ? <p className="art-official-chat__upload-error">{error}</p> : null}
    </div>
  )
}
