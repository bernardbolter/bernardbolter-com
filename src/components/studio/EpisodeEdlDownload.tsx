'use client'

import { useState } from 'react'

type EpisodeEdlDownloadProps = {
  episodeId: number
  hasAssemblyClips: boolean
}

export function EpisodeEdlDownload({ episodeId, hasAssemblyClips }: EpisodeEdlDownloadProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function download() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/studio/episodes/${episodeId}/edl`, {
        credentials: 'include',
      })
      if (!res.ok) {
        let message = `Download failed (${res.status})`
        try {
          const body = (await res.json()) as { error?: string }
          if (body.error) message = body.error
        } catch {
          /* ignore */
        }
        throw new Error(message)
      }

      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const match = /filename="([^"]+)"/.exec(disposition)
      const filename = match?.[1] ?? `episode-${episodeId}-assembly.edl`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="studio-edl">
      <p className="studio-muted">
        Rough cut for DaVinci Resolve: import the episode MP4s into the media pool, then open this
        EDL. Reel names match the uploaded filenames. Fine-cut in Resolve after.
      </p>
      <button
        type="button"
        className="studio-form__submit"
        disabled={!hasAssemblyClips || busy}
        onClick={() => void download()}
      >
        {busy ? 'Preparing…' : 'Download EDL'}
      </button>
      {error ? <p className="studio-form__error">{error}</p> : null}
    </div>
  )
}
