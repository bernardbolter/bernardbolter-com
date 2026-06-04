'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback } from 'react'

import { ArtOfficialInstructions } from './ArtOfficialInstructions'
import { NewSessionButton } from './NewSessionButton'
import { QuickUpload } from './QuickUpload'
import { SessionLauncher } from './SessionLauncher'
import { UnreasonedQueue } from './UnreasonedQueue'
import type { StartRecommendation } from '@/lib/artOfficial/startRecommendation'

import './artOfficialHome.scss'

export type ArtOfficialTab = 'queue' | 'upload' | 'session'

const TABS: { id: ArtOfficialTab; label: string }[] = [
  { id: 'session', label: 'Session' },
  { id: 'queue', label: 'Unreasoned Queue' },
  { id: 'upload', label: 'Quick Upload' },
]

function parseTab(value: string | null): ArtOfficialTab {
  if (value === 'queue' || value === 'upload') return value
  return 'session'
}

type SessionRow = {
  sessionId?: string | null
  sessionType?: string | null
  updatedAt?: string | null
  dialogueRefinementFlag?: boolean | null
  weakPhases?: string[] | null
}

function SessionList({
  title,
  docs,
}: {
  title: string
  docs: SessionRow[]
}) {
  if (!docs.length) return null
  return (
    <section className="art-official-home__session-list">
      <h2 className="art-official-home__session-list-title">{title}</h2>
      <ul className="art-official-home__session-list-ul">
        {docs.map((s) => (
          <li key={s.sessionId ?? ''}>
            <Link href={`/admin/art-official/${s.sessionId}`}>
              {s.sessionType} ·{' '}
              {s.updatedAt ? new Date(s.updatedAt).toLocaleString() : ''}
              {s.dialogueRefinementFlag ? ' · needs refinement' : ''}
            </Link>
            {s.weakPhases?.length ? (
              <span className="art-official-home__session-meta">
                ({s.weakPhases.join(', ')})
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

function ArtOfficialHomeInner({
  recommendation,
  practiceKnowledgeHref,
  artistsHref,
  artistCreateHref,
  artistExists,
  practiceKnowledgeEmpty,
  inProgress,
  needsRefinement,
  completed,
}: {
  recommendation: StartRecommendation
  practiceKnowledgeHref: string
  artistsHref: string
  artistCreateHref: string
  artistExists: boolean
  practiceKnowledgeEmpty: boolean
  inProgress: SessionRow[]
  needsRefinement: SessionRow[]
  completed: SessionRow[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = parseTab(searchParams.get('tab'))
  const artworkIdParam = searchParams.get('artworkId')
  const launchArtworkId = artworkIdParam ? Number(artworkIdParam) : null

  const setTab = useCallback(
    (next: ArtOfficialTab, extra?: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', next)
      if (extra) {
        for (const [k, v] of Object.entries(extra)) {
          if (v) params.set(k, v)
          else params.delete(k)
        }
      }
      router.push(`/admin/art-official?${params.toString()}`)
    },
    [router, searchParams],
  )

  return (
    <div className="art-official-home">
      <nav className="art-official-home__tabs" aria-label="Art/Official sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={
              tab === t.id
                ? 'art-official-home__tab art-official-home__tab--active'
                : 'art-official-home__tab'
            }
            onClick={() => {
              if (t.id === 'session') setTab('session')
              else setTab(t.id, { artworkId: '' })
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'queue' ? (
        <UnreasonedQueue
          onBeginSession={(artworkId) =>
            setTab('session', { artworkId: String(artworkId) })
          }
          onQuickUpload={() => setTab('upload')}
        />
      ) : null}

      {tab === 'upload' ? <QuickUpload /> : null}

      {tab === 'session' ? (
        <div className="art-official-home__session-panel">
          {launchArtworkId && Number.isFinite(launchArtworkId) ? (
            <SessionLauncher
              artworkId={launchArtworkId}
              disabled={!artistExists}
              onStarted={(sessionId) =>
                router.push(`/admin/art-official/${sessionId}`)
              }
            />
          ) : null}
          {practiceKnowledgeEmpty ? (
            <p className="art-official-home__warning">
              Practice Knowledge rows are missing. Onboarding commit cannot write until
              you run: <code>npx tsx src/scripts/seed-practice-knowledge.ts</code>
            </p>
          ) : null}
          <ArtOfficialInstructions
            recommendation={recommendation}
            practiceKnowledgeHref={practiceKnowledgeHref}
            artistsHref={artistsHref}
            artistCreateHref={artistCreateHref}
            artistExists={artistExists}
          />
          <NewSessionButton
            defaultSessionType={recommendation.sessionType}
            disabled={!artistExists}
            artistsHref={artistsHref}
            artistCreateHref={artistCreateHref}
          />
          <SessionList title="In progress" docs={inProgress} />
          <SessionList title="Needs refinement" docs={needsRefinement} />
          <SessionList title="Recent completed" docs={completed} />
        </div>
      ) : null}
    </div>
  )
}

export function ArtOfficialHome(
  props: Parameters<typeof ArtOfficialHomeInner>[0],
) {
  return (
    <Suspense fallback={<p className="art-official-home__loading">Loading…</p>}>
      <ArtOfficialHomeInner {...props} />
    </Suspense>
  )
}
