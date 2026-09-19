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
 * SSR / pre-hydration: always render real identity + thumbnail (crawler identity).
 * After hydration settles: IntersectionObserver may unmount off-screen images
 * to keep the live DOM lighter — without ever stubbing identity text.
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
  /** Start true so SSR + hydration match (full content). */
  const [inView, setInView] = useState(true)
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

  const showImage = !hasHydrated || inView || index < TIMELINE_INITIAL_LOAD_COUNT

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
