'use client'

import { useMemo } from 'react'

import {
  TitleCornerBottomLeft,
  TitleCornerBottomRight,
  TitleCornerTopLeft,
  TitleCornerTopRight,
} from '@/components/icons'
import { useHomepageFlip } from '@/components/artworks/homepageFlip'
import { resolveSeriesSlug } from '@/helpers/artworkCatalog'
import { getSeriesColor } from '@/helpers/seriesColor'
import useWindowSize from '@/hooks/useWindowSize'
import { resolveMediumLabel } from '@/lib/artwork/mediumVocabulary'
import { resolveSeriesDisplay } from '@/lib/artwork/catalogueIdentity'
import { useArtworks } from '@/providers/ArtworkProvider'

import ArtworkSize, { getArtworkSizeInput } from './ArtworkSize'

export default function ArtworkTitle() {
  const [state] = useArtworks()
  const size = useWindowSize()
  const { flippedSlug, setFlippedSlug } = useHomepageFlip()

  const currentArtwork = useMemo(() => {
    const source = state.formattedArtworks?.artworksArray ?? state.filtered
    if (source.length === 0) return null
    const safeIndex = Math.min(Math.max(0, state.currentArtworkIndex), source.length - 1)
    return source[safeIndex]
  }, [state.currentArtworkIndex, state.filtered, state.formattedArtworks?.artworksArray])

  if (!currentArtwork) return null

  const isMobile = Boolean(size.width && size.width <= 768)
  const mediumLabel = resolveMediumLabel(currentArtwork)
  const seriesColor = getSeriesColor(resolveSeriesSlug(currentArtwork) ?? 'a-colorful-history')
  const series = resolveSeriesDisplay(currentArtwork, state.filterSeries)
  const sizeInput = getArtworkSizeInput(currentArtwork)
  const currentSlug = currentArtwork.slug?.trim() || null
  const isFlipped = Boolean(currentSlug && flippedSlug === currentSlug)
  const isTimelineCard = state.artworkViewTimeline && !state.showSlideshow

  const containerClass = [
    'artwork-title__container',
    !state.artworkViewTimeline && !state.showSlideshow
      ? 'artwork-title__container--hide'
      : state.showSlideshow
        ? 'artwork-title__container--slideshow'
        : isMobile
          ? 'artwork-title__container--mobile'
          : 'artwork-title__container--desktop',
    isTimelineCard && isFlipped ? 'artwork-title__container--faded' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const toggleCurrentFlip = () => {
    if (!isTimelineCard || !currentSlug) return
    setFlippedSlug(isFlipped ? null : currentSlug)
  }

  return (
    <div
      className={containerClass}
      onClick={isTimelineCard && isMobile ? toggleCurrentFlip : undefined}
      onKeyDown={
        isTimelineCard && isMobile
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                toggleCurrentFlip()
              }
            }
          : undefined
      }
      role={isTimelineCard && isMobile ? 'button' : undefined}
      tabIndex={isTimelineCard && isMobile ? 0 : undefined}
      aria-pressed={isTimelineCard && isMobile ? isFlipped : undefined}
    >
      {isTimelineCard && isFlipped ? (
        <button
          type="button"
          className="artwork-title__front-affordance"
          onClick={(event) => {
            event.stopPropagation()
            setFlippedSlug(null)
          }}
        >
          front
        </button>
      ) : null}

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
          {series ? (
            <p className="artwork-title__series-name">{series.name}</p>
          ) : null}
          <div
            className="artwork-title__series-box"
            style={{ background: seriesColor }}
            aria-hidden
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
