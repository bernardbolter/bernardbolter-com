'use client'

import { useEffect, useState } from 'react'

import {
  mediaPreviewUrl,
  normalizeMediaApiResponse,
} from '@/lib/artOfficial/mediaPreview'

export function StagedArtworkPreview({ mediaId }: { mediaId: number }) {
  const [src, setSrc] = useState<string | null>(null)
  const [alt, setAlt] = useState('Primary artwork')
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setError(false)
    setSrc(null)

    void (async () => {
      try {
        const res = await fetch(`/api/media/${mediaId}?depth=0`, {
          credentials: 'include',
        })
        if (!res.ok) {
          if (!cancelled) setError(true)
          return
        }
        const data = normalizeMediaApiResponse(await res.json())
        const url = data ? mediaPreviewUrl(data) : null
        if (!cancelled) {
          if (url) setSrc(url)
          else setError(true)
          if (data?.alt) setAlt(data.alt)
        }
      } catch {
        if (!cancelled) setError(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [mediaId])

  return (
    <figure className="art-official-sidebar__preview">
      <figcaption className="art-official-sidebar__preview-label">Primary artwork</figcaption>
      {src ? (
        <img className="art-official-sidebar__preview-img" src={src} alt={alt} />
      ) : error ? (
        <p className="art-official-sidebar__preview-fallback">Image staged (preview unavailable)</p>
      ) : (
        <p className="art-official-sidebar__preview-fallback">Loading preview…</p>
      )}
    </figure>
  )
}
