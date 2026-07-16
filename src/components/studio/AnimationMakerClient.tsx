'use client'

import { useState } from 'react'

type PaintingRow = {
  id: number
  title: string
  hasTimelapse: boolean
}

export function AnimationMakerClient({ paintings }: { paintings: PaintingRow[] }) {
  const [busyId, setBusyId] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function enqueue(artworkId: number) {
    setBusyId(artworkId)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch('/api/studio/timelapse', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkId }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        jobId?: string | null
        note?: string
      }
      if (!res.ok) throw new Error(data.error || 'Failed to enqueue timelapse')
      setMessage(
        data.note ||
          (data.jobId
            ? `Queued timelapse job ${data.jobId} for artwork #${artworkId}.`
            : `Timelapse enqueue acknowledged for #${artworkId} (pipeline may still be a stub).`),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enqueue failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="studio-tool">
      {message ? <p className="studio-archive__success">{message}</p> : null}
      {error ? <p className="studio-archive__error">{error}</p> : null}
      {paintings.length === 0 ? (
        <p className="studio-muted">No paintings yet.</p>
      ) : (
        <ul className="studio-tool__list">
          {paintings.map((painting) => (
            <li key={painting.id} className="studio-tool__row">
              <div>
                <strong>{painting.title}</strong>
                <p className="studio-muted">
                  {painting.hasTimelapse
                    ? 'Has final reference — ready to process when pipeline is live'
                    : 'No final reference yet'}
                </p>
              </div>
              <button
                type="button"
                className="studio-form__submit"
                disabled={busyId === painting.id}
                onClick={() => void enqueue(painting.id)}
              >
                {busyId === painting.id ? 'Queuing…' : 'Regenerate timelapse'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
