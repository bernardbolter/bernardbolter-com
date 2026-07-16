'use client'

import { useMemo, useState } from 'react'

import { buildEdlFromTakes } from '@/lib/studio/edlExport'

type CampaignOption = { id: number; name: string }
type TextNoteRow = { id: number; preview: string }
type ShotRow = { id: number; description: string; status: string; campaignId: number }
type TakeRow = {
  id: number
  takeNumber: number
  shotId: number
  inPointSec: number | null
  outPointSec: number | null
  quickNote: string | null
}

type Props = {
  campaigns: CampaignOption[]
  textNotes: TextNoteRow[]
  shots: ShotRow[]
  selectedTakes: TakeRow[]
}

export function VideoScriptsClient({ campaigns, textNotes, shots, selectedTakes }: Props) {
  const [campaignId, setCampaignId] = useState<number | ''>(campaigns[0]?.id ?? '')
  const [description, setDescription] = useState('')
  const [framing, setFraming] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const edl = useMemo(() => buildEdlFromTakes(selectedTakes), [selectedTakes])

  async function createShot() {
    if (!campaignId || !description.trim()) {
      setError('Campaign and description are required.')
      return
    }
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/shots', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign: campaignId,
          description: description.trim(),
          intendedFraming: framing.trim() || undefined,
          status: 'needed',
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { errors?: Array<{ message?: string }> }
        throw new Error(data.errors?.[0]?.message || 'Could not create shot')
      }
      setMessage('Shot created. Refresh to see it in the list.')
      setDescription('')
      setFraming('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setBusy(false)
    }
  }

  function downloadEdl() {
    const blob = new Blob([edl], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `selected-takes-${new Date().toISOString().slice(0, 10)}.edl`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="studio-tool">
      <section className="studio-archive__panel">
        <h3>Text FieldNotes</h3>
        {textNotes.length === 0 ? (
          <p className="studio-muted">No text notes yet — create some under Input → Text.</p>
        ) : (
          <ul className="studio-tool__list">
            {textNotes.map((note) => (
              <li key={note.id}>
                <Linkish id={note.id} preview={note.preview} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="studio-archive__panel">
        <h3>New shot</h3>
        <div className="studio-form">
          <div className="studio-form__field">
            <label htmlFor="vs-campaign">Campaign</label>
            <select
              id="vs-campaign"
              value={campaignId === '' ? '' : String(campaignId)}
              onChange={(e) =>
                setCampaignId(e.target.value ? Number(e.target.value) : '')
              }
            >
              <option value="">Select…</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="studio-form__field">
            <label htmlFor="vs-desc">Description</label>
            <input
              id="vs-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="studio-form__field">
            <label htmlFor="vs-frame">Intended framing</label>
            <input id="vs-frame" value={framing} onChange={(e) => setFraming(e.target.value)} />
          </div>
          <button type="button" className="studio-form__submit" disabled={busy} onClick={() => void createShot()}>
            {busy ? 'Saving…' : 'Add shot'}
          </button>
        </div>
        {message ? <p className="studio-archive__success">{message}</p> : null}
        {error ? <p className="studio-archive__error">{error}</p> : null}
      </section>

      <section className="studio-archive__panel">
        <h3>Shots</h3>
        {shots.length === 0 ? (
          <p className="studio-muted">No shots yet.</p>
        ) : (
          <ul className="studio-tool__list">
            {shots.map((shot) => (
              <li key={shot.id}>
                <strong>{shot.description}</strong>
                <p className="studio-muted">
                  #{shot.id} · {shot.status}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="studio-archive__panel">
        <h3>EDL export</h3>
        <p className="studio-muted">
          {selectedTakes.length} selected take{selectedTakes.length === 1 ? '' : 's'}
        </p>
        <button
          type="button"
          className="studio-form__submit"
          disabled={selectedTakes.length === 0}
          onClick={downloadEdl}
        >
          Download EDL
        </button>
        {selectedTakes.length > 0 ? (
          <pre className="studio-archive__prompt">{edl}</pre>
        ) : null}
      </section>
    </div>
  )
}

function Linkish({ id, preview }: { id: number; preview: string }) {
  return (
    <a href={`/studio/notes/${id}`}>
      <strong>#{id}</strong> — {preview}
    </a>
  )
}
