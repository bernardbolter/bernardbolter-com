'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type { FieldNote } from '@/payload-types'

import {
  fieldNoteConceptualThreads,
  fieldNoteProcessStages,
  fieldNoteRegisters,
} from '@/lib/studio/fieldNoteSchema'

import { LinesPicker, type LineOption } from './LinesPicker'
import { LineSuggestionList } from './LineSuggestionList'
import { resolveMediaUrl } from '@/lib/studio/media'
import type { Media } from '@/payload-types'

type FieldNoteDetailEditorProps = {
  note: FieldNote
}

export function FieldNoteDetailEditor({ note: initial }: FieldNoteDetailEditorProps) {
  const router = useRouter()
  const [note, setNote] = useState(initial)
  const [writtenNote, setWrittenNote] = useState(initial.writtenNote ?? '')
  const [lines, setLines] = useState<LineOption[]>(() =>
    (initial.lines ?? [])
      .map((l) => (typeof l === 'object' && l ? { id: l.id, name: l.name } : null))
      .filter(Boolean) as LineOption[],
  )
  const [register, setRegister] = useState(initial.register ?? '')
  const [processStage, setProcessStage] = useState(initial.processStage ?? '')
  const [conceptualThread, setConceptualThread] = useState(initial.conceptualThread ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const media =
    note.mediaFile && typeof note.mediaFile === 'object' ? (note.mediaFile as Media) : null
  const mediaUrl = resolveMediaUrl(media)

  async function save() {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/studio/field-notes/${note.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          writtenNote,
          lines: lines.map((l) => l.id),
          register: register || null,
          processStage: processStage || null,
          conceptualThread: conceptualThread || null,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      setMessage('Saved.')
      router.refresh()
    } catch {
      setMessage('Could not save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className="studio-detail">
      <header className="studio-detail__header">
        <h2>{note.mediaType}</h2>
        <p>
          {note.processingStatus} · {new Date(note.capturedAt ?? note.createdAt).toLocaleString()}
        </p>
      </header>

      {mediaUrl ? (
        <section>
          {note.mediaType.startsWith('video') || note.mediaType === 'voice-memo' ? (
            <video controls src={mediaUrl} className="studio-timelapse" />
          ) : note.mediaType === 'photo' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl} alt="" className="studio-detail__hero" />
          ) : null}
        </section>
      ) : null}

      {note.audioTranscript ? (
        <section>
          <h3>Transcript</h3>
          <p>{note.audioTranscript}</p>
        </section>
      ) : null}

      {note.keyframes?.length ? (
        <section>
          <h3>Keyframes</h3>
          <ul className="studio-timeline">
            {note.keyframes.map((frame) => (
              <li key={frame.id ?? `${frame.timestamp}`}>
                {frame.timestamp}s — {frame.tags?.map((t) => t.tag).join(', ')}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <LineSuggestionList
        noteId={note.id}
        suggestions={note.suggestedLines ?? []}
        onUpdated={() => router.refresh()}
      />

      <section>
        <h3>Written note</h3>
        <textarea rows={4} value={writtenNote} onChange={(e) => setWrittenNote(e.target.value)} />
      </section>

      <LinesPicker value={lines} onChange={setLines} disabled={saving} />

      <div className="studio-form__field">
        <label htmlFor="fn-register-edit">Register</label>
        <select
          id="fn-register-edit"
          value={register}
          onChange={(e) => setRegister(e.target.value)}
        >
          <option value="">—</option>
          {fieldNoteRegisters.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="studio-form__field">
        <label htmlFor="fn-stage-edit">Process stage</label>
        <select
          id="fn-stage-edit"
          value={processStage}
          onChange={(e) => setProcessStage(e.target.value)}
        >
          <option value="">—</option>
          {fieldNoteProcessStages.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="studio-form__field">
        <label htmlFor="fn-thread-edit">Conceptual thread</label>
        <select
          id="fn-thread-edit"
          value={conceptualThread}
          onChange={(e) => setConceptualThread(e.target.value)}
        >
          <option value="">—</option>
          {fieldNoteConceptualThreads.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {message ? <p>{message}</p> : null}
      <button type="button" className="studio-form__submit" disabled={saving} onClick={() => void save()}>
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </article>
  )
}
