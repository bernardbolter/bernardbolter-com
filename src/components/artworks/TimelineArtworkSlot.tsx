'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type MouseEvent, type RefObject } from 'react'

import ArtworkImage from '@/components/artworks/ArtworkImage'
import { resolveSeriesSlug } from '@/helpers/artworkCatalog'
import { getSeriesColor } from '@/helpers/seriesColor'
import type { TimelineArtwork } from '@/types/timlineTypes'

/** Preload the first row — matches max column count on xl screens. */
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
  const [loadImage, setLoadImage] = useState(index < TIMELINE_INITIAL_LOAD_COUNT)
  const seriesColor = getSeriesColor(resolveSeriesSlug(artwork) ?? 'default')

  useEffect(() => {
    if (loadImage) return

    const slot = slotRef.current
    const root = scrollRootRef.current
    if (!slot || !root) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoadImage(true)
          observer.disconnect()
        }
      },
      { root, rootMargin: '400px' },
    )

    observer.observe(slot)
    return () => observer.disconnect()
  }, [loadImage, scrollRootRef])

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
        className="flex h-full w-full cursor-pointer items-center justify-center"
        draggable={false}
        onDragStart={(event) => event.preventDefault()}
        onClick={onLinkClick}
      >
        {loadImage ? (
          <ArtworkImage
            artwork={artwork}
            artworkContainerWidth={artworkContainerWidth}
            artworkContainerHeight={artworkContainerHeight}
            imageContext="grid"
            priority={index < TIMELINE_INITIAL_LOAD_COUNT}
          />
        ) : (
          <div
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
