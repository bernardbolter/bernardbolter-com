'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { ArtworkSearchResult } from '@/lib/artOfficial/artworkSearchTypes'
import type {
  StagedEventMedia,
  StagedInstallationImage,
} from '@/lib/artOfficial/stagedEventMedia'

import { ArtworkMultiPicker, ArtworkShownPicker } from './ArtworkMultiPicker'
import { AutoGrowTextarea } from './AutoGrowTextarea'
import { ImageUpload } from './ImageUpload'
import { MediaThumbnail } from './MediaThumbnail'

function newInstallationRowId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `new-${crypto.randomUUID()}`
  }
  return `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function serializeStaged(staged: StagedEventMedia): string {
  return JSON.stringify(staged)
}

export function EventMediaPanel({
  sessionId,
  disabled,
  onSaved,
}: {
  sessionId: string
  disabled?: boolean
  onSaved?: (media: StagedEventMedia) => void
}) {
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [eventTitle, setEventTitle] = useState<string | null>(null)
  const [artworks, setArtworks] = useState<ArtworkSearchResult[]>([])
  const [staged, setStaged] = useState<StagedEventMedia>({
    artworkIds: [],
    installationImages: [],
  })

  const onSavedRef = useRef(onSaved)
  const lastSavedJsonRef = useRef<string>('')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlightRef = useRef(false)
  const pendingSaveRef = useRef<StagedEventMedia | null>(null)
  const skipSaveRef = useRef(false)

  onSavedRef.current = onSaved

  const flushSave = useCallback(
    async (next: StagedEventMedia) => {
      const payloadJson = serializeStaged(next)
      if (payloadJson === lastSavedJsonRef.current) return

      if (inFlightRef.current) {
        pendingSaveRef.current = next
        return
      }

      inFlightRef.current = true
      setSaveState('saving')
      setError(null)

      let current: StagedEventMedia | null = next
      while (current) {
        const currentJson = serializeStaged(current)
        if (currentJson === lastSavedJsonRef.current) {
          pendingSaveRef.current = null
          break
        }

        try {
          const res = await fetch(`/api/art-official/sessions/${sessionId}/event-media`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: currentJson,
          })
          const data = await res.json().catch(() => ({}))
          if (!res.ok) {
            throw new Error(
              typeof data.error === 'string' ? data.error : `Save failed (${res.status})`,
            )
          }

          const saved = data.staged && typeof data.staged === 'object' ? data.staged : current
          lastSavedJsonRef.current = serializeStaged(saved as StagedEventMedia)
          onSavedRef.current?.(saved as StagedEventMedia)

          if (savedNoticeTimerRef.current) clearTimeout(savedNoticeTimerRef.current)
          setSaveState('saved')
          savedNoticeTimerRef.current = setTimeout(() => {
            setSaveState((state) => (state === 'saved' ? 'idle' : state))
          }, 2000)
        } catch (err) {
          setSaveState('error')
          setError(err instanceof Error ? err.message : 'Could not save event media')
          pendingSaveRef.current = null
          inFlightRef.current = false
          return
        }

        current = pendingSaveRef.current
        pendingSaveRef.current = null
      }

      inFlightRef.current = false
      setSaveState((state) => (state === 'saving' ? 'idle' : state))
    },
    [sessionId],
  )

  const queueSave = useCallback(
    (next: StagedEventMedia) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        void flushSave(next)
      }, 600)
    },
    [flushSave],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/art-official/sessions/${sessionId}/event-media`, {
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : `Load failed (${res.status})`)
      }

      const nextStaged: StagedEventMedia =
        data.staged && typeof data.staged === 'object'
          ? {
              artworkIds: Array.isArray(data.staged.artworkIds) ? data.staged.artworkIds : [],
              installationImages: Array.isArray(data.staged.installationImages)
                ? data.staged.installationImages
                : [],
            }
          : { artworkIds: [], installationImages: [] }

      skipSaveRef.current = true
      setEventTitle(typeof data.eventTitle === 'string' ? data.eventTitle : null)
      setArtworks(Array.isArray(data.artworks) ? data.artworks : [])
      setStaged(nextStaged)
      lastSavedJsonRef.current = serializeStaged(nextStaged)
      setSaveState('idle')
    } catch (err) {
      setSaveState('error')
      setError(err instanceof Error ? err.message : 'Could not load event media')
    } finally {
      setLoading(false)
      window.setTimeout(() => {
        skipSaveRef.current = false
      }, 0)
    }
  }, [sessionId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (loading || skipSaveRef.current) return
    if (serializeStaged(staged) === lastSavedJsonRef.current) return
    queueSave(staged)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [staged, loading, queueSave])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (savedNoticeTimerRef.current) clearTimeout(savedNoticeTimerRef.current)
    }
  }, [])

  function updateArtworks(nextArtworks: ArtworkSearchResult[]) {
    setArtworks(nextArtworks)
    const nextIds = nextArtworks.map((entry) => entry.id)
    setStaged((current) => ({
      artworkIds: nextIds,
      installationImages: current.installationImages.map((row) => ({
        ...row,
        artworksShown: (row.artworksShown ?? []).filter((id) => nextIds.includes(id)),
      })),
    }))
  }

  function updateInstallationRow(rowId: string, patch: Partial<StagedInstallationImage>) {
    setStaged((current) => ({
      ...current,
      installationImages: current.installationImages.map((row) =>
        row.id === rowId ? { ...row, ...patch } : row,
      ),
    }))
  }

  function removeInstallationRow(rowId: string) {
    setStaged((current) => ({
      ...current,
      installationImages: current.installationImages.filter((row) => row.id !== rowId),
    }))
  }

  function addInstallationPhoto(mediaId: number) {
    setStaged((current) => ({
      ...current,
      installationImages: [
        ...current.installationImages,
        { id: newInstallationRowId(), mediaId },
      ],
    }))
  }

  const saveLabel =
    saveState === 'saving' ? 'Saving…'
    : saveState === 'saved' ? 'Saved'
    : null

  if (loading) {
    return (
      <section className="art-official-event-media">
        <p className="art-official-event-media__loading">Loading exhibition media…</p>
      </section>
    )
  }

  return (
    <section className="art-official-event-media" aria-labelledby="art-official-event-media-heading">
      <div className="art-official-event-media__head">
        <h3 id="art-official-event-media-heading" className="art-official-event-media__title">
          Exhibition media
        </h3>
        <p className="art-official-event-media__lead">
          {eventTitle
            ? `Link artworks and upload installation photos for ${eventTitle}. Changes save automatically.`
            : 'Link artworks and upload installation photos for this event. Changes save automatically.'}
        </p>
        {saveLabel ? (
          <p
            className={`art-official-event-media__status${
              saveState === 'saved' ? ' art-official-event-media__status--saved' : ''
            }`}
          >
            {saveLabel}
          </p>
        ) : null}
        {error ? <p className="art-official-event-media__error">{error}</p> : null}
      </div>

      <div className="art-official-event-media__section">
        <h4 className="art-official-event-media__section-title">Artworks in this exhibition</h4>
        <ArtworkMultiPicker
          selected={artworks}
          onChange={updateArtworks}
          disabled={disabled}
          label="+ Add artwork to exhibition"
        />
      </div>

      <div className="art-official-event-media__section">
        <h4 className="art-official-event-media__section-title">Installation photos</h4>
        {staged.installationImages.length === 0 ? (
          <p className="art-official-event-media__empty">No installation photos yet.</p>
        ) : (
          <ul className="art-official-event-media__photos">
            {staged.installationImages.map((row) => (
              <li key={row.id} className="art-official-event-media__photo">
                <div className="art-official-event-media__photo-top">
                  <MediaThumbnail mediaId={row.mediaId} size="md" />
                  <div className="art-official-event-media__photo-fields">
                    <label className="art-official-event-media__field">
                      Caption
                      <AutoGrowTextarea
                        className="art-official-event-media__textarea"
                        value={row.caption ?? ''}
                        disabled={disabled}
                        onChange={(e) =>
                          updateInstallationRow(row.id, { caption: e.target.value })
                        }
                      />
                    </label>
                    <label className="art-official-event-media__field">
                      Alt text
                      <input
                        type="text"
                        className="art-official-event-media__input"
                        value={row.altText ?? ''}
                        disabled={disabled}
                        onChange={(e) =>
                          updateInstallationRow(row.id, { altText: e.target.value })
                        }
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    className="art-official-event-media__remove"
                    disabled={disabled}
                    onClick={() => removeInstallationRow(row.id)}
                  >
                    Remove
                  </button>
                </div>
                <div className="art-official-event-media__shown">
                  <p className="art-official-event-media__shown-label">Works visible in this photo</p>
                  <ArtworkShownPicker
                    selectedIds={row.artworksShown ?? []}
                    artworks={artworks}
                    disabled={disabled}
                    onChange={(ids) => updateInstallationRow(row.id, { artworksShown: ids })}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="art-official-event-media__upload">
          <ImageUpload
            disabled={disabled}
            altLabel={eventTitle ? `${eventTitle} installation photo` : 'Installation photo'}
            onUploaded={(mediaId) => addInstallationPhoto(mediaId)}
          />
        </div>
      </div>
    </section>
  )
}
