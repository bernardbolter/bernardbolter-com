import Link from 'next/link'

import { DocumentScrollShell } from '@/components/layout/DocumentScrollShell'
import CorpusFiltersClearLink from '@/components/corpus/CorpusFiltersClearLink'
import type {
  ArtifactCorpusIndexRow,
  ArtifactSeriesOption,
} from '@/lib/corpus/artifact/projectFromArtifact'
import {
  buildCorpusIndexQueryString,
  corpusIndexHasActiveFilters,
  type CorpusIndexFilters,
} from '@/lib/corpus/corpusIndexFilters'

export type CorpusIndexRow = ArtifactCorpusIndexRow

type Props = {
  rows: CorpusIndexRow[]
  seriesList: ArtifactSeriesOption[]
  filters: CorpusIndexFilters
}

export default function CorpusIndex({ rows, seriesList, filters }: Props) {
  const isTier2 = corpusIndexHasActiveFilters(filters)

  return (
    <DocumentScrollShell
      title="CORPUS"
      closeHref="/"
      scrollClassName="bio-container"
      closeClassName="bio__close-container"
    >
      <div className="bio__content-container corpus-page">
        <p className="bio__tagline">
          {isTier2 ? 'Filtered orientation' : 'Archive orientation'}
        </p>
        <p className="bio__masonry-caption corpus-page__lede">
          A compact index for triage — not a discovery engine for cross-work patterns. Open a work
          for the full record and sessions; vision analysis has its own page when present.
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
            {isTier2 ? <CorpusFiltersClearLink /> : null}
          </div>
        </form>

        <p className="bio__masonry-caption">
          {rows.length} work{rows.length === 1 ? '' : 's'}
          {isTier2 ? ` · ${buildCorpusIndexQueryString(filters)}` : ''}
        </p>

        <ul className="corpus-page__list">
          {rows.map((row) => {
            const intent = row.intent?.trim()
            const intentLine =
              isTier2 && intent
                ? intent.length > 160
                  ? `${intent.slice(0, 157)}…`
                  : intent
                : null
            return (
              <li key={row.slug} className="corpus-page__row">
                <div className="corpus-page__meta">
                  <span className="corpus-page__year">{row.yearCreated ?? '—'}</span>
                  <span className="corpus-page__status">{row.reasoningStatus ?? '—'}</span>
                </div>
                <div className="corpus-page__body">
                  <Link href={`/${row.slug}`} className="corpus-page__title">
                    {row.title}
                  </Link>
                  {row.seriesName ? (
                    <p className="bio__masonry-caption">{row.seriesName}</p>
                  ) : null}
                  {row.gist ? (
                    <p className="bio__masonry-caption corpus-page__gist">{row.gist}</p>
                  ) : null}
                  {intentLine ? (
                    <p className="bio__masonry-caption corpus-page__intent">{intentLine}</p>
                  ) : null}
                  <p className="corpus-page__links">
                    <Link href={`/${row.slug}`} className="still-being-written__session-link">
                      Artwork
                    </Link>
                    <Link href={`/${row.slug}/vision`} className="still-being-written__session-link">
                      Vision
                    </Link>
                    <Link
                      href={`/${row.slug}#sessions`}
                      className="still-being-written__session-link"
                    >
                      Sessions
                    </Link>
                    <a
                      href={`/api/corpus/${encodeURIComponent(row.slug)}/sessions`}
                      className="still-being-written__session-link"
                    >
                      Full session data (JSON)
                    </a>
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
