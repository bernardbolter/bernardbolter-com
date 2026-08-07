'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type MouseEvent, type RefObject } from 'react'

import ArtworkImage from '@/components/artworks/ArtworkImage'
import { resolveSeriesSlug } from '@/helpers/artworkCatalog'
import { getSeriesColor } from '@/helpers/seriesColor'
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
  onLinkClick: (event: MouseEvent<HTMLAnchorElement>) => void
}

/**
 * SSR / pre-hydration: always render real title + thumbnail (crawler identity).
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
  onLinkClick,
}: TimelineArtworkSlotProps) {
  const slotRef = useRef<HTMLDivElement>(null)
  const [hasHydrated, setHasHydrated] = useState(false)
  /** Start true so SSR + hydration match (full content). */
  const [inView, setInView] = useState(true)
  const seriesColor = getSeriesColor(resolveSeriesSlug(artwork) ?? 'default')
  const title = artwork.title?.trim() || artwork.slug

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
        minWidth: `${artworkContainerWidth}px`,
        minHeight: `${artworkContainerHeight}px`,
      }}
    >
      <Link
        href={`/${artwork.slug}`}
        data-timeline-artwork-link
        className="relative flex h-full w-full cursor-pointer items-center justify-center"
        draggable={false}
        onDragStart={(event) => event.preventDefault()}
        onClick={onLinkClick}
      >
        {/* Identity text for crawlers / no-JS — must not depend on image mount. */}
        <span className="artwork-gateway-title">{title}</span>
        {showImage ? (
          <ArtworkImage
            artwork={artwork}
            artworkContainerWidth={artworkContainerWidth}
            artworkContainerHeight={artworkContainerHeight}
            imageContext="timeline"
            priority={index < TIMELINE_INITIAL_LOAD_COUNT}
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
        )}
      </Link>
    </div>
  )
}
