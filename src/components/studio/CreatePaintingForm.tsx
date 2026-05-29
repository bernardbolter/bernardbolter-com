'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

const MEDIUMS = [
  { value: 'acrylic-on-canvas', label: 'Acrylic on canvas' },
  { value: 'acrylic-photo-transfer-on-canvas', label: 'Acrylic photo transfer on canvas' },
  { value: 'mixed-media-on-canvas', label: 'Mixed media on canvas' },
  { value: 'other', label: 'Other' },
]

export function CreatePaintingForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [medium, setMedium] = useState('acrylic-on-canvas')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/studio/artworks', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), medium }),
      })
      const data = (await res.json()) as { id?: number; error?: string }
      if (!res.ok || !data.id) {
        throw new Error(data.error || 'Could not create painting')
      }
      router.push(`/studio/paintings/${data.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="studio-form" onSubmit={onSubmit}>
      <div className="studio-form__field">
        <label htmlFor="painting-title">Title</label>
        <input
          id="painting-title"
          required
          value={title}
          disabled={submitting}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="studio-form__field">
        <label htmlFor="painting-medium">Medium</label>
        <select
          id="painting-medium"
          value={medium}
          disabled={submitting}
          onChange={(e) => setMedium(e.target.value)}
        >
          {MEDIUMS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="studio-form__error">{error}</p> : null}
      <button type="submit" className="studio-form__submit" disabled={submitting}>
        {submitting ? 'Creating…' : 'Create painting'}
      </button>
    </form>
  )
}
