'use client'

import { Button } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { SESSION_TYPES } from '@/lib/artOfficial/routing'

const LABELS: Record<string, string> = {
  'artwork-cataloguing': 'Artwork cataloguing',
  'artist-statement': 'Artist statement',
  biography: 'Biography',
  onboarding: 'Onboarding',
}

export function NewSessionButton() {
  const router = useRouter()
  const [sessionType, setSessionType] = useState<string>('artwork-cataloguing')
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
        throw new Error(data.error ?? `Failed (${res.status})`)
      }
      const data = await res.json()
      router.push(`/admin/art-official/${data.sessionId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start session')
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
          style={{ display: 'block', marginTop: 4, minWidth: 240 }}
        >
          {SESSION_TYPES.map((t) => (
            <option key={t} value={t}>
              {LABELS[t] ?? t}
            </option>
          ))}
        </select>
      </label>
      <Button buttonStyle="primary" disabled={loading} onClick={startSession}>
        {loading ? 'Starting…' : 'Start session'}
      </Button>
      {error ? (
        <p style={{ color: 'var(--theme-error-500)', marginTop: 8, fontSize: 13 }}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
