'use client'

import { Button } from '@payloadcms/ui'
import { useCallback, useEffect, useState } from 'react'

type QueueDoc = {
  id: number
  title: string | null
  yearStart: number | null
  eventType: string
  eventTypeLabel: string
  venueName: string | null
  venueCity: string | null
  enrichmentStatus: string
  missingCount: number
}

type TypeFilter = { value: string; label: string; count: number }

export function UnreasonedEventsQueue({
  onBeginSession,
  onQuickEvent,
}: {
  onBeginSession: (eventId: number) => void
  onQuickEvent: () => void
}) {
  const [docs, setDocs] = useState<QueueDoc[]>([])
  const [typeOptions, setTypeOptions] = useState<TypeFilter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [eventType, setEventType] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('year-desc')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ eventType, status, sort })
      const res = await fetch(`/api/art-official/event-queue?${params}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Failed to load queue')
      }
      setDocs(data.docs ?? [])
      setTypeOptions(data.typeFilterOptions ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load queue')
    } finally {
      setLoading(false)
    }
  }, [eventType, status, sort])

  useEffect(() => {
    void load()
  }, [load])

  if (loading && docs.length === 0 && !error) {
    return <p className="art-official-home__loading">Loading events queue…</p>
  }

  if (!loading && docs.length === 0 && !error) {
    return (
      <section className="art-official-queue art-official-queue--empty">
        <p className="art-official-queue__empty-title">
          All events have been fully documented.
        </p>
        <p className="art-official-queue__empty-lead">
          Use Quick Event to add new CV entries, then return here to enrich them.
        </p>
        <Button buttonStyle="secondary" onClick={onQuickEvent}>
          Go to Quick Event
        </Button>
      </section>
    )
  }

  return (
    <section className="art-official-queue">
      <div className="art-official-queue__filters">
        <label>
          Type
          <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
            <option value="all">All</option>
            {typeOptions.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label} ({t.count})
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
            <option value="type">Type</option>
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
              <th>Type</th>
              <th>Title</th>
              <th>Year</th>
              <th>Venue</th>
              <th>Status</th>
              <th>Missing</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {docs.map((row) => {
              const venue = [row.venueName, row.venueCity].filter(Boolean).join(', ')
              return (
                <tr key={row.id}>
                  <td>
                    <span className="art-official-queue__pill art-official-queue__pill--stub">
                      {row.eventTypeLabel}
                    </span>
                  </td>
                  <td>{row.title}</td>
                  <td>{row.yearStart ?? '—'}</td>
                  <td>{venue || '—'}</td>
                  <td>
                    <span
                      className={
                        row.enrichmentStatus === 'partial'
                          ? 'art-official-queue__pill art-official-queue__pill--partial'
                          : 'art-official-queue__pill art-official-queue__pill--stub'
                      }
                    >
                      {row.enrichmentStatus}
                    </span>
                  </td>
                  <td>
                    {row.missingCount === 1
                      ? '1 field needed'
                      : `${row.missingCount} fields needed`}
                  </td>
                  <td>
                    <Button buttonStyle="secondary" onClick={() => onBeginSession(row.id)}>
                      Enrich
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
