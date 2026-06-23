'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'

import type { ArtworkSearchResult } from '@/lib/artOfficial/artworkSearchTypes'
import { fetchArtworksForPicker } from '@/lib/artOfficial/fetchArtworksForPicker'

export function ArtworkSearchPicker({
  value,
  onChange,
  placeholder = 'Search by title, slug, or series…',
  disabled,
  autoFocus = false,
  excludeIds = [],
}: {
  value: ArtworkSearchResult | null
  onChange: (artwork: ArtworkSearchResult | null) => void
  placeholder?: string
  disabled?: boolean
  autoFocus?: boolean
  excludeIds?: number[]
}) {
  const listboxId = useId()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ArtworkSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(autoFocus)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const search = useCallback(async (q: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    try {
      const docs = await fetchArtworksForPicker(q, 12)
      if (controller.signal.aborted) return
      setResults(docs)
    } catch (err) {
      if (controller.signal.aborted) return
      setResults([])
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => void search(query), 220)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query, search, open])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const visibleResults = results.filter((artwork) => !excludeIds.includes(artwork.id))

  if (value) {
    return (
      <div className="art-official-artwork-picker__selected">
        {value.thumbnailUrl ? (
          <img
            src={value.thumbnailUrl}
            alt=""
            className="art-official-artwork-picker__thumb"
          />
        ) : null}
        <span className="art-official-artwork-picker__label">
          <strong>{value.title ?? value.slug}</strong>
          {value.yearCreated ? <span> · {value.yearCreated}</span> : null}
          {value.seriesTitle ? <span> · {value.seriesTitle}</span> : null}
        </span>
        <button
          type="button"
          className="art-official-artwork-picker__clear"
          onClick={() => onChange(null)}
          disabled={disabled}
          aria-label="Clear selection"
        >
          ×
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="art-official-artwork-picker">
      <input
        type="text"
        className="art-official-artwork-picker__input"
        placeholder={placeholder}
        value={query}
        disabled={disabled}
        autoFocus={autoFocus}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
      />
      {open ? (
        <ul id={listboxId} className="art-official-artwork-picker__results" role="listbox">
          {loading ? <li className="art-official-artwork-picker__hint">Searching…</li> : null}
          {error ? (
            <li className="art-official-artwork-picker__hint art-official-artwork-picker__hint--error">
              {error}
            </li>
          ) : null}
          {!loading && !error && visibleResults.length === 0 ? (
            <li className="art-official-artwork-picker__hint">
              {query.trim()
                ? 'No artworks found. Try title, slug, catalogue number, or series name.'
                : 'Loading recent artworks…'}
            </li>
          ) : null}
          {visibleResults.map((artwork) => (
            <li key={artwork.id}>
              <button
                type="button"
                className="art-official-artwork-picker__option"
                onClick={() => {
                  onChange(artwork)
                  setQuery('')
                  setOpen(false)
                }}
              >
                {artwork.thumbnailUrl ? (
                  <img
                    src={artwork.thumbnailUrl}
                    alt=""
                    className="art-official-artwork-picker__thumb"
                  />
                ) : null}
                <span>
                  <strong>{artwork.title ?? artwork.slug}</strong>
                  {artwork.yearCreated ? <span> · {artwork.yearCreated}</span> : null}
                  {artwork.seriesTitle ? <span> · {artwork.seriesTitle}</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
