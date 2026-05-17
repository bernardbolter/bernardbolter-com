'use client'

import { Button } from '@payloadcms/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { SESSION_TYPES, type SessionType } from '@/lib/artOfficial/routing'

const LABELS: Record<string, string> = {
  'artwork-cataloguing': 'Artwork cataloguing',
  'artist-statement': 'Artist statement',
  biography: 'Biography',
  onboarding: 'Onboarding',
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function startSession() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/art-official/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionType }),
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

  return (
    <div style={{ marginBottom: 24 }}>
      <label style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
        Session type
        <select
          value={sessionType}
          onChange={(e) => setSessionType(e.target.value)}
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
      <Button
        buttonStyle="primary"
        disabled={disabled || loading}
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
