'use client'

import { useMemo } from 'react'

import { useArtworks } from '@/providers/ArtworkProvider'
import { getSeriesColor } from '@/helpers/seriesColor'
import { resolveSeriesSlug } from '@/helpers/artworkCatalog'
import {
  TitleCornerBottomLeft,
  TitleCornerBottomRight,
  TitleCornerTopLeft,
  TitleCornerTopRight,
} from '@/components/icons'

export default function ArtworkTitle() {
  const [state] = useArtworks()
  const viewportWidth = state.viewportWidth || 0
  const isMobile = viewportWidth <= 768

  const currentArtwork = useMemo(() => {
    const source = state.formattedArtworks?.artworksArray ?? state.filtered
    if (source.length === 0) return null
    const safeIndex = Math.min(Math.max(0, state.currentArtworkIndex), source.length - 1)
    return source[safeIndex]
  }, [state.currentArtworkIndex, state.filtered, state.formattedArtworks?.artworksArray])

  if (!currentArtwork) return null
  if (!state.artworkViewTimeline && !state.showSlideshow) return null

  const mediumLabel =
    currentArtwork.mediumOther?.trim() || currentArtwork.medium?.replaceAll('-', ' ') || ''
  const seriesColor = getSeriesColor(resolveSeriesSlug(currentArtwork) ?? 'a-colorful-history')
  const titleContainerClass = state.showSlideshow
    ? 'fixed bottom-space-2 left-space-2 z-overlay'
    : isMobile
      ? 'fixed bottom-space-2 left-space-2 z-overlay'
      : 'fixed bottom-space-2 left-1/2 z-overlay -translate-x-1/2'

  return (
    <div className={titleContainerClass}>
      <div className="flex items-end">
        <div className="h-4 w-4">
          <TitleCornerTopLeft />
        </div>
        <div className={`h-4 bg-[var(--surface-side-light)] ${state.showSlideshow || !isMobile ? 'w-[18rem]' : 'w-[14rem]'}`} />
        <div className="h-4 w-4">
          <TitleCornerTopRight />
        </div>
      </div>

      <div className="flex">
        <div className={`w-4 bg-[var(--surface-side-light)] ${state.showSlideshow ? 'block' : 'hidden m:block'}`} />
        <div
          className={`relative bg-[var(--surface-title)] px-space-3 py-space-2 ${
            state.showSlideshow ? 'w-[18rem]' : isMobile ? 'w-[14rem]' : 'w-[18rem]'
          }`}
        >
          <h1 className="truncate font-heading text-base leading-tight text-dark">{currentArtwork.title}</h1>
          <h2 className="font-heading text-sm text-secondary">{currentArtwork.yearCreated ?? '—'}</h2>
          <h3 className="truncate font-heading text-sm text-secondary">{mediumLabel}</h3>
          {currentArtwork.dimensionsDisplay && (
            <p className="truncate font-heading text-xs text-secondary">{currentArtwork.dimensionsDisplay}</p>
          )}
          <div
            className="absolute h-[0.625rem] w-[0.625rem]"
            style={{
              backgroundColor: seriesColor,
              right: state.showSlideshow ? 0 : 10,
              bottom: state.showSlideshow ? 10 : isMobile ? 10 : 0,
            }}
          />
        </div>
        <div className={`w-4 bg-[var(--surface-side-dark)] ${!state.showSlideshow ? 'block' : 'hidden m:block'}`} />
      </div>

      <div className="flex">
        <div className="h-4 w-4">
          <TitleCornerBottomLeft />
        </div>
        <div
          className={`h-4 bg-[var(--surface-side-dark)] ${
            state.showSlideshow || isMobile ? 'w-[14rem] m:w-[18rem]' : 'w-[18rem]'
          }`}
        />
        <div className="h-4 w-4">
          <TitleCornerBottomRight />
        </div>
      </div>
    </div>
  )
}
