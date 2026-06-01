'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import type { CoverageReport } from '@/lib/artOfficial/sessionCoverage'

import { CoverageTable } from './CoverageTable'

type SessionOption = {
  sessionId: string
  sessionType: string
  status: string
  artworkRecord?: number | null
  updatedAt?: string
}

export function AuditCoveragePanel({
  sessions,
  initialSessionId,
}: {
  sessions: SessionOption[]
  initialSessionId?: string | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedId, setSelectedId] = useState(
    initialSessionId ?? sessions[0]?.sessionId ?? '',
  )
  const [report, setReport] = useState<CoverageReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadReport = useCallback(async (sessionId: string) => {
    if (!sessionId) {
      setReport(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/art-official/sessions/${sessionId}/coverage`)
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as CoverageReport
      setReport(data)
    } catch (e) {
      setReport(null)
      setError(e instanceof Error ? e.message : 'Failed to load coverage')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedId) void loadReport(selectedId)
  }, [selectedId, loadReport])

  const onSelect = (sessionId: string) => {
    setSelectedId(sessionId)
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.set('sessionId', sessionId)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  return (
    <div>
      <label className="art-official-audit__picker-label" htmlFor="audit-session-picker">
        Session
      </label>
      <select
        id="audit-session-picker"
        className="art-official-audit__picker"
        value={selectedId}
        onChange={(e) => onSelect(e.target.value)}
      >
        {sessions.length === 0 ? (
          <option value="">No completed sessions</option>
        ) : (
          sessions.map((s) => (
            <option key={s.sessionId} value={s.sessionId}>
              {s.sessionType} · {s.sessionId.slice(0, 8)}… ·{' '}
              {s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : '—'}
            </option>
          ))
        )}
      </select>

      {loading ? <p className="art-official-audit__status">Loading coverage…</p> : null}
      {error ? <p className="art-official-audit__error">{error}</p> : null}
      {report && !loading ? <CoverageTable report={report} /> : null}
    </div>
  )
}
