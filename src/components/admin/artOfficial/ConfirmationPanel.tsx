'use client'

import { Button } from '@payloadcms/ui'
import { useState } from 'react'

import { buildPracticeKnowledgePatches } from '@/lib/artOfficial/buildPracticeKnowledgePatches'

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
  const [commitNotice, setCommitNotice] = useState<string | null>(null)

  const sessionType = session.sessionType ?? 'artwork-cataloguing'
  const hasDrafts = Boolean(session.agentDraftDescriptionShort)

  async function commit(options?: { reapply?: boolean }) {
    setCommitting(true)
    setError(null)
    setCommitNotice(null)

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
    } else if (sessionType === 'onboarding') {
      body = {
        practiceKnowledgePatches: buildPracticeKnowledgePatches(timeline),
        reapply: options?.reapply === true,
      }
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
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : `Commit failed (${res.status})`,
        )
      }

      const pk = data.practiceKnowledge as
        | { updated?: string[]; missing?: string[]; patchCount?: number }
        | undefined

      if (sessionType === 'onboarding' && pk) {
        if (pk.updated?.length) {
          setCommitNotice(
            `Updated Practice Knowledge: ${pk.updated.join(', ')}. Check the English (en) content field if Deutsch still looks empty.`,
          )
        } else if ((pk.patchCount ?? 0) === 0) {
          setCommitNotice(
            'Session marked complete, but no practice-knowledge sections were staged on this session.',
          )
        }
      }

      if (!options?.reapply) {
        onCommitted()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Commit failed')
    } finally {
      setCommitting(false)
    }
  }

  const practicePatches =
    sessionType === 'onboarding' ? buildPracticeKnowledgePatches(timeline) : []

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
          {practicePatches.length > 0 ? (
            <>
              <h4 style={{ margin: '0 0 8px' }}>Practice Knowledge to commit</h4>
              <ul style={{ margin: '0 0 16px', paddingLeft: 20, fontSize: 13 }}>
                {practicePatches.map((p) => (
                  <li key={p.slug}>{p.slug}</li>
                ))}
              </ul>
            </>
          ) : sessionType === 'onboarding' ? (
            <p style={{ fontSize: 13, opacity: 0.75, marginBottom: 16 }}>
              No Practice Knowledge sections are staged yet. Ask Art/Official to summarize and
              stage sections, or commit to close the session without writing PK rows.
            </p>
          ) : null}

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
            onClick={() => void commit()}
          >
            {committing ? 'Committing…' : 'Commit record'}
          </Button>
          {sessionType === 'onboarding' &&
          session.status === 'completed' &&
          practicePatches.length > 0 ? (
            <span style={{ marginLeft: 8, display: 'inline-block' }}>
              <Button
                buttonStyle="secondary"
                disabled={committing}
                onClick={() => void commit({ reapply: true })}
              >
                Re-apply Practice Knowledge
              </Button>
            </span>
          ) : null}
          {sessionType === 'artwork-cataloguing' && !canCommitArtwork ? (
            <p style={{ fontSize: 12, opacity: 0.65, marginTop: 8 }}>
              Stage at least title and yearCreated before committing.
            </p>
          ) : null}
          {commitNotice ? (
            <p style={{ fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>{commitNotice}</p>
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
