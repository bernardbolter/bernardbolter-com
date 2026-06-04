'use client'

import { Button } from '@payloadcms/ui'
import { useEffect, useState } from 'react'

type ArtworkPreview = {
  id: number
  title: string | null
  yearCreated: number | null
  seriesTitle: string | null
  thumbnailUrl: string | null
}

export function SessionLauncher({
  artworkId,
  disabled,
  onStarted,
}: {
  artworkId: number
  disabled?: boolean
  onStarted: (sessionId: string) => void
}) {
  const [artwork, setArtwork] = useState<ArtworkPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(
          `/api/art-official/artworks/search?q=&limit=1&artworkId=${artworkId}`,
        )
        if (!res.ok) return
        const data = await res.json()
        const doc = data.docs?.[0]
        if (!cancelled && doc) {
          setArtwork({
            id: doc.id,
            title: doc.title,
            yearCreated: doc.yearCreated,
            seriesTitle: doc.seriesTitle,
            thumbnailUrl: doc.thumbnailUrl,
          })
        }
      } catch {
        /* optional preview */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [artworkId])

  async function startSession() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/art-official/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionType: 'artwork-cataloguing',
          artworkRecord: artworkId,
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
      <h2 className="art-official-home__launcher-title">Begin full cataloguing</h2>
      <p className="art-official-home__launcher-lead">
        Start an Art/Official session on this stub record. The agent already has physical
        facts from Quick Upload and will focus on intent and context.
      </p>
      {artwork ? (
        <div className="art-official-home__launcher-card">
          {artwork.thumbnailUrl ? (
            <img
              src={artwork.thumbnailUrl}
              alt=""
              className="art-official-home__launcher-thumb"
            />
          ) : null}
          <div>
            <strong>{artwork.title}</strong>
            {artwork.yearCreated ? (
              <span> · {artwork.yearCreated}</span>
            ) : null}
            {artwork.seriesTitle ? (
              <span className="art-official-home__launcher-series">
                {' '}
                · {artwork.seriesTitle}
              </span>
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
