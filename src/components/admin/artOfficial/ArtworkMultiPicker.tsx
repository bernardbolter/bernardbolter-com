'use client'

import type { ArtworkSearchResult } from '@/lib/artOfficial/artworkSearchTypes'

import { ArtworkSearchPicker } from './ArtworkSearchPicker'

export function ArtworkMultiPicker({
  selected,
  onChange,
  disabled,
  label = 'Add artwork',
}: {
  selected: ArtworkSearchResult[]
  onChange: (next: ArtworkSearchResult[]) => void
  disabled?: boolean
  label?: string
}) {
  function addArtwork(artwork: ArtworkSearchResult | null) {
    if (!artwork) return
    if (selected.some((entry) => entry.id === artwork.id)) return
    onChange([...selected, artwork])
  }

  function removeArtwork(id: number) {
    onChange(selected.filter((entry) => entry.id !== id))
  }

  return (
    <div className="art-official-artwork-multi">
      {selected.length > 0 ? (
        <ul className="art-official-artwork-multi__list">
          {selected.map((artwork) => (
            <li key={artwork.id} className="art-official-artwork-multi__chip">
              {artwork.thumbnailUrl ? (
                <img
                  src={artwork.thumbnailUrl}
                  alt=""
                  className="art-official-artwork-picker__thumb"
                />
              ) : null}
              <span className="art-official-artwork-multi__chip-label">
                {artwork.title ?? artwork.slug}
                {artwork.yearCreated ? ` · ${artwork.yearCreated}` : ''}
              </span>
              <button
                type="button"
                className="art-official-artwork-picker__clear"
                onClick={() => removeArtwork(artwork.id)}
                disabled={disabled}
                aria-label={`Remove ${artwork.title ?? artwork.slug}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="art-official-event-media__empty">No artworks linked yet.</p>
      )}

      <ArtworkSearchPicker
        value={null}
        onChange={addArtwork}
        disabled={disabled}
        autoFocus
        excludeIds={selected.map((entry) => entry.id)}
        placeholder={`${label} — search title, slug, or series`}
      />
    </div>
  )
}

export function ArtworkShownPicker({
  selectedIds,
  artworks,
  onChange,
  disabled,
}: {
  selectedIds: number[]
  artworks: ArtworkSearchResult[]
  onChange: (ids: number[]) => void
  disabled?: boolean
}) {
  if (!artworks.length) {
    return (
      <p className="art-official-event-media__hint">
        Link exhibition artworks above first, then tag which appear in this photo.
      </p>
    )
  }

  return (
    <div className="art-official-artwork-shown">
      {artworks.map((artwork) => {
        const checked = selectedIds.includes(artwork.id)
        return (
          <label key={artwork.id} className="art-official-artwork-shown__option">
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={() => {
                if (checked) {
                  onChange(selectedIds.filter((id) => id !== artwork.id))
                } else {
                  onChange([...selectedIds, artwork.id])
                }
              }}
            />
            <span>{artwork.title ?? artwork.slug}</span>
          </label>
        )
      })}
    </div>
  )
}
