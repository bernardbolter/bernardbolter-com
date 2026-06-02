'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useArtworks } from '@/providers/ArtworkProvider'
import { generateTimeline, generateSmallLines } from '@/helpers/timeline'
import type { SortingType, TimelineResult } from '@/types/timlineTypes'
import type { Artwork } from '@/payload-types'
import ArtworkImage from './ArtworkImage'

type ArtworkWithImage = Artwork & {
  primaryImage?: ({ url?: string | null } & Partial<Artwork['primaryImage']>) | null
}

export default function Timeline() {
  const [state] = useArtworks()
  const artworks = state.filtered as ArtworkWithImage[]
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({
    viewportWidth: 0,
    viewportHeight: 0,
    containerWidth: 300,
    containerHeight: 300,
    sideWidth: 0,
  })

  // Track scroll position
  const [scrollX, setScrollX] = useState(0)

  // Calculate dimensions based on viewport
  useEffect(() => {
    const updateDimensions = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight

      let containerW: number
      let containerH: number
      let sideW: number

      if (vw > 767) {
        // Desktop: square container centered with side gaps
        containerH = Math.min(vh - 120, vw - 100)
        containerW = containerH
        sideW = (vw - containerW) / 2
      } else {
        // Mobile: full width
        containerW = vw - 40
        containerH = containerW
        sideW = 20
      }

      setDimensions({
        viewportWidth: vw,
        viewportHeight: vh,
        containerWidth: containerW,
        containerHeight: containerH,
        sideWidth: sideW,
      })
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Generate timeline data
  const timeline: TimelineResult = useMemo(() => {
    if (artworks.length === 0 || dimensions.viewportWidth === 0) {
      return {
        artworksArray: [],
        timepointsArray: [],
        totalTimelineWidth: 0,
        totalTimelineHeight: 0,
        timeSpanInfo: null,
      }
    }

    return generateTimeline({
      artworks,
      sorting: (state.sorting as SortingType) || 'latest',
      artworkContainerWidth: dimensions.containerWidth,
      artworkContainerHeight: dimensions.containerHeight,
      desktopSideWidth: dimensions.sideWidth,
      viewportWidth: dimensions.viewportWidth,
      viewportHeight: dimensions.viewportHeight,
    })
  }, [artworks, state.sorting, dimensions])

  // Handle scroll
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      setScrollX(container.scrollLeft)
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // Generate tick marks
  const tickMarks = useMemo(() => {
    if (timeline.totalTimelineWidth === 0) return null

    return generateSmallLines({
      isMobile: dimensions.viewportWidth <= 767,
      totalTimelineHeight: timeline.totalTimelineHeight,
      totalTimelineWidth: timeline.totalTimelineWidth,
      artworkContainerHeight: dimensions.containerHeight,
      artworkContainerWidth: dimensions.containerWidth,
      artworkDesktopSideWidth: dimensions.sideWidth,
      targetSpacing: 20,
    })
  }, [timeline, dimensions])

  if (artworks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        No artworks to display
      </div>
    )
  }

  const isMobile = dimensions.viewportWidth <= 767

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Timeline container */}
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-x-auto overflow-y-hidden scrollbar-hide"
        style={{
          scrollBehavior: 'smooth',
        }}
      >
        {/* Timeline track */}
        <div
          className="relative h-full"
          style={{
            width: isMobile ? dimensions.viewportWidth : timeline.totalTimelineWidth,
            minWidth: isMobile ? dimensions.viewportWidth : timeline.totalTimelineWidth,
          }}
        >
          {/* Side padding on desktop */}
          {!isMobile && (
            <div className="absolute left-0 top-0 h-full" style={{ width: dimensions.sideWidth }} />
          )}

          {/* Tick marks */}
          <div
            className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              left: isMobile ? 0 : dimensions.sideWidth,
              width: isMobile
                ? dimensions.viewportWidth
                : timeline.totalTimelineWidth - dimensions.sideWidth * 2,
            }}
          >
            {tickMarks}
          </div>

          {/* Year markers */}
          {timeline.timepointsArray
            .filter((tp) => tp.isVisible)
            .map((timepoint) => (
              <div
                key={timepoint.id}
                className="absolute top-4 text-xs font-mono text-gray-400 pointer-events-none"
                style={{
                  left: isMobile
                    ? timepoint.distanceFromStart
                    : dimensions.sideWidth + timepoint.distanceFromStart,
                }}
              >
                {timepoint.year}
              </div>
            ))}

          {/* Artworks */}
          {timeline.artworksArray.map((artwork, index) => {
            return (
              <div
                key={artwork.id}
                className="absolute top-1/2 -translate-y-1/2"
                style={{
                  left: isMobile
                    ? artwork.horizontalScrollPoint
                    : dimensions.sideWidth + artwork.horizontalScrollPoint,
                  width: dimensions.containerWidth,
                  height: dimensions.containerHeight,
                }}
              >
                <div className="relative h-full w-full overflow-hidden rounded-[0.5rem] bg-surface-panel-light shadow-sm">
                  <div className="flex h-full w-full items-center justify-center">
                    <ArtworkImage
                      artwork={artwork}
                      artworkContainerWidth={dimensions.containerWidth}
                      artworkContainerHeight={dimensions.containerHeight}
                      priority={index < 5}
                    />
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-dark/70 to-transparent px-space-3 py-space-3">
                    <h3 className="truncate font-heading text-base text-surface-page">
                      {artwork.title}
                    </h3>
                    <p className="font-heading text-sm text-surface-page/80">
                      {artwork.yearCreated ?? '—'}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="absolute left-space-2 top-space-2 z-overlay rounded bg-surface-nav/80 px-space-2 py-space-1 font-heading text-xs text-secondary">
        <p>Artworks: {timeline.artworksArray.length}</p>
        <p>Width: {Math.round(timeline.totalTimelineWidth)}px</p>
        <p>Scroll: {Math.round(scrollX)}px</p>
      </div>
    </div>
  )
}
