'use client'

import { useState } from 'react'

export function ImageUpload({
  onUploaded,
}: {
  onUploaded: (mediaId: number) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const form = new FormData()
      form.append('file', file)
      form.append('alt', file.name)

      const res = await fetch('/api/media', { method: 'POST', body: form })
      if (!res.ok) {
        throw new Error(`Upload failed (${res.status})`)
      }
      const doc = await res.json()
      const id = doc.doc?.id ?? doc.id
      if (!id) throw new Error('No media id returned')
      onUploaded(Number(id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ margin: '16px 0', padding: 12, border: '1px dashed var(--theme-elevation-300)' }}>
      <p style={{ margin: '0 0 8px', fontSize: 13 }}>
        Upload the artwork image to continue cataloguing.
      </p>
      <input type="file" accept="image/*" disabled={uploading} onChange={handleChange} />
      {uploading ? <p style={{ fontSize: 12, marginTop: 8 }}>Uploading…</p> : null}
      {error ? (
        <p style={{ color: 'var(--theme-error-500)', fontSize: 12, marginTop: 8 }}>{error}</p>
      ) : null}
    </div>
  )
}
