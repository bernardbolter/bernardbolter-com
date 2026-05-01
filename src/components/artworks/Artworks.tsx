// src/components/Artworks/Artworks.tsx
'use client'

import { useEffect } from 'react'
import { useArtworks } from '@/providers/ArtworkProvider'
import type { Artwork } from '@/payload-types'

type ArtworkWithImage = Artwork & {
  primaryImage?: ({ url?: string } & Partial<Artwork['primaryImage']>) | null
}

function getImageUrl(artwork: ArtworkWithImage): {
  url: string | null
  source: 'R2' | 'WP' | null
} {
  // Check R2/Payload media first
  if (
    artwork.primaryImage &&
    typeof artwork.primaryImage === 'object' &&
    artwork.primaryImage.url
  ) {
    return { url: artwork.primaryImage.url, source: 'R2' }
  }
  // Fall back to WordPress URL
  if (artwork.wpImageUrl) {
    return { url: artwork.wpImageUrl, source: 'WP' }
  }
  return { url: null, source: null }
}

export default function Artworks() {
  const [state] = useArtworks()
  const artworks = state.filtered as ArtworkWithImage[]

  // Stats for image sources
  const stats = {
    r2: artworks.filter((a) => a.primaryImage?.url).length,
    wp: artworks.filter((a) => !a.primaryImage?.url && a.wpImageUrl).length,
  }

  useEffect(() => {
    console.log('=== ARTWORKS STATE ===')
    console.log(
      'Showing:',
      artworks.length,
      '| Filtered out:',
      state.totalCount - state.withImagesCount,
    )
    console.log('From R2:', stats.r2, '| From WP:', stats.wp)
    console.log('First artwork:', artworks[0])
  }, [artworks, stats.r2, stats.wp, state.totalCount, state.withImagesCount])

  if (artworks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-black/40">No artworks found</div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-4 mb-4 text-xs font-mono">
        <span className="text-black/60">
          {artworks.length} artworks
          {state.totalCount > state.withImagesCount && (
            <span className="text-black/40 ml-1">
              (filtered {state.totalCount - state.withImagesCount} without images)
            </span>
          )}
        </span>
        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">R2: {stats.r2}</span>
        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">WP: {stats.wp}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {artworks.map((artwork) => {
          const { url, source } = getImageUrl(artwork)

          return (
            <div
              key={artwork.id}
              className="group relative bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              {/* Image container */}
              <div className="relative aspect-square bg-gray-100">
                {url ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={artwork.name ?? ''}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Source badge */}
                    {source && (
                      <span
                        className={`absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-bold rounded ${
                          source === 'R2' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
                        }`}
                      >
                        {source}
                      </span>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-400 text-xs">no image</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-2">
                <p className="text-sm font-medium text-gray-800 truncate">{artwork.name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {typeof artwork.series === 'object' && artwork.series
                    ? artwork.series.name
                    : (artwork.seriesSlug ?? '—')}
                </p>
                <p className="text-xs text-gray-400">
                  {artwork.dateCreated ? new Date(artwork.dateCreated).getFullYear() : '—'}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
