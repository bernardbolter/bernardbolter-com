'use client'

import { useMemo } from 'react'

import {
  TitleCornerBottomLeft,
  TitleCornerBottomRight,
  TitleCornerTopLeft,
  TitleCornerTopRight,
} from '@/components/icons'
import { resolveSeriesSlug } from '@/helpers/artworkCatalog'
import { getSeriesColor } from '@/helpers/seriesColor'
import useWindowSize from '@/hooks/useWindowSize'
import { useArtworks } from '@/providers/ArtworkProvider'

import ArtworkSize, { getArtworkSizeInput } from './ArtworkSize'

export default function ArtworkTitle() {
  const [state] = useArtworks()
  const size = useWindowSize()

  const currentArtwork = useMemo(() => {
    const source = state.formattedArtworks?.artworksArray ?? state.filtered
    if (source.length === 0) return null
    const safeIndex = Math.min(Math.max(0, state.currentArtworkIndex), source.length - 1)
    return source[safeIndex]
  }, [state.currentArtworkIndex, state.filtered, state.formattedArtworks?.artworksArray])

  if (!currentArtwork) return null

  const isMobile = Boolean(size.width && size.width <= 768)
  const mediumLabel =
    currentArtwork.mediumOther?.trim() || currentArtwork.medium?.replaceAll('-', ' ') || ''
  const seriesColor = getSeriesColor(resolveSeriesSlug(currentArtwork) ?? 'a-colorful-history')
  const sizeInput = getArtworkSizeInput(currentArtwork)

  const containerClass = !state.artworkViewTimeline && !state.showSlideshow
    ? 'artwork-title__container artwork-title__container--hide'
    : state.showSlideshow
      ? 'artwork-title__container artwork-title__container--slideshow'
      : isMobile
        ? 'artwork-title__container artwork-title__container--mobile'
        : 'artwork-title__container artwork-title__container--desktop'

  return (
    <div className={containerClass}>
      <div className="artwork-title__border-top">
        <div className="artwork-title__border-top--left">
          <TitleCornerTopLeft />
        </div>
        <div
          className={
            state.showSlideshow
              ? 'artwork-title__border-top--middle'
              : size.width && size.width > 768
                ? 'artwork-title__border-top--middle artwork-title__border-top--show'
                : 'artwork-title__border-top--middle'
          }
        />
        <div className="artwork-title__border-top--right">
          <TitleCornerTopRight />
        </div>
      </div>

      <div className="artwork-title__border-middle">
        <div
          className={
            state.showSlideshow
              ? 'artwork-title__border-middle--left artwork-title__border-middle-left--show'
              : 'artwork-title__border-middle--left'
          }
        />
        <div
          className={
            state.showSlideshow
              ? 'artwork-title__inside artwork-title__inside--slideshow'
              : isMobile
                ? 'artwork-title__inside artwork-title__inside--mobile'
                : 'artwork-title__inside artwork-title__inside--desktop'
          }
        >
          <h1 className="artwork-title__title">{currentArtwork.title}</h1>
          <h2 className="artwork-title__year">{currentArtwork.yearCreated ?? '—'}</h2>
          {mediumLabel ? <h3 className="artwork-title__medium">{mediumLabel}</h3> : null}
          {sizeInput ? (
            <ArtworkSize width={sizeInput.width} height={sizeInput.height} units={sizeInput.units} />
          ) : null}
          <div
            className="artwork-title__series-box"
            style={{
              background: seriesColor,
              right: state.showSlideshow ? 0 : 10,
              bottom: state.showSlideshow ? 10 : isMobile ? 10 : 0,
            }}
          />
        </div>
        <div
          className={
            !state.showSlideshow
              ? 'artwork-title__border-middle--right artwork-title__border-middle-right--show'
              : 'artwork-title__border-middle--right'
          }
        />
      </div>

      <div className="artwork-title__border-bottom">
        <div className="artwork-title__border-bottom--left">
          <TitleCornerBottomLeft />
        </div>
        <div
          className={
            state.showSlideshow || (size.width !== undefined && size.width <= 768)
              ? 'artwork-title__border-bottom--middle artwork-title__border-bottom--show'
              : 'artwork-title__border-bottom--middle'
          }
        />
        <div className="artwork-title__border-bottom--right">
          <TitleCornerBottomRight />
        </div>
      </div>
    </div>
  )
}
