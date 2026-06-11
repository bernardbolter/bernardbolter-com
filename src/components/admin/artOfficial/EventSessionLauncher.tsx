'use client'

import { Button } from '@payloadcms/ui'
import { useEffect, useState } from 'react'

type EventPreview = {
  id: number
  title: string | null
  yearStart: number | null
  eventTypeLabel: string | null
}

export function EventSessionLauncher({
  eventId,
  disabled,
  onStarted,
}: {
  eventId: number
  disabled?: boolean
  onStarted: (sessionId: string) => void
}) {
  const [event, setEvent] = useState<EventPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`/api/art-official/event-queue?status=all&sort=year-desc`)
        if (!res.ok) return
        const data = await res.json()
        const doc = (data.docs as Array<{ id: number }> | undefined)?.find((d) => d.id === eventId)
        if (!cancelled && doc) {
          setEvent({
            id: doc.id,
            title: (doc as { title?: string }).title ?? null,
            yearStart: (doc as { yearStart?: number }).yearStart ?? null,
            eventTypeLabel: (doc as { eventTypeLabel?: string }).eventTypeLabel ?? null,
          })
        }
      } catch {
        /* optional preview */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [eventId])

  async function startSession() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/art-official/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionType: 'event-enrichment',
          eventRecord: eventId,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : `Failed (${res.status})`,
        )
      }
      if (typeof data.sessionId === 'string') {
        onStarted(data.sessionId)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start session')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="art-official-home__launcher">
      <h2 className="art-official-home__launcher-title">Begin event enrichment</h2>
      <p className="art-official-home__launcher-lead">
        Start an Art/Official session on this CV event. The agent has the stub facts from
        Quick Event and will help fill description, links, and venue details for the public
        page.
      </p>
      {event ? (
        <div className="art-official-home__launcher-card">
          <div>
            <strong>{event.title}</strong>
            {event.yearStart ? <span> · {event.yearStart}</span> : null}
            {event.eventTypeLabel ? (
              <span className="art-official-home__launcher-series"> · {event.eventTypeLabel}</span>
            ) : null}
          </div>
        </div>
      ) : null}
      <Button
        buttonStyle="primary"
        disabled={disabled || loading}
        onClick={() => void startSession()}
      >
        {loading ? 'Starting…' : 'Begin session'}
      </Button>
      {error ? <p className="art-official-home__error">{error}</p> : null}
    </section>
  )
}
