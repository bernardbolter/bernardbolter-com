'use client'

import { Button } from '@payloadcms/ui'
import { useState } from 'react'

import { buildPracticeKnowledgePatches } from '@/lib/artOfficial/buildPracticeKnowledgePatches'
import { commitButtonHint, wrapUpSummary } from '@/lib/artOfficial/confirmationCopy'

import type { ArtOfficialSession, TimelineEntry } from './types'

import './artOfficialChat.scss'

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
  const summary = wrapUpSummary(sessionType)
  const commitHint = commitButtonHint(sessionType)

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
    } else if (sessionType === 'triptych-cataloguing') {
      const patch: Record<string, unknown> = {}
      for (const entry of timeline) {
        if (entry.targetCollection === 'triptychs' && entry.field) {
          patch[entry.field] = entry.value
        }
      }
      body = { triptychData: patch }
      const existingTriptych =
        typeof session.triptychRecord === 'object'
          ? session.triptychRecord?.id
          : session.triptychRecord
      if (existingTriptych) body.triptychId = existingTriptych
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

  const canCommitTriptych =
    sessionType !== 'triptych-cataloguing' ||
    timeline.some((e) => e.targetCollection === 'triptychs' && e.field === 'title') ||
    Boolean(
      typeof session.triptychRecord === 'object'
        ? session.triptychRecord?.id
        : session.triptychRecord,
    )

  return (
    <section className="art-official-confirm" aria-labelledby="art-official-confirm-heading">
      <h2 id="art-official-confirm-heading" className="art-official-confirm__heading">
        Finish session
      </h2>
      <p className="art-official-confirm__summary">{summary}</p>

      <Button buttonStyle="secondary" onClick={() => setOpen((v) => !v)}>
        {open ? 'Hide review panel' : 'Wrap up / confirm'}
      </Button>
      <p className="art-official-confirm__toggle-hint">
        {open
          ? 'Review drafts and staged fields below, then commit when ready.'
          : 'Opens a review of agent drafts, blind vs second description, and what will be saved.'}
      </p>

      {open ? (
        <div className="art-official-confirm__panel">
          {practicePatches.length > 0 ? (
            <>
              <h4 className="art-official-confirm__subheading">Practice Knowledge to commit</h4>
              <ul className="art-official-confirm__list">
                {practicePatches.map((p) => (
                  <li key={p.slug}>{p.slug}</li>
                ))}
              </ul>
            </>
          ) : sessionType === 'onboarding' ? (
            <p className="art-official-confirm__note">
              No Practice Knowledge sections are staged yet. Ask Art/Official to summarize and
              stage sections, or commit to close the session without writing PK rows.
            </p>
          ) : null}

          {hasDrafts ? (
            <>
              <h4 className="art-official-confirm__subheading">Agent drafts</h4>
              <label className="art-official-confirm__field">
                descriptionShort
                <textarea
                  readOnly
                  rows={2}
                  className="art-official-confirm__textarea"
                  value={session.agentDraftDescriptionShort ?? ''}
                />
              </label>
              <label className="art-official-confirm__field">
                descriptionLong
                <textarea
                  readOnly
                  rows={4}
                  className="art-official-confirm__textarea"
                  value={session.agentDraftDescriptionLong ?? ''}
                />
              </label>
            </>
          ) : null}

          {session.firstImpression || session.secondDescription ? (
            <div className="art-official-confirm__descriptions">
              <div>
                <h4 className="art-official-confirm__subheading">Blind description</h4>
                <p className="art-official-confirm__prose">{session.firstImpression ?? '—'}</p>
              </div>
              <div>
                <h4 className="art-official-confirm__subheading">Second description</h4>
                <p className="art-official-confirm__prose">{session.secondDescription ?? '—'}</p>
              </div>
            </div>
          ) : null}

          <div className="art-official-confirm__actions">
            <Button
              buttonStyle="primary"
              disabled={
                committing ||
                (sessionType === 'artwork-cataloguing' && !canCommitArtwork) ||
                (sessionType === 'triptych-cataloguing' && !canCommitTriptych)
              }
              onClick={() => void commit()}
            >
              {committing ? 'Committing…' : 'Commit record'}
            </Button>
            {sessionType === 'onboarding' &&
            session.status === 'completed' &&
            practicePatches.length > 0 ? (
              <Button
                buttonStyle="secondary"
                disabled={committing}
                onClick={() => void commit({ reapply: true })}
              >
                Re-apply Practice Knowledge
              </Button>
            ) : null}
          </div>
          <p className="art-official-confirm__commit-hint">{commitHint}</p>

          {sessionType === 'artwork-cataloguing' && !canCommitArtwork ? (
            <p className="art-official-confirm__warning">
              Stage at least title and yearCreated in chat before committing.
            </p>
          ) : null}
          {sessionType === 'triptych-cataloguing' && !canCommitTriptych ? (
            <p className="art-official-confirm__warning">
              Stage a triptych title, or link an existing triptych to this session in the admin.
            </p>
          ) : null}
          {commitNotice ? <p className="art-official-confirm__notice">{commitNotice}</p> : null}
          {error ? <p className="art-official-confirm__error">{error}</p> : null}
        </div>
      ) : null}
    </section>
  )
}
