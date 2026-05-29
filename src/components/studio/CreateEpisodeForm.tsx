'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

const SERIES = [
  { value: 'outsider-art-review', label: 'Outsider Art Review' },
  { value: 'rap-critic', label: 'Rap Critic' },
  { value: 'studio-fails', label: 'Studio Fails' },
  { value: 'studio-series', label: 'Studio Series' },
]

export function CreateEpisodeForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [series, setSeries] = useState('studio-series')
  const [concept, setConcept] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/studio/episodes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), series, concept: concept.trim() || undefined }),
      })
      const data = (await res.json()) as { id?: number; error?: string }
      if (!res.ok || !data.id) throw new Error(data.error || 'Create failed')
      router.push(`/studio/episodes/${data.id}`)
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
        <label htmlFor="episode-title">Title</label>
        <input
          id="episode-title"
          required
          value={title}
          disabled={submitting}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="studio-form__field">
        <label htmlFor="episode-series">Series</label>
        <select
          id="episode-series"
          value={series}
          disabled={submitting}
          onChange={(e) => setSeries(e.target.value)}
        >
          {SERIES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="studio-form__field">
        <label htmlFor="episode-concept">Concept</label>
        <textarea
          id="episode-concept"
          rows={3}
          value={concept}
          disabled={submitting}
          onChange={(e) => setConcept(e.target.value)}
        />
      </div>
      {error ? <p className="studio-form__error">{error}</p> : null}
      <button type="submit" className="studio-form__submit" disabled={submitting}>
        {submitting ? 'Creating…' : 'Create episode'}
      </button>
    </form>
  )
}
