'use client'

import { useEffect, useState } from 'react'

import {
  mediaPreviewUrl,
  normalizeMediaApiResponse,
} from '@/lib/artOfficial/mediaPreview'

type Props = {
  mediaId: number
  size?: 'sm' | 'md'
  className?: string
}

export function MediaThumbnail({ mediaId, size = 'sm', className = '' }: Props) {
  const [src, setSrc] = useState<string | null>(null)
  const [alt, setAlt] = useState('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setSrc(null)

    void (async () => {
      try {
        const res = await fetch(`/api/media/${mediaId}?depth=0`, {
          credentials: 'include',
        })
        if (!res.ok) {
          if (!cancelled) setStatus('error')
          return
        }
        const data = normalizeMediaApiResponse(await res.json())
        const url = data ? mediaPreviewUrl(data) : null
        if (cancelled) return
        if (url) {
          setSrc(url)
          setAlt(data?.alt?.trim() ?? '')
          setStatus('ready')
        } else {
          setStatus('error')
        }
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [mediaId])

  const sizeClass =
    size === 'md' ?
      'art-official-upload__thumb--md'
    : 'art-official-upload__thumb--sm'

  return (
    <div
      className={`art-official-upload__thumb ${sizeClass}${className ? ` ${className}` : ''}`}
      title={alt || `Media #${mediaId}`}
    >
      {status === 'ready' && src ? (
        <img src={src} alt={alt || ''} className="art-official-upload__thumb-img" />
      ) : status === 'loading' ? (
        <span className="art-official-upload__thumb-fallback">…</span>
      ) : (
        <span className="art-official-upload__thumb-fallback">#{mediaId}</span>
      )}
    </div>
  )
}
