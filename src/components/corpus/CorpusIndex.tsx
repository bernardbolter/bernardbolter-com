import Link from 'next/link'

import { DocumentScrollShell } from '@/components/layout/DocumentScrollShell'
import CorpusLadder from '@/components/corpus/CorpusLadder'
import { corpusGistFromArtwork } from '@/lib/corpus/corpusGist'
import {
  buildCorpusIndexQueryString,
  corpusIndexHasActiveFilters,
  type CorpusIndexFilters,
} from '@/lib/corpus/corpusIndexFilters'
import type { Artwork, Series } from '@/payload-types'

export type CorpusIndexRow = {
  artwork: Artwork
  gist: string | null
}

type Props = {
  rows: CorpusIndexRow[]
  seriesList: Series[]
  filters: CorpusIndexFilters
}

function resolveSeriesName(artwork: Artwork): string | null {
  if (artwork.series && typeof artwork.series === 'object') return artwork.series.name
  return null
}

export default function CorpusIndex({ rows, seriesList, filters }: Props) {
  const isTier2 = corpusIndexHasActiveFilters(filters)
  const clearHref = '/corpus'

  return (
    <DocumentScrollShell
      title="CORPUS"
      closeHref="/"
      scrollClassName="bio-container"
      closeClassName="bio__close-container"
    >
      <div className="bio__content-container corpus-page">
        <CorpusLadder current="corpus" />
        <p className="bio__tagline">
          {isTier2 ? 'Filtered orientation' : 'Archive orientation'}
        </p>
        <p className="bio__masonry-caption corpus-page__lede">
          A compact index for triage — not a discovery engine for cross-work patterns. Drill into
          Vision, Record, then Sessions for how a work was reasoned.
        </p>

        <form className="corpus-page__filters" method="get" action="/corpus">
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
            <span>Year from</span>
            <input
              name="yearFrom"
              type="text"
              inputMode="numeric"
              placeholder="1993"
              defaultValue={filters.yearFrom ?? ''}
            />
          </label>
          <label className="corpus-page__field">
            <span>Year to</span>
            <input
              name="yearTo"
              type="text"
              inputMode="numeric"
              placeholder="2026"
              defaultValue={filters.yearTo ?? ''}
            />
          </label>
          <label className="corpus-page__field">
            <span>Reasoning</span>
            <select name="status" defaultValue={filters.status ?? ''}>
              <option value="">Any</option>
              <option value="stub">stub</option>
              <option value="partial">partial</option>
              <option value="complete">complete</option>
            </select>
          </label>
          <label className="corpus-page__field">
            <span>Vision</span>
            <select
              name="hasVisionAnalyses"
              defaultValue={
                filters.hasVisionAnalyses == null ? '' : filters.hasVisionAnalyses ? 'true' : 'false'
              }
            >
              <option value="">Any</option>
              <option value="true">Has analyses</option>
              <option value="false">None yet</option>
            </select>
          </label>
          <div className="corpus-page__filter-actions">
            <button type="submit">Apply</button>
            {isTier2 ? (
              <Link href={clearHref} className="bio__inline-link">
                Clear
              </Link>
            ) : null}
          </div>
        </form>

        <p className="bio__masonry-caption">
          {rows.length} work{rows.length === 1 ? '' : 's'}
          {isTier2 ? ` · ${buildCorpusIndexQueryString(filters)}` : ''}
        </p>

        <ul className="corpus-page__list">
          {rows.map(({ artwork, gist }) => {
            const seriesName = resolveSeriesName(artwork)
            const intent = artwork.intent?.trim()
            const intentLine =
              isTier2 && intent
                ? intent.length > 160
                  ? `${intent.slice(0, 157)}…`
                  : intent
                : null
            return (
              <li key={artwork.id} className="corpus-page__row">
                <div className="corpus-page__meta">
                  <span className="corpus-page__year">
                    {artwork.yearCreated ?? '—'}
                  </span>
                  <span className="corpus-page__status">
                    {artwork.reasoningStatus ?? '—'}
                  </span>
                </div>
                <div className="corpus-page__body">
                  <Link href={`/${artwork.slug}`} className="corpus-page__title">
                    {artwork.title}
                  </Link>
                  {seriesName ? (
                    <p className="bio__masonry-caption">{seriesName}</p>
                  ) : null}
                  {gist ? <p className="bio__masonry-caption corpus-page__gist">{gist}</p> : null}
                  {intentLine ? (
                    <p className="bio__masonry-caption corpus-page__intent">{intentLine}</p>
                  ) : null}
                  <p className="corpus-page__links">
                    <Link href={`/${artwork.slug}/vision`} className="still-being-written__session-link">
                      Vision
                    </Link>
                    <Link href={`/${artwork.slug}/record`} className="still-being-written__session-link">
                      Record
                    </Link>
                    <Link
                      href={`/sessions?artwork=${encodeURIComponent(artwork.slug)}`}
                      className="still-being-written__session-link"
                    >
                      Sessions
                    </Link>
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </DocumentScrollShell>
  )
}

/** Helper for page.tsx */
export function rowsFromArtworks(artworks: Artwork[]): CorpusIndexRow[] {
  return artworks.map((artwork) => ({
    artwork,
    gist: corpusGistFromArtwork(artwork),
  }))
}
