'use client'

import { Button } from '@payloadcms/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'

import { SESSION_TYPES, type SessionType } from '@/lib/artOfficial/routing'

const LABELS: Record<string, string> = {
  'artwork-cataloguing': 'Artwork cataloguing',
  'triptych-cataloguing': 'Triptych cataloguing',
  'connected-reading': 'Connected reading',
  'artist-statement': 'Artist statement',
  biography: 'Biography',
  onboarding: 'Onboarding',
  'annual-snapshot': 'Annual snapshot',
  sequencing: 'Sequencing',
  'episode-storyboard': 'Episode storyboard',
  'episode-assembly': 'Episode assembly',
  'event-enrichment': 'Event enrichment',
  'corpus-revisit': 'Corpus revisit',
}

type ArtworkResult = {
  id: number
  title: string | null
  slug: string | null
  yearCreated: number | null
  seriesTitle: string | null
  thumbnailUrl: string | null
}

function ArtworkPicker({
  value,
  onChange,
}: {
  value: ArtworkResult | null
  onChange: (a: ArtworkResult | null) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ArtworkResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/art-official/artworks/search?q=${encodeURIComponent(q)}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.docs ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => void search(query), 280)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, search])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (value) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--theme-elevation-100)', borderRadius: 4, fontSize: 13 }}>
        {value.thumbnailUrl ? (
          <img src={value.thumbnailUrl} alt="" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />
        ) : null}
        <span style={{ flex: 1, minWidth: 0 }}>
          <strong>{value.title ?? value.slug}</strong>
          {value.yearCreated ? <span style={{ opacity: 0.65 }}> · {value.yearCreated}</span> : null}
          {value.seriesTitle ? <span style={{ opacity: 0.65 }}> · {value.seriesTitle}</span> : null}
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, padding: '0 4px', fontSize: 16, lineHeight: 1 }}
          aria-label="Clear selection"
        >×</button>
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        type="text"
        placeholder="Search by title or slug…"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        style={{ width: '100%', padding: '6px 8px', fontSize: 13, boxSizing: 'border-box', border: '1px solid var(--theme-elevation-200)', borderRadius: 4 }}
      />
      {open && (query.trim() || results.length > 0) ? (
        <ul style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'var(--theme-elevation-0)', border: '1px solid var(--theme-elevation-200)',
          borderRadius: 4, margin: 0, padding: 0, listStyle: 'none',
          maxHeight: 240, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {loading ? (
            <li style={{ padding: '8px 10px', fontSize: 13, opacity: 0.6 }}>Searching…</li>
          ) : results.length === 0 && query.trim() ? (
            <li style={{ padding: '8px 10px', fontSize: 13, opacity: 0.6 }}>No artworks found for "{query}"</li>
          ) : (
            results.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); onChange(a); setOpen(false); setQuery('') }}
                  style={{
                    width: '100%', textAlign: 'left', background: 'none', border: 'none',
                    cursor: 'pointer', padding: '7px 10px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  {a.thumbnailUrl ? (
                    <img src={a.thumbnailUrl} alt="" style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />
                  ) : (
                    <span style={{ width: 24, height: 24, background: 'var(--theme-elevation-150)', borderRadius: 2, flexShrink: 0, display: 'inline-block' }} />
                  )}
                  <span>
                    <strong>{a.title ?? a.slug}</strong>
                    {a.yearCreated ? <span style={{ opacity: 0.65 }}> · {a.yearCreated}</span> : null}
                    {a.seriesTitle ? <span style={{ opacity: 0.55, fontSize: 12 }}> · {a.seriesTitle}</span> : null}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  )
}

export function NewSessionButton({
  defaultSessionType = 'artwork-cataloguing',
  disabled = false,
  artistsHref,
  artistCreateHref,
}: {
  defaultSessionType?: SessionType
  disabled?: boolean
  artistsHref?: string
  artistCreateHref?: string
}) {
  const router = useRouter()
  const [sessionType, setSessionType] = useState<string>(defaultSessionType)
  const [refineMode, setRefineMode] = useState(false)
  const [selectedArtwork, setSelectedArtwork] = useState<ArtworkResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isArtworkCataloguing = sessionType === 'artwork-cataloguing'

  async function startSession() {
    setLoading(true)
    setError(null)
    try {
      const body: Record<string, unknown> = { sessionType }
      if (isArtworkCataloguing && refineMode && selectedArtwork) {
        body.artworkRecord = selectedArtwork.id
      }
      const res = await fetch('/api/art-official/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message =
          typeof data.error === 'string' ? data.error : `Failed (${res.status})`
        if (res.status === 412 && message.toLowerCase().includes('artist')) {
          throw new Error('ARTIST_MISSING')
        }
        throw new Error(message)
      }
      const data = await res.json()
      router.push(`/admin/art-official/${data.sessionId}`)
    } catch (e) {
      if (e instanceof Error && e.message === 'ARTIST_MISSING') {
        setError('ARTIST_MISSING')
      } else {
        setError(e instanceof Error ? e.message : 'Could not start session')
      }
    } finally {
      setLoading(false)
    }
  }

  const canStart = !disabled && !loading && (!isArtworkCataloguing || !refineMode || selectedArtwork !== null)

  return (
    <div style={{ marginBottom: 24 }}>
      <label style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
        Session type
        <select
          value={sessionType}
          onChange={(e) => { setSessionType(e.target.value); setRefineMode(false); setSelectedArtwork(null) }}
          disabled={disabled}
          style={{ display: 'block', marginTop: 4, minWidth: 240 }}
        >
          {SESSION_TYPES.map((t) => (
            <option key={t} value={t}>
              {LABELS[t] ?? t}
            </option>
          ))}
        </select>
      </label>

      {isArtworkCataloguing ? (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => { setRefineMode(false); setSelectedArtwork(null) }}
              style={{
                padding: '4px 12px', fontSize: 12, borderRadius: 4, cursor: 'pointer', border: '1px solid var(--theme-elevation-200)',
                background: !refineMode ? 'var(--theme-elevation-200)' : 'transparent',
                fontWeight: !refineMode ? 600 : 400,
              }}
            >New artwork</button>
            <button
              type="button"
              onClick={() => setRefineMode(true)}
              style={{
                padding: '4px 12px', fontSize: 12, borderRadius: 4, cursor: 'pointer', border: '1px solid var(--theme-elevation-200)',
                background: refineMode ? 'var(--theme-elevation-200)' : 'transparent',
                fontWeight: refineMode ? 600 : 400,
              }}
            >Update existing artwork</button>
          </div>

          {refineMode ? (
            <div>
              <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
                Select the artwork to refine. The agent will see what's already filled and focus on the gaps.
              </p>
              <ArtworkPicker
                value={selectedArtwork}
                onChange={setSelectedArtwork}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <Button
        buttonStyle="primary"
        disabled={!canStart}
        onClick={startSession}
      >
        {loading ? 'Starting…' : 'Start session'}
      </Button>

      {disabled ? (
        <p style={{ marginTop: 8, fontSize: 13, opacity: 0.8 }}>
          Create your Artist record first (see instructions above), then return here.
        </p>
      ) : null}
      {error === 'ARTIST_MISSING' && artistsHref && artistCreateHref ? (
        <p style={{ color: 'var(--theme-error-500)', marginTop: 8, fontSize: 13, lineHeight: 1.5 }}>
          No Artist record found.{' '}
          <Link href={artistCreateHref}>Create Artist</Link>
          {' or '}
          <Link href={artistsHref}>open Artists</Link>
          , save, refresh this page, then try again.
        </p>
      ) : error ? (
        <p style={{ color: 'var(--theme-error-500)', marginTop: 8, fontSize: 13 }}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
