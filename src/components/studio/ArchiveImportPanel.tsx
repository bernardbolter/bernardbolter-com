'use client'

import { FormEvent, useState } from 'react'

import { parseImportJson } from '@/lib/studio/parseImportJson'
import {
  buildVisionImportTemplate,
  VISION_IMPORT_CLAUDE_PROMPT,
} from '@/lib/studio/visionImportTemplate'

const FIELDS_EXAMPLE = `{
  "slug": "gates-iii",
  "fields": {
    "intent": "What this work pushes against…",
    "formalContributionAssessment": "How it contributes formally…",
    "reasoningStatus": "complete"
  }
}`

const VISION_BATCH_EXAMPLE = `{
  "items": [
    {
      "slug": "gates-iii",
      "analyses": [
        {
          "text": "Analysis for gates-iii…",
          "model": "claude-sonnet-4-6",
          "date": "2026-06-20"
        }
      ]
    }
  ]
}`

const FIELDS_BATCH_EXAMPLE = `{
  "items": [
    { "slug": "gates-iii", "fields": { "reasoningStatus": "complete" } }
  ]
}`

type ImportKind = 'vision' | 'fields'

type VisionImportResult = {
  slug: string
  appended: number
  total: number
}

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
    results?: VisionImportResult[]
  }
  if (!response.ok) {
    throw new Error(data.error ?? `Import failed (${response.status})`)
  }
  return data
}

function formatVisionSuccess(results: VisionImportResult[] | undefined): string {
  if (!results?.length) return 'Imported.'
  return results
    .map((row) => `${row.slug}: +${row.appended} (${row.total} total)`)
    .join(' · ')
}

export function ArchiveImportPanel() {
  const [visionJson, setVisionJson] = useState('')
  const [fieldsJson, setFieldsJson] = useState('')
  const [visionStatus, setVisionStatus] = useState<string | null>(null)
  const [fieldsStatus, setFieldsStatus] = useState<string | null>(null)
  const [visionError, setVisionError] = useState<string | null>(null)
  const [fieldsError, setFieldsError] = useState<string | null>(null)
  const [visionSubmitting, setVisionSubmitting] = useState(false)
  const [fieldsSubmitting, setFieldsSubmitting] = useState(false)
  const [promptCopied, setPromptCopied] = useState(false)

  async function handleVisionSubmit(event: FormEvent) {
    event.preventDefault()
    setVisionSubmitting(true)
    setVisionError(null)
    setVisionStatus(null)
    try {
      const parsed = parseImportJson(visionJson)
      const data = await postImport('vision', JSON.stringify(parsed))
      setVisionStatus(formatVisionSuccess(data.results))
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
      const parsed = parseImportJson(fieldsJson)
      const data = await postImport('fields', JSON.stringify(parsed))
      setFieldsStatus(`Updated ${data.results?.length ?? 0} artwork(s).`)
    } catch (error) {
      setFieldsError(error instanceof Error ? error.message : String(error))
    } finally {
      setFieldsSubmitting(false)
    }
  }

  async function copyClaudePrompt() {
    try {
      await navigator.clipboard.writeText(VISION_IMPORT_CLAUDE_PROMPT)
      setPromptCopied(true)
      window.setTimeout(() => setPromptCopied(false), 2000)
    } catch {
      setVisionError('Could not copy prompt — select and copy from the box below.')
    }
  }

  return (
    <div className="studio-archive">
      <p className="studio-archive__lede">
        Paste JSON from Claude on your phone. Vision analyses append to existing rows; field
        updates patch existing artworks only (no new records).
      </p>

      <form className="studio-archive__panel studio-archive__panel--primary" onSubmit={handleVisionSubmit}>
        <h3>Vision analyses</h3>
        <p className="studio-archive__hint">
          Appends to <code>visionAnalyses[]</code>. Paste Claude output here (markdown code fences
          are OK).
        </p>

        <div className="studio-archive__toolbar">
          <button
            type="button"
            className="studio-archive__secondary"
            onClick={() => setVisionJson(buildVisionImportTemplate())}
          >
            Insert template
          </button>
          <button type="button" className="studio-archive__secondary" onClick={copyClaudePrompt}>
            {promptCopied ? 'Prompt copied' : 'Copy Claude prompt'}
          </button>
        </div>

        <details className="studio-archive__details">
          <summary>Claude prompt (for phone workflow)</summary>
          <pre className="studio-archive__prompt">{VISION_IMPORT_CLAUDE_PROMPT}</pre>
        </details>

        <textarea
          className="studio-archive__textarea"
          value={visionJson}
          onChange={(event) => setVisionJson(event.target.value)}
          placeholder='Paste JSON here, e.g. { "slug": "gates-iii", "analyses": [...] }'
          rows={12}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />

        <details className="studio-archive__details">
          <summary>Batch example (multiple slugs)</summary>
          <pre>{VISION_BATCH_EXAMPLE}</pre>
        </details>

        <div className="studio-archive__actions">
          <button type="submit" disabled={visionSubmitting || !visionJson.trim()}>
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
          placeholder={FIELDS_EXAMPLE}
          rows={10}
          spellCheck={false}
        />
        <details className="studio-archive__details">
          <summary>Single + batch examples</summary>
          <pre>{FIELDS_EXAMPLE}</pre>
          <pre>{FIELDS_BATCH_EXAMPLE}</pre>
        </details>
        <div className="studio-archive__actions">
          <button type="submit" disabled={fieldsSubmitting || !fieldsJson.trim()}>
            {fieldsSubmitting ? 'Applying…' : 'Apply field updates'}
          </button>
        </div>
        {fieldsStatus ? <p className="studio-archive__success">{fieldsStatus}</p> : null}
        {fieldsError ? <p className="studio-archive__error">{fieldsError}</p> : null}
      </form>
    </div>
  )
}
