'use client'

import { Button } from '@payloadcms/ui'
import { useCallback, useEffect, useRef, useState } from 'react'

type MediaDoc = {
  id: number
  alt?: string | null
  url?: string | null
  thumbnailURL?: string | null
  mimeType?: string | null
  filename?: string | null
}

export function MediaLibraryPicker({
  onSelected,
  disabled,
  acceptImagesOnly = true,
  buttonLabel = 'Choose from library',
}: {
  onSelected: (mediaId: number) => void
  disabled?: boolean
  acceptImagesOnly?: boolean
  buttonLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [docs, setDocs] = useState<MediaDoc[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const load = useCallback(async () => {
    if (!mountedRef.current) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        limit: '48',
        sort: '-createdAt',
        depth: '0',
      })
      const res = await fetch(`/api/media?${params.toString()}`, { credentials: 'include' })
      if (!res.ok) {
        throw new Error(`Could not load media (${res.status})`)
      }
      const data = (await res.json()) as { docs?: MediaDoc[] }
      if (!mountedRef.current) return
      let items = data.docs ?? []
      if (acceptImagesOnly) {
        items = items.filter((d) => !d.mimeType || d.mimeType.startsWith('image/'))
      }
      setDocs(items)
    } catch (err) {
      if (!mountedRef.current) return
      setError(err instanceof Error ? err.message : 'Failed to load media')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [acceptImagesOnly])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  function pick(doc: MediaDoc) {
    setOpen(false)
    onSelected(doc.id)
  }

  return (
    <div className="art-official-chat__media-library">
      <Button
        buttonStyle="secondary"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Hide library' : buttonLabel}
      </Button>
      {open ? (
        <div className="art-official-chat__media-library-panel">
          <p className="art-official-chat__media-library-hint">
            Pick an existing file from the Media collection — no need to upload again.
          </p>
          {loading ? <p className="art-official-chat__upload-hint">Loading media…</p> : null}
          {error ? <p className="art-official-chat__upload-error">{error}</p> : null}
          {!loading && !error && docs.length === 0 ? (
            <p className="art-official-chat__upload-hint">No matching media found.</p>
          ) : null}
          <ul className="art-official-chat__media-library-grid">
            {docs.map((doc) => {
              const thumb = doc.thumbnailURL || doc.url
              const label = doc.alt || doc.filename || `Media #${doc.id}`
              return (
                <li key={doc.id}>
                  <button
                    type="button"
                    className="art-official-chat__media-library-item"
                    disabled={disabled}
                    onClick={() => pick(doc)}
                    title={label}
                  >
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" className="art-official-chat__media-library-thumb" />
                    ) : (
                      <span className="art-official-chat__media-library-fallback">#{doc.id}</span>
                    )}
                    <span className="art-official-chat__media-library-label">{label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
