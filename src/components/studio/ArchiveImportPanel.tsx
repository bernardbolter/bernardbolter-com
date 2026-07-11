'use client'

import { FormEvent, useState } from 'react'

const VISION_EXAMPLE = `{
  "slug": "gates-iii",
  "analyses": [
    {
      "text": "Your vision analysis prose here…",
      "model": "claude-sonnet-4-6",
      "date": "2026-06-20"
    }
  ]
}`

const FIELDS_EXAMPLE = `{
  "slug": "gates-iii",
  "fields": {
    "intent": "What this work pushes against…",
    "formalContributionAssessment": "How it contributes formally…",
    "reasoningStatus": "complete"
  }
}`

const BATCH_EXAMPLE = `{
  "items": [
    { "slug": "gates-iii", "fields": { "reasoningStatus": "complete" } }
  ]
}`

type ImportKind = 'vision' | 'fields'

async function postImport(kind: ImportKind, body: string) {
  const endpoint =
    kind === 'vision'
      ? '/api/studio/archive/vision-analyses'
      : '/api/studio/archive/artwork-fields'
  const response = await fetch(endpoint, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  const data = (await response.json().catch(() => ({}))) as {
    error?: string
    results?: unknown[]
  }
  if (!response.ok) {
    throw new Error(data.error ?? `Import failed (${response.status})`)
  }
  return data
}

export function ArchiveImportPanel() {
  const [visionJson, setVisionJson] = useState(VISION_EXAMPLE)
  const [fieldsJson, setFieldsJson] = useState(FIELDS_EXAMPLE)
  const [visionStatus, setVisionStatus] = useState<string | null>(null)
  const [fieldsStatus, setFieldsStatus] = useState<string | null>(null)
  const [visionError, setVisionError] = useState<string | null>(null)
  const [fieldsError, setFieldsError] = useState<string | null>(null)
  const [visionSubmitting, setVisionSubmitting] = useState(false)
  const [fieldsSubmitting, setFieldsSubmitting] = useState(false)

  async function handleVisionSubmit(event: FormEvent) {
    event.preventDefault()
    setVisionSubmitting(true)
    setVisionError(null)
    setVisionStatus(null)
    try {
      JSON.parse(visionJson)
      const data = await postImport('vision', visionJson)
      setVisionStatus(`Imported ${data.results?.length ?? 0} artwork(s).`)
    } catch (error) {
      setVisionError(error instanceof Error ? error.message : String(error))
    } finally {
      setVisionSubmitting(false)
    }
  }

  async function handleFieldsSubmit(event: FormEvent) {
    event.preventDefault()
    setFieldsSubmitting(true)
    setFieldsError(null)
    setFieldsStatus(null)
    try {
      JSON.parse(fieldsJson)
      const data = await postImport('fields', fieldsJson)
      setFieldsStatus(`Updated ${data.results?.length ?? 0} artwork(s).`)
    } catch (error) {
      setFieldsError(error instanceof Error ? error.message : String(error))
    } finally {
      setFieldsSubmitting(false)
    }
  }

  return (
    <div className="studio-archive">
      <p className="studio-archive__lede">
        Paste JSON from Claude on your phone. Vision analyses append to existing rows; field
        updates patch existing artworks only (no new records). Use batch <code>items</code> for
        multiple slugs.
      </p>

      <form className="studio-archive__panel" onSubmit={handleVisionSubmit}>
        <h3>Vision analyses</h3>
        <p className="studio-archive__hint">
          Appends to <code>visionAnalyses[]</code> on the matching slug.
        </p>
        <textarea
          className="studio-archive__textarea"
          value={visionJson}
          onChange={(event) => setVisionJson(event.target.value)}
          rows={14}
          spellCheck={false}
        />
        <div className="studio-archive__actions">
          <button type="submit" disabled={visionSubmitting}>
            {visionSubmitting ? 'Importing…' : 'Import vision analyses'}
          </button>
        </div>
        {visionStatus ? <p className="studio-archive__success">{visionStatus}</p> : null}
        {visionError ? <p className="studio-archive__error">{visionError}</p> : null}
      </form>

      <form className="studio-archive__panel" onSubmit={handleFieldsSubmit}>
        <h3>Artwork fields (Art/Official)</h3>
        <p className="studio-archive__hint">
          Same field allowlist as Art/Official dialogue. Set{' '}
          <code>reasoningStatus</code> to <code>complete</code> when a stub is finished.
        </p>
        <textarea
          className="studio-archive__textarea"
          value={fieldsJson}
          onChange={(event) => setFieldsJson(event.target.value)}
          rows={14}
          spellCheck={false}
        />
        <details className="studio-archive__details">
          <summary>Batch example</summary>
          <pre>{BATCH_EXAMPLE}</pre>
        </details>
        <div className="studio-archive__actions">
          <button type="submit" disabled={fieldsSubmitting}>
            {fieldsSubmitting ? 'Applying…' : 'Apply field updates'}
          </button>
        </div>
        {fieldsStatus ? <p className="studio-archive__success">{fieldsStatus}</p> : null}
        {fieldsError ? <p className="studio-archive__error">{fieldsError}</p> : null}
      </form>
    </div>
  )
}
