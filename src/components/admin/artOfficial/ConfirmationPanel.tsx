'use client'

import { Button } from '@payloadcms/ui'
import { useState } from 'react'

import type { ArtOfficialSession, TimelineEntry } from './types'

function buildArtworkDataFromTimeline(timeline: TimelineEntry[]): Record<string, unknown> {
  const data: Record<string, unknown> = { status: 'draft' }
  for (const entry of timeline) {
    if (entry.targetCollection === 'artworks' && entry.field) {
      data[entry.field] = entry.value
    }
  }
  return data
}

export function ConfirmationPanel({
  session,
  timeline,
  onCommitted,
}: {
  session: ArtOfficialSession
  timeline: TimelineEntry[]
  onCommitted: () => void
}) {
  const [open, setOpen] = useState(Boolean(session.agentDraftDescriptionShort))
  const [committing, setCommitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sessionType = session.sessionType ?? 'artwork-cataloguing'
  const hasDrafts = Boolean(session.agentDraftDescriptionShort)

  async function commit() {
    setCommitting(true)
    setError(null)

    let body: Record<string, unknown> = {}

    if (sessionType === 'artwork-cataloguing') {
      body = {
        artworkData: buildArtworkDataFromTimeline(timeline),
        firstImpression: session.firstImpression,
        secondDescription: session.secondDescription,
      }
      const existingArtwork =
        typeof session.artworkRecord === 'object'
          ? session.artworkRecord?.id
          : session.artworkRecord
      if (existingArtwork) body.artworkId = existingArtwork
    } else if (sessionType === 'artist-statement' || sessionType === 'biography') {
      const patch: Record<string, unknown> = {}
      for (const entry of timeline) {
        if (entry.targetCollection === 'artists' && entry.field) {
          patch[entry.field] = entry.value
        }
      }
      body = { artistPatch: patch }
    } else {
      body = { practiceKnowledgePatches: [] }
    }

    try {
      const res = await fetch(
        `/api/art-official/sessions/${session.sessionId}/commit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Commit failed (${res.status})`)
      }
      onCommitted()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Commit failed')
    } finally {
      setCommitting(false)
    }
  }

  const canCommitArtwork =
    sessionType !== 'artwork-cataloguing' ||
    (timeline.some((e) => e.field === 'title') &&
      timeline.some((e) => e.field === 'yearCreated'))

  return (
    <div style={{ marginTop: 24, borderTop: '1px solid var(--theme-elevation-150)', paddingTop: 16 }}>
      <Button buttonStyle="secondary" onClick={() => setOpen((v) => !v)}>
        {open ? 'Hide confirmation' : 'Wrap up / confirm'}
      </Button>

      {open ? (
        <div style={{ marginTop: 16 }}>
          {hasDrafts ? (
            <>
              <h4 style={{ margin: '0 0 8px' }}>Agent drafts</h4>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 12 }}>
                descriptionShort
                <textarea
                  readOnly
                  rows={2}
                  style={{ width: '100%', marginTop: 4 }}
                  value={session.agentDraftDescriptionShort ?? ''}
                />
              </label>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 12 }}>
                descriptionLong
                <textarea
                  readOnly
                  rows={4}
                  style={{ width: '100%', marginTop: 4 }}
                  value={session.agentDraftDescriptionLong ?? ''}
                />
              </label>
            </>
          ) : null}

          {session.firstImpression || session.secondDescription ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
                marginBottom: 16,
              }}
            >
              <div>
                <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>Blind description</h4>
                <p style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>
                  {session.firstImpression ?? '—'}
                </p>
              </div>
              <div>
                <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>Second description</h4>
                <p style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>
                  {session.secondDescription ?? '—'}
                </p>
              </div>
            </div>
          ) : null}

          <Button
            buttonStyle="primary"
            disabled={committing || (sessionType === 'artwork-cataloguing' && !canCommitArtwork)}
            onClick={commit}
          >
            {committing ? 'Committing…' : 'Commit record'}
          </Button>
          {sessionType === 'artwork-cataloguing' && !canCommitArtwork ? (
            <p style={{ fontSize: 12, opacity: 0.65, marginTop: 8 }}>
              Stage at least title and yearCreated before committing.
            </p>
          ) : null}
          {error ? (
            <p style={{ color: 'var(--theme-error-500)', fontSize: 13, marginTop: 8 }}>
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
