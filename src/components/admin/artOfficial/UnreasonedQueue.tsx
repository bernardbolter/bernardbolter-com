'use client'

import { Button } from '@payloadcms/ui'
import { useCallback, useEffect, useState } from 'react'

type QueueDoc = {
  id: number
  title: string | null
  yearCreated: number | null
  reasoningStatus: string
  series: { id: number; title: string; slug?: string } | null
  primaryImage: {
    thumbnailURL?: string | null
    url?: string | null
    width?: number | null
    height?: number | null
  } | null
  missingCount: number
}

type SeriesFilter = { id: number; title: string; count: number }

export function UnreasonedQueue({
  onBeginSession,
  onQuickUpload,
}: {
  onBeginSession: (artworkId: number) => void
  onQuickUpload: () => void
}) {
  const [docs, setDocs] = useState<QueueDoc[]>([])
  const [seriesOptions, setSeriesOptions] = useState<SeriesFilter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [seriesId, setSeriesId] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('year-desc')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        seriesId,
        status,
        sort,
      })
      const res = await fetch(`/api/art-official/unreasoned-queue?${params}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Failed to load queue')
      }
      setDocs(data.docs ?? [])
      setSeriesOptions(data.seriesFilterOptions ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load queue')
    } finally {
      setLoading(false)
    }
  }, [seriesId, status, sort])

  useEffect(() => {
    void load()
  }, [load])

  if (loading && docs.length === 0 && !error) {
    return <p className="art-official-home__loading">Loading queue…</p>
  }

  if (!loading && docs.length === 0 && !error) {
    return (
      <section className="art-official-queue art-official-queue--empty">
        <p className="art-official-queue__empty-title">
          All artworks have been fully catalogued.
        </p>
        <p className="art-official-queue__empty-lead">
          Use Quick Upload to add new works, then return here to deepen them in a full
          session.
        </p>
        <Button buttonStyle="secondary" onClick={onQuickUpload}>
          Go to Quick Upload
        </Button>
      </section>
    )
  }

  return (
    <section className="art-official-queue">
      <div className="art-official-queue__filters">
        <label>
          Series
          <select
            value={seriesId}
            onChange={(e) => setSeriesId(e.target.value)}
          >
            <option value="all">All</option>
            {seriesOptions.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.title} ({s.count})
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All</option>
            <option value="stub">Stub only</option>
            <option value="partial">Partial only</option>
          </select>
        </label>
        <label>
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="year-desc">Year (newest first)</option>
            <option value="year-asc">Year (oldest first)</option>
            <option value="series">Series</option>
            <option value="missing-desc">Missing fields (most first)</option>
          </select>
        </label>
        <button type="button" className="art-official-queue__refresh" onClick={() => void load()}>
          Refresh
        </button>
      </div>

      {error ? <p className="art-official-home__error">{error}</p> : null}

      <div className="art-official-queue__table-wrap">
        <table className="art-official-queue__table">
          <thead>
            <tr>
              <th />
              <th>Title</th>
              <th>Year</th>
              <th>Series</th>
              <th>Status</th>
              <th>Missing</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {docs.map((row) => {
              const thumb = row.primaryImage?.thumbnailURL ?? row.primaryImage?.url
              const w = row.primaryImage?.width
              const h = row.primaryImage?.height
              const aspect = w && h ? w / h : 1
              return (
                <tr key={row.id}>
                  <td>
                    {thumb ? (
                      <img
                        src={thumb}
                        alt=""
                        className="art-official-queue__thumb"
                        style={{ aspectRatio: aspect }}
                      />
                    ) : (
                      <span className="art-official-queue__thumb-placeholder" />
                    )}
                  </td>
                  <td>{row.title}</td>
                  <td>{row.yearCreated ?? '—'}</td>
                  <td>{row.series?.title ?? '—'}</td>
                  <td>
                    <span
                      className={
                        row.reasoningStatus === 'partial'
                          ? 'art-official-queue__pill art-official-queue__pill--partial'
                          : 'art-official-queue__pill art-official-queue__pill--stub'
                      }
                    >
                      {row.reasoningStatus}
                    </span>
                  </td>
                  <td>
                    {row.missingCount === 1
                      ? '1 field unwritten'
                      : `${row.missingCount} fields unwritten`}
                  </td>
                  <td>
                    <Button
                      buttonStyle="secondary"
                      onClick={() => onBeginSession(row.id)}
                    >
                      Begin session
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
