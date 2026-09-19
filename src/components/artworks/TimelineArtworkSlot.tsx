'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'

import ArtworkBlock from '@/components/artworks/ArtworkBlock'
import ArtworkImage from '@/components/artworks/ArtworkImage'
import { useHomepageFlip } from '@/components/artworks/homepageFlip'
import { resolveSeriesSlug } from '@/helpers/artworkCatalog'
import { getSeriesColor } from '@/helpers/seriesColor'
import { resolveCatalogueImageAlt } from '@/lib/artwork/catalogueIdentity'
import { useArtworks } from '@/providers/ArtworkProvider'
import type { TimelineArtwork } from '@/types/timlineTypes'

/** Eager image load for the first row — matches max column count on xl screens. */
const TIMELINE_INITIAL_LOAD_COUNT = 6

type TimelineArtworkSlotProps = {
  artwork: TimelineArtwork
  index: number
  scrollRootRef: RefObject<HTMLDivElement | null>
  artworkContainerWidth: number
  artworkContainerHeight: number
  marginRight: number
  marginBottom: number
  isLast: boolean
  isMobile: boolean
}

/**
 * Identity text is always in the HTML. Thumbnails are not: SSR and first paint
 * only include the first row, then IntersectionObserver loads the rest. Emitting
 * 220 `<img>` tags made Firefox stall (connection pile-up, aborted JPEGs).
 */
export default function TimelineArtworkSlot({
  artwork,
  index,
  scrollRootRef,
  artworkContainerWidth,
  artworkContainerHeight,
  marginRight,
  marginBottom,
  isLast,
  isMobile,
}: TimelineArtworkSlotProps) {
  const [state] = useArtworks()
  const { flippedSlug, setFlippedSlug } = useHomepageFlip()
  const slotRef = useRef<HTMLDivElement>(null)
  const [hasHydrated, setHasHydrated] = useState(false)
  const [inView, setInView] = useState(index < TIMELINE_INITIAL_LOAD_COUNT)
  const seriesColor = getSeriesColor(resolveSeriesSlug(artwork) ?? 'default')
  const slug = artwork.slug?.trim() || ''
  const flipped = Boolean(slug && flippedSlug === slug)

  useEffect(() => {
    setHasHydrated(true)
  }, [])

  useEffect(() => {
    if (!hasHydrated) return
    if (index < TIMELINE_INITIAL_LOAD_COUNT) return

    const slot = slotRef.current
    const root = scrollRootRef.current
    if (!slot || !root) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting)
      },
      { root, rootMargin: '400px' },
    )

    observer.observe(slot)
    return () => observer.disconnect()
  }, [hasHydrated, index, scrollRootRef])

  const showImage = index < TIMELINE_INITIAL_LOAD_COUNT || (hasHydrated && inView)

  return (
    <div
      ref={slotRef}
      className="artworks-timeline__artwork-inside"
      draggable={false}
      onDragStart={(event) => event.preventDefault()}
      style={{
        marginRight: !isMobile && !isLast ? `${marginRight}px` : '0px',
        marginBottom: isMobile && !isLast ? `${marginBottom}px` : '0px',
        width: `${artworkContainerWidth}px`,
        height: `${artworkContainerHeight}px`,
        minWidth: `${artworkContainerWidth}px`,
        minHeight: `${artworkContainerHeight}px`,
      }}
    >
      <ArtworkBlock
        artwork={artwork}
        filterSeries={state.filterSeries}
        timelineMarkers={state.timelineMarkers}
        sessionDates={state.sessionDatesByArtworkId[artwork.id] ?? []}
        flipped={flipped}
        onToggleFlip={() => setFlippedSlug(flipped ? null : slug)}
        allowFootprintBreak={isMobile}
        image={
          showImage ? (
            <ArtworkImage
              artwork={artwork}
              artworkContainerWidth={artworkContainerWidth}
              artworkContainerHeight={artworkContainerHeight}
              imageContext="timeline"
              priority={index < TIMELINE_INITIAL_LOAD_COUNT}
              alt={resolveCatalogueImageAlt(artwork)}
            />
          ) : (
            <div
              className="artwork-placeholder"
              aria-hidden
              style={{
                width: artworkContainerWidth,
                height: artworkContainerHeight,
                backgroundColor: seriesColor,
              }}
            />
          )
        }
      />
    </div>
  )
}
