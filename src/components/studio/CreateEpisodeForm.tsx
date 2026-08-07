'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  StudioLocationMap,
  type StudioMapLocation,
} from '@/components/studio/StudioLocationMap'

const SERIES = [
  { value: 'outsider-art-review', label: 'Outsider Art Review' },
  { value: 'rap-critic', label: 'Rap Critic' },
  { value: 'studio-fails', label: 'Studio Fails' },
  { value: 'studio-series', label: 'Studio Series' },
]

export function CreateEpisodeForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [series, setSeries] = useState('rap-critic')
  const [locationName, setLocationName] = useState('')
  const [location, setLocation] = useState<StudioMapLocation | null>(null)
  const [description, setDescription] = useState('')
  const [concept, setConcept] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      let coverPhotoId: number | undefined
      if (coverFile) {
        const uploadFormData = new FormData()
        uploadFormData.append('file', coverFile)
        const uploadRes = await fetch('/api/studio/upload', {
          method: 'POST',
          credentials: 'include',
          body: uploadFormData,
        })
        if (!uploadRes.ok) {
          const payload = (await uploadRes.json().catch(() => ({}))) as { error?: string }
          throw new Error(payload.error || 'Could not upload cover photo.')
        }
        const uploadData = (await uploadRes.json()) as { id: number }
        coverPhotoId = uploadData.id
      }

      const res = await fetch('/api/studio/episodes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          series,
          locationName: locationName.trim() || undefined,
          location: location ?? undefined,
          description: description.trim() || undefined,
          concept: concept.trim() || undefined,
          coverPhotoId,
        }),
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
        <label htmlFor="episode-location-name">Location name</label>
        <input
          id="episode-location-name"
          placeholder="e.g. Tiergarten, Neptunbrunnen"
          value={locationName}
          disabled={submitting}
          onChange={(e) => setLocationName(e.target.value)}
        />
      </div>
      <div className="studio-form__field">
        <span className="studio-form__field-label">Map pin</span>
        <StudioLocationMap value={location} onChange={setLocation} disabled={submitting} />
      </div>
      <div className="studio-form__field">
        <label htmlFor="episode-description">Description</label>
        <textarea
          id="episode-description"
          rows={3}
          value={description}
          disabled={submitting}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Notes on the artwork / location"
        />
      </div>
      <div className="studio-form__field">
        <label htmlFor="episode-cover">Cover photo (optional)</label>
        <input
          id="episode-cover"
          type="file"
          accept="image/*"
          disabled={submitting}
          onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
        />
        {coverFile ? <p className="studio-muted">{coverFile.name}</p> : null}
      </div>
      <div className="studio-form__field">
        <label htmlFor="episode-concept">Concept (optional)</label>
        <textarea
          id="episode-concept"
          rows={2}
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
