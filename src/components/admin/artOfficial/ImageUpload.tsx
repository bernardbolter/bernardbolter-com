'use client'

import { useState } from 'react'

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

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const id = await uploadMediaFile(file, altLabel)
      onUploaded(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
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
