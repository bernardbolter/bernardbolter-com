'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import { useArtworks } from '@/providers/ArtworkProvider'
import { generateSmallLines } from '@/helpers/timeline'
import { LeftArrowSvg, RightArrowSvg } from '@/components/icons'
import ArtworkImage from './ArtworkImage'

export default function Timeline() {
  const [state, setState] = useArtworks()
  const timelineRef = useRef<HTMLDivElement>(null)
  const isProgramScroll = useRef(false)
  const isMobile = (state.viewportWidth || 0) <= 767
  const timeline = state.formattedArtworks

  const scrollToIndex = useCallback(
    (index: number) => {
      if (!timelineRef.current || !timeline || index < 0 || index >= timeline.artworksArray.length) return

      const targetArtwork = timeline.artworksArray[index]
      const scrollPosition = isMobile
        ? targetArtwork.verticalScrollPoint
        : targetArtwork.horizontalScrollPoint

      isProgramScroll.current = true
      setState((prev) => ({ ...prev, currentArtworkIndex: index }))

      if (isMobile) {
        timelineRef.current.scrollTo({ top: scrollPosition, behavior: 'smooth' })
      } else {
        timelineRef.current.scrollTo({ left: scrollPosition, behavior: 'smooth' })
      }

      window.setTimeout(() => {
        isProgramScroll.current = false
        setState((prev) => ({ ...prev, isTimelineScrollingProgamatically: false }))
      }, 500)
    },
    [isMobile, setState, timeline],
  )

  useEffect(() => {
    if (!timeline || state.savedTimelineIndex <= 0) return
    scrollToIndex(state.savedTimelineIndex)
  }, [scrollToIndex, state.savedTimelineIndex, timeline])

  useEffect(() => {
    if (!state.isTimelineScrollingProgamatically) return
    scrollToIndex(state.currentArtworkIndex)
  }, [scrollToIndex, state.currentArtworkIndex, state.isTimelineScrollingProgamatically])

  useEffect(() => {
    const element = timelineRef.current
    if (!element || !timeline) return

    const handleArtScroll = () => {
      if (isProgramScroll.current || state.isTimelineScrollingProgamatically) return

      const scrollPosition = isMobile ? element.scrollTop : element.scrollLeft
      const currentIndex = timeline.artworksArray.reduce(
        (bestIndex, artwork, index) => {
          const target = isMobile ? artwork.verticalScrollPoint : artwork.horizontalScrollPoint
          const bestTarget = isMobile
            ? timeline.artworksArray[bestIndex].verticalScrollPoint
            : timeline.artworksArray[bestIndex].horizontalScrollPoint

          return Math.abs(target - scrollPosition) < Math.abs(bestTarget - scrollPosition)
            ? index
            : bestIndex
        },
        0,
      )

      if (currentIndex !== state.currentArtworkIndex) {
        setState((prev) => ({ ...prev, currentArtworkIndex: currentIndex }))
      }
    }

    element.addEventListener('scroll', handleArtScroll)
    return () => element.removeEventListener('scroll', handleArtScroll)
  }, [isMobile, setState, state.currentArtworkIndex, state.isTimelineScrollingProgamatically, timeline])

  const tickMarks = useMemo(() => {
    if (!timeline) return null

    return generateSmallLines({
      isMobile,
      totalTimelineHeight: timeline.totalTimelineHeight,
      totalTimelineWidth: timeline.totalTimelineWidth,
      artworkContainerHeight: state.artworkContainerHeight,
      artworkContainerWidth: state.artworkContainerWidth,
      artworkDesktopSideWidth: state.artworkDesktopSideWidth,
      targetSpacing: 20,
    })
  }, [isMobile, state.artworkContainerHeight, state.artworkContainerWidth, state.artworkDesktopSideWidth, timeline])

  if (!timeline || timeline.artworksArray.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center font-heading text-sm text-secondary">
        No artworks to display
      </div>
    )
  }

  const goPrevious = () => {
    if (isProgramScroll.current) return
    const nextIndex =
      state.currentArtworkIndex > 0
        ? state.currentArtworkIndex - 1
        : timeline.artworksArray.length - 1
    scrollToIndex(nextIndex)
  }

  const goNext = () => {
    if (isProgramScroll.current) return
    const nextIndex =
      state.currentArtworkIndex < timeline.artworksArray.length - 1
        ? state.currentArtworkIndex + 1
        : 0
    scrollToIndex(nextIndex)
  }

  return (
    <div className="relative h-screen w-full">
      <div
        ref={timelineRef}
        className={`absolute inset-0 scrollbar-hide ${isMobile ? 'overflow-y-scroll overflow-x-hidden' : 'overflow-x-scroll overflow-y-hidden'}`}
      >
        <div
          className={`relative ${isMobile ? 'h-auto w-full' : 'h-full'}`}
          style={{
            width: isMobile ? '100%' : timeline.totalTimelineWidth,
            height: isMobile ? timeline.totalTimelineHeight : '100%',
            paddingLeft: isMobile ? 0 : state.artworkDesktopSideWidth,
            paddingRight: isMobile ? 0 : state.artworkDesktopSideWidth,
            paddingTop: isMobile
              ? Math.max(0, ((state.viewportHeight || 0) - state.artworkContainerHeight) / 2)
              : 0,
          }}
        >
          <div
            className="pointer-events-none absolute"
            style={{
              left: isMobile ? 0 : state.artworkContainerWidth / 2,
              top: isMobile ? state.artworkContainerHeight / 2 : state.artworkContainerHeight / 2,
              width: isMobile
                ? 50
                : timeline.totalTimelineWidth - state.artworkContainerWidth - state.artworkDesktopSideWidth * 2,
              height: isMobile
                ? timeline.totalTimelineHeight - state.artworkContainerHeight
                : 50,
            }}
          >
            {tickMarks}
          </div>

          {timeline.timepointsArray.map((timepoint) => (
            <div
              key={timepoint.id}
              className="pointer-events-none absolute"
              style={{
                left: isMobile ? 0 : state.artworkContainerWidth / 2 + timepoint.distanceFromStart,
                top: isMobile ? state.artworkContainerHeight / 2 + timepoint.distanceFromStart : 0,
              }}
            >
              <div className={`absolute bg-ui-line ${isMobile ? 'h-px w-[0.5rem] left-[1.25rem] top-0' : 'h-[0.5rem] w-px top-[1.25rem]'}`} />
              {timepoint.isVisible && (
                <span className={`absolute font-heading text-xs text-secondary ${isMobile ? 'left-space-1 top-[-0.4rem]' : 'top-space-1 left-[-0.4rem]'}`}>
                  {timepoint.year}
                </span>
              )}
            </div>
          ))}

          {timeline.artworksArray.map((artwork, index) => {
            return (
              <div
                key={artwork.id}
                className="absolute"
                style={{
                  left: isMobile ? 0 : artwork.horizontalScrollPoint,
                  top: isMobile ? artwork.verticalScrollPoint : '50%',
                  transform: isMobile ? 'none' : 'translateY(-50%)',
                  width: state.artworkContainerWidth,
                  height: state.artworkContainerHeight,
                  marginRight:
                    !isMobile && index < timeline.artworksArray.length - 1
                      ? artwork.marginRight
                      : 0,
                  marginBottom:
                    isMobile && index < timeline.artworksArray.length - 1
                      ? artwork.marginBottom
                      : 0,
                }}
              >
                <div className="relative h-full w-full overflow-hidden rounded-[0.5rem] bg-surface-panel-light shadow-sm">
                  <Link href={`/${artwork.slug}`} className="flex h-full w-full items-center justify-center">
                    <ArtworkImage
                      artwork={artwork}
                      artworkContainerWidth={state.artworkContainerWidth}
                      artworkContainerHeight={state.artworkContainerHeight}
                      priority={index < 5}
                    />
                  </Link>

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

      {!isMobile && (
        <div className="fixed bottom-space-4 right-space-2 z-ui-top flex gap-space-2">
          <button className="h-[2.125rem] w-[2.0625rem] border border-ui-line bg-surface-nav p-space-1" onClick={goPrevious}>
            <LeftArrowSvg />
          </button>
          <button className="h-[2.125rem] w-[2.0625rem] border border-ui-line bg-surface-nav p-space-1" onClick={goNext}>
            <RightArrowSvg />
          </button>
        </div>
      )}
    </div>
  )
}
