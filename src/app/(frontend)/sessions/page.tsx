import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'

import CorpusLadder from '@/components/corpus/CorpusLadder'
import { DocumentScrollShell } from '@/components/layout/DocumentScrollShell'
import SessionGlossLine from '@/components/shared/SessionGlossLine'
import {
  buildSessionIndexQueryString,
  SESSION_INDEX_TYPE_OPTIONS,
  parseSessionIndexFilters,
  sessionFilterYearDisplay,
  sessionIndexHasActiveFilters,
  type SessionIndexFilters,
} from '@/lib/corpus/sessionIndexFilters'
import { fetchCorpusSeries } from '@/lib/corpus/fetchCorpusData'
import type { Artwork, Series, Session } from '@/payload-types'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Sessions',
  description:
    'Completed Art/Official sessions — human-readable crumbs; full data via JSON-LD and the corpus API.',
  alternates: { canonical: '/sessions' },
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function readArtwork(value: number | Artwork | null | undefined): Artwork | null {
  if (!value || typeof value !== 'object') return null
  return value
}

function seriesSlugFromArtwork(artwork: Artwork | null): string | null {
  if (!artwork?.series) return null
  if (typeof artwork.series === 'object' && artwork.series.slug) {
    return artwork.series.slug
  }
  return null
}

type SessionRow = {
  id: number
  session: Session
  sessionId: string
  sessionType: string
  completedAt?: string | null
  isLinchpin: boolean
  hasStruggle: boolean
  primary: Artwork | null
  mentioned: Artwork[]
  passNumber: number
}

function filterSessionRows(rows: SessionRow[], filters: SessionIndexFilters): SessionRow[] {
  return rows.filter((row) => {
    if (filters.artwork) {
      const matchesArtwork =
        row.primary?.slug === filters.artwork ||
        row.mentioned.some((artwork) => artwork.slug === filters.artwork)
      if (!matchesArtwork) return false
    }
    if (filters.sessionType && row.sessionType !== filters.sessionType) return false
    if (filters.series) {
      if (seriesSlugFromArtwork(row.primary) !== filters.series) return false
    }
    if (filters.linchpinFlag === true && !row.isLinchpin) return false
    if (filters.linchpinFlag === false && row.isLinchpin) return false
    if (filters.hasStruggle === true && !row.hasStruggle) return false
    if (filters.hasStruggle === false && row.hasStruggle) return false
    if (filters.completedAfter || filters.completedBefore) {
      if (!row.completedAt) return false
      const completed = row.completedAt.slice(0, 10)
      if (filters.completedAfter && completed < filters.completedAfter) return false
      if (filters.completedBefore && completed > filters.completedBefore) return false
    }
    return true
  })
}

export default async function SessionsIndexPage({ searchParams }: PageProps) {
  const raw = await searchParams
  const params = new URLSearchParams()
  for (const key of [
    'artwork',
    'sessionType',
    'series',
    'completedAfter',
    'completedBefore',
    'linchpinFlag',
    'hasStruggle',
  ]) {
    const value = raw[key]
    const single = Array.isArray(value) ? value[0] : value
    if (single) params.set(key, single)
  }
  const filters = parseSessionIndexFilters(params)
  const hasFilters = sessionIndexHasActiveFilters(filters)

  const payload = await getPayload({ config })
  const [result, seriesList] = await Promise.all([
    payload.find({
      collection: 'sessions',
      where: { status: { equals: 'completed' } },
      limit: 200,
      depth: 2,
      sort: '-completedAt',
      select: {
        sessionId: true,
        sessionType: true,
        status: true,
        completedAt: true,
        primaryArtwork: true,
        artworkRecord: true,
        mentionedArtworks: true,
        linchpinFlag: true,
        revisitOf: true,
        fieldsCoveredThisSession: true,
        priorFieldConflicts: true,
        sessionStruggleFlag: true,
      },
    }),
    fetchCorpusSeries(payload),
  ])

  const chronologicalPass = new Map<number, number>()
  const seenPerArtwork = new Map<number, number>()
  for (const session of [...result.docs].reverse()) {
    const primary =
      readArtwork(session.primaryArtwork) ?? readArtwork(session.artworkRecord)
    if (!primary) continue
    const next = (seenPerArtwork.get(primary.id) ?? 0) + 1
    seenPerArtwork.set(primary.id, next)
    chronologicalPass.set(session.id, next)
  }

  const rows = filterSessionRows(
    result.docs
      .filter((session) => Boolean(session.sessionId))
      .map((session) => {
        const primary =
          readArtwork(session.primaryArtwork) ?? readArtwork(session.artworkRecord)
        const mentioned = (session.mentionedArtworks ?? [])
          .map((entry) => readArtwork(entry))
          .filter((artwork): artwork is Artwork => artwork !== null)
        const passNumber = chronologicalPass.get(session.id) ?? 1
        const typed = session as Session
        return {
          id: session.id,
          session: typed,
          sessionId: session.sessionId as string,
          sessionType: session.sessionType,
          completedAt: session.completedAt,
          isLinchpin: session.linchpinFlag?.isLinchpin === true,
          hasStruggle: session.sessionStruggleFlag?.hasStruggle === true,
          primary,
          mentioned,
          passNumber,
        }
      }),
    filters,
  )

  const ladderSlug = filters.artwork ?? null

  return (
    <div className="bio-page__container">
      <DocumentScrollShell
        title="SESSIONS"
        closeHref="/corpus"
        scrollClassName="bio-container"
        closeClassName="bio__close-container"
      >
        <div className="bio__content-container corpus-page">
          <CorpusLadder slug={ladderSlug} current="sessions" />
          <p className="bio__tagline">
            {filters.artwork
              ? `Sessions for ${filters.artwork}`
              : hasFilters
                ? 'Filtered sessions'
                : 'Completed sessions'}
          </p>
          <p className="bio__masonry-caption corpus-page__lede">
            Full session data is machine-readable via JSON-LD and the corpus API; this page shows
            a human-readable summary only.
          </p>

          <SessionsFilterForm filters={filters} seriesList={seriesList} />

          <p className="bio__masonry-caption">
            {rows.length} session{rows.length === 1 ? '' : 's'}
            {hasFilters ? ` · ${buildSessionIndexQueryString(filters)}` : ''}
          </p>

          <ul className="corpus-page__list">
            {rows.map((row) => {
              const dateLabel = row.completedAt
                ? new Date(row.completedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : '—'
              return (
                <li key={row.id} className="corpus-page__row">
                  <div className="corpus-page__meta">
                    <span className="corpus-page__year">{dateLabel}</span>
                    <span className="corpus-page__status">{row.sessionType}</span>
                  </div>
                  <div className="corpus-page__body">
                    <SessionGlossLine
                      session={row.session}
                      passNumber={row.passNumber}
                      showJsonLink
                      className="session-gloss-line session-gloss-line--index"
                    />
                    {row.primary ? (
                      <p className="bio__masonry-caption">
                        Primary:{' '}
                        <Link href={`/${row.primary.slug}`} className="bio__inline-link">
                          {row.primary.title}
                        </Link>
                      </p>
                    ) : null}
                    {row.mentioned.length > 0 ? (
                      <p className="bio__masonry-caption">
                        Mentioned: {row.mentioned.map((a) => a.title).join(', ')}
                      </p>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
          {rows.length === 0 ? (
            <p className="bio__masonry-caption">No completed sessions match.</p>
          ) : null}
        </div>
      </DocumentScrollShell>
    </div>
  )
}

function SessionsFilterForm({
  filters,
  seriesList,
}: {
  filters: SessionIndexFilters
  seriesList: Series[]
}) {
  const hasFilters = sessionIndexHasActiveFilters(filters)
  return (
    <form className="corpus-page__filters" method="get" action="/sessions">
      {filters.artwork ? (
        <input type="hidden" name="artwork" value={filters.artwork} />
      ) : null}
      <label className="corpus-page__field">
        <span>Type</span>
        <select name="sessionType" defaultValue={filters.sessionType ?? ''}>
          <option value="">All</option>
          {SESSION_INDEX_TYPE_OPTIONS.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label className="corpus-page__field">
        <span>Series</span>
        <select name="series" defaultValue={filters.series ?? ''}>
          <option value="">All</option>
          {seriesList.map((series) => (
            <option key={series.id} value={series.slug}>
              {series.name}
            </option>
          ))}
        </select>
      </label>
      <label className="corpus-page__field">
        <span>Completed after</span>
        <input
          name="completedAfter"
          type="text"
          inputMode="numeric"
          placeholder="2026"
          defaultValue={sessionFilterYearDisplay(filters.completedAfter, 'after')}
        />
      </label>
      <label className="corpus-page__field">
        <span>Completed before</span>
        <input
          name="completedBefore"
          type="text"
          inputMode="numeric"
          placeholder="2026"
          defaultValue={sessionFilterYearDisplay(filters.completedBefore, 'before')}
        />
      </label>
      <label className="corpus-page__field">
        <span>Linchpin</span>
        <select
          name="linchpinFlag"
          defaultValue={
            filters.linchpinFlag == null ? '' : filters.linchpinFlag ? 'true' : 'false'
          }
        >
          <option value="">Any</option>
          <option value="true">Linchpin only</option>
          <option value="false">Not linchpin</option>
        </select>
      </label>
      <label className="corpus-page__field">
        <span>Struggle</span>
        <select
          name="hasStruggle"
          defaultValue={
            filters.hasStruggle == null ? '' : filters.hasStruggle ? 'true' : 'false'
          }
        >
          <option value="">Any</option>
          <option value="true">Struggle flagged</option>
          <option value="false">No struggle</option>
        </select>
      </label>
      <div className="corpus-page__filter-actions">
        <button type="submit">Apply</button>
        {hasFilters ? (
          <Link href="/sessions" className="bio__inline-link">
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  )
}
