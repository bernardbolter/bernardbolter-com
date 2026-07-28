'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'

import { LeftArrowSvg, RightArrowSvg } from '@/components/icons'
import { generateSmallLines } from '@/helpers/timeline'
import { useArtworks } from '@/providers/ArtworkProvider'

import TimelineArtworkSlot from './TimelineArtworkSlot'

const DRAG_THRESHOLD_PX = 5
const WHEEL_SCROLL_SENSITIVITY = 0.85
const TIMELINE_AXIS_OFFSET = 24
const BIO_TRACK_OFFSET = 16
const HISTORICAL_TRACK_OFFSET = -16
const MOBILE_BIO_TRACK_OFFSET = 16
const MOBILE_HISTORICAL_TRACK_OFFSET = -12

type AnchorPoint = { x: number; y: number }

function buildArtworkAnchorMap(args: {
  isMobile: boolean
  sideWidth: number
  artworkContainerWidth: number
  artworkContainerHeight: number
  artworksArray: Array<{ id: number; marginRight: number; marginBottom: number }>
}): Map<number, AnchorPoint> {
  const { isMobile, sideWidth, artworkContainerWidth, artworkContainerHeight, artworksArray } = args
  const anchors = new Map<number, AnchorPoint>()

  if (isMobile) {
    let currentY = 0
    artworksArray.forEach((artwork) => {
      const y = currentY + artworkContainerHeight / 2
      anchors.set(artwork.id, { x: TIMELINE_AXIS_OFFSET, y })
      currentY += artworkContainerHeight + artwork.marginBottom
    })
    return anchors
  }

  let currentX = sideWidth
  artworksArray.forEach((artwork) => {
    const x = currentX + artworkContainerWidth / 2
    anchors.set(artwork.id, { x, y: TIMELINE_AXIS_OFFSET })
    currentX += artworkContainerWidth + artwork.marginRight
  })
  return anchors
}

export default function Timeline() {
  const router = useRouter()
  const [state, setState] = useArtworks()
  const timelineRef = useRef<HTMLDivElement>(null)
  const isProgramScroll = useRef(false)
  const pointerActive = useRef(false)
  const didDragCanvas = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 })
  const stateRef = useRef(state)
  const [isGrabbing, setIsGrabbing] = useState(false)

  const viewportWidth = state.viewportWidth || 0
  const viewportHeight = state.viewportHeight || 0
  const isMobile = viewportWidth <= 767
  const timeline = state.formattedArtworks

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const scrollToIndex = useCallback(
    (index: number) => {
      if (!timelineRef.current || !timeline || index < 0 || index >= timeline.artworksArray.length) {
        return
      }

      isProgramScroll.current = true

      if (index !== stateRef.current.currentArtworkIndex) {
        setState((prev) => ({ ...prev, currentArtworkIndex: index }))
      }

      const scrollPosition = isMobile
        ? timeline.artworksArray[index].verticalScrollPoint
        : timeline.artworksArray[index].horizontalScrollPoint

      if (isMobile) {
        timelineRef.current.scrollTo({ top: scrollPosition, behavior: 'smooth' })
      } else {
        timelineRef.current.scrollTo({ left: scrollPosition, behavior: 'smooth' })
      }

      window.setTimeout(() => {
        isProgramScroll.current = false
      }, 500)
    },
    [isMobile, setState, timeline],
  )

  useEffect(() => {
    if (!timeline || state.savedTimelineIndex <= 0) return
    setState((prev) => ({
      ...prev,
      currentArtworkIndex: prev.savedTimelineIndex,
      isTimelineScrollingProgamatically: true,
    }))
  }, [setState, state.savedTimelineIndex, timeline])

  useEffect(() => {
    if (!state.isTimelineScrollingProgamatically) return
    scrollToIndex(state.currentArtworkIndex)
    window.setTimeout(() => {
      setState((prev) => ({ ...prev, isTimelineScrollingProgamatically: false }))
    }, 500)
  }, [scrollToIndex, setState, state.currentArtworkIndex, state.isTimelineScrollingProgamatically])

  const handleArtScroll = useCallback(() => {
    const currentState = stateRef.current
    if (
      isProgramScroll.current ||
      currentState.isTimelineScrollingProgamatically ||
      !currentState.formattedArtworks ||
      !timelineRef.current
    ) {
      return
    }

    const mobile = (currentState.viewportWidth || 0) <= 767
    const currentScrollPosition = mobile
      ? timelineRef.current.scrollTop
      : timelineRef.current.scrollLeft
    const viewportDimension = mobile
      ? currentState.viewportHeight || 0
      : currentState.viewportWidth || 0
    const artworkDimension = mobile
      ? currentState.artworkContainerHeight
      : currentState.artworkContainerWidth
    const sideOffset = mobile ? 0 : currentState.artworkDesktopSideWidth

    const viewportCenterAbsolute = currentScrollPosition + viewportDimension / 2

    let bestIndex = 0
    let minDistance = Infinity
    let accumulatedDimension = sideOffset

    currentState.formattedArtworks.artworksArray.forEach((artwork, index) => {
      const artworkCenter = accumulatedDimension + artworkDimension / 2
      const distance = Math.abs(artworkCenter - viewportCenterAbsolute)

      if (distance < minDistance) {
        minDistance = distance
        bestIndex = index
      }

      accumulatedDimension += artworkDimension
      if (index < currentState.formattedArtworks!.artworksArray.length - 1) {
        accumulatedDimension += mobile ? artwork.marginBottom : artwork.marginRight
      }
    })

    if (bestIndex !== currentState.currentArtworkIndex) {
      setState((prev) => ({ ...prev, currentArtworkIndex: bestIndex }))
    }
  }, [setState])

  useEffect(() => {
    const element = timelineRef.current
    if (!element || !timeline) return

    element.addEventListener('scroll', handleArtScroll)
    return () => element.removeEventListener('scroll', handleArtScroll)
  }, [handleArtScroll, timeline])

  const beginPointerTracking = useCallback((clientX: number, clientY: number) => {
    if (!timelineRef.current) return

    pointerActive.current = true
    didDragCanvas.current = false
    dragStart.current = {
      x: clientX,
      y: clientY,
      scrollLeft: timelineRef.current.scrollLeft,
      scrollTop: timelineRef.current.scrollTop,
    }
  }, [])

  const movePointerTracking = useCallback((clientX: number, clientY: number) => {
    if (!pointerActive.current || !timelineRef.current) return

    const mobile = (stateRef.current.viewportWidth || 0) <= 767
    const deltaX = clientX - dragStart.current.x
    const deltaY = clientY - dragStart.current.y

    if (Math.abs(deltaX) <= DRAG_THRESHOLD_PX && Math.abs(deltaY) <= DRAG_THRESHOLD_PX) {
      return
    }

    didDragCanvas.current = true
    setIsGrabbing(true)

    if (mobile) {
      timelineRef.current.scrollTop = dragStart.current.scrollTop + (dragStart.current.y - clientY)
    } else {
      timelineRef.current.scrollLeft =
        dragStart.current.scrollLeft + (dragStart.current.x - clientX)
    }
  }, [])

  const endPointerTracking = useCallback(() => {
    pointerActive.current = false
    setIsGrabbing(false)
  }, [])

  const handleCanvasPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return
      beginPointerTracking(event.clientX, event.clientY)

      const pointerId = event.pointerId

      const onMove = (moveEvent: globalThis.PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) return
        movePointerTracking(moveEvent.clientX, moveEvent.clientY)
      }

      const onEnd = (endEvent: globalThis.PointerEvent) => {
        if (endEvent.pointerId !== pointerId) return

        const wasDrag = didDragCanvas.current
        endPointerTracking()

        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onEnd)
        document.removeEventListener('pointercancel', onEnd)

        if (!wasDrag) {
          const link = (endEvent.target as HTMLElement).closest('a[data-timeline-artwork-link]')
          const href = link?.getAttribute('href')
          if (href) {
            router.push(href)
          }
        }

        window.setTimeout(() => {
          didDragCanvas.current = false
        }, 0)
      }

      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onEnd)
      document.addEventListener('pointercancel', onEnd)
    },
    [beginPointerTracking, endPointerTracking, movePointerTracking, router],
  )

  const handleArtworkLinkClick = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    // Navigation is handled on pointerup so drag vs tap is reliable.
    event.preventDefault()
  }, [])

  useEffect(() => {
    const element = timelineRef.current
    if (!element) return

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const mobile = (stateRef.current.viewportWidth || 0) <= 767
      const delta = event.deltaX || event.deltaY
      if (mobile) {
        element.scrollTop += delta * WHEEL_SCROLL_SENSITIVITY
      } else {
        element.scrollLeft += delta * WHEEL_SCROLL_SENSITIVITY
      }
    }

    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [timeline])

  const smallLines = useMemo(() => {
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
  }, [
    isMobile,
    state.artworkContainerHeight,
    state.artworkContainerWidth,
    state.artworkDesktopSideWidth,
    timeline,
  ])

  if (!timeline || timeline.artworksArray.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center font-heading text-sm text-secondary">
        No artworks to display
      </div>
    )
  }

  const scrollPrevious = () => {
    if (isProgramScroll.current) return
    const prevIndex =
      state.currentArtworkIndex > 0
        ? state.currentArtworkIndex - 1
        : timeline.artworksArray.length - 1
    scrollToIndex(prevIndex)
  }

  const scrollNext = () => {
    if (isProgramScroll.current) return
    const nextIndex =
      state.currentArtworkIndex < timeline.artworksArray.length - 1
        ? state.currentArtworkIndex + 1
        : 0
    scrollToIndex(nextIndex)
  }

  const halfWidth = state.artworkContainerWidth / 2
  const halfHeight = state.artworkContainerHeight / 2
  const sideWidth = state.artworkDesktopSideWidth
  const timelineMarkers = state.timelineMarkers

  const yearAnchorByYear = useMemo(() => {
    const map = new Map<number, number>()
    timeline.timepointsArray.forEach((timepoint) => {
      if (!map.has(timepoint.year)) {
        map.set(timepoint.year, timepoint.distanceFromStart)
      }
    })
    return map
  }, [timeline.timepointsArray])

  const artworkAnchors = useMemo(
    () =>
      buildArtworkAnchorMap({
        isMobile,
        sideWidth,
        artworkContainerWidth: state.artworkContainerWidth,
        artworkContainerHeight: state.artworkContainerHeight,
        artworksArray: timeline.artworksArray.map((artwork) => ({
          id: artwork.id,
          marginRight: artwork.marginRight,
          marginBottom: artwork.marginBottom,
        })),
      }),
    [isMobile, sideWidth, state.artworkContainerWidth, state.artworkContainerHeight, timeline.artworksArray],
  )

  const bioMarkerLayout = useMemo(() => {
    return timelineMarkers.bioEntries
      .map((entry) => {
        const linkedAnchor = entry.linkedArtworkIds
          .map((artworkId) => artworkAnchors.get(artworkId))
          .find(Boolean)
        const yearDistance =
          entry.year !== null && yearAnchorByYear.has(entry.year) ? yearAnchorByYear.get(entry.year)! : null

        if (!linkedAnchor && yearDistance === null) return null

        if (isMobile) {
          const y = linkedAnchor?.y ?? halfHeight + (yearDistance ?? 0)
          return {
            id: entry.id,
            href: entry.permalinkHref,
            title: entry.text,
            x: TIMELINE_AXIS_OFFSET + MOBILE_BIO_TRACK_OFFSET,
            y,
          }
        }

        const x = linkedAnchor?.x ?? sideWidth + (yearDistance ?? 0)
        return {
          id: entry.id,
          href: entry.permalinkHref,
          title: entry.text,
          x,
          y: TIMELINE_AXIS_OFFSET + BIO_TRACK_OFFSET,
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
  }, [artworkAnchors, halfHeight, isMobile, sideWidth, timelineMarkers.bioEntries, yearAnchorByYear])

  const historicalMarkerLayout = useMemo(() => {
    return timelineMarkers.historicalReadings
      .map((entry) => {
        if (entry.year === null) return null
        const yearDistance = yearAnchorByYear.get(entry.year)
        if (typeof yearDistance !== 'number') return null

        if (isMobile) {
          return {
            id: entry.id,
            href: entry.href,
            title: `${entry.type} reading`,
            x: TIMELINE_AXIS_OFFSET + MOBILE_HISTORICAL_TRACK_OFFSET,
            y: halfHeight + yearDistance,
            type: entry.type,
          }
        }

        return {
          id: entry.id,
          href: entry.href,
          title: `${entry.type} reading`,
          x: sideWidth + yearDistance,
          y: TIMELINE_AXIS_OFFSET + HISTORICAL_TRACK_OFFSET,
          type: entry.type,
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
  }, [halfHeight, isMobile, sideWidth, timelineMarkers.historicalReadings, yearAnchorByYear])

  const throughlineSegments = useMemo(() => {
    return timelineMarkers.throughlines
      .map((throughline) => {
        const linkedPoints = throughline.linkedArtworkIds
          .map((artworkId) => artworkAnchors.get(artworkId))
          .filter((point): point is AnchorPoint => Boolean(point))
        if (linkedPoints.length !== 2) return null
        const [start, end] = linkedPoints

        if (isMobile) {
          const x = TIMELINE_AXIS_OFFSET + MOBILE_BIO_TRACK_OFFSET
          return {
            id: throughline.id,
            href: throughline.permalinkHref,
            title: throughline.text,
            x1: x,
            y1: start.y,
            x2: x,
            y2: end.y,
            endpointX: x,
          }
        }

        const y = TIMELINE_AXIS_OFFSET + BIO_TRACK_OFFSET
        return {
          id: throughline.id,
          href: throughline.permalinkHref,
          title: throughline.text,
          x1: start.x,
          y1: y,
          x2: end.x,
          y2: y,
          endpointY: y,
        }
      })
      .filter((segment): segment is NonNullable<typeof segment> => segment !== null)
  }, [artworkAnchors, isMobile, timelineMarkers.throughlines])

  return (
    <div className="artworks-timeline__container">
      <div
        ref={timelineRef}
        className={`artworks-timeline__artworks-container${
          isGrabbing ? ' artworks-timeline__artworks-container--dragging' : ''
        }`}
        style={{
          width: '100%',
          height: !isMobile && viewportHeight ? `${viewportHeight}px` : '100vh',
          paddingTop: isMobile ? (viewportHeight - state.artworkContainerHeight) / 2 : 0,
        }}
        onPointerDown={handleCanvasPointerDown}
      >
        <div
          className="artworks-timeline__artworks"
          style={{
            width: !isMobile ? `${timeline.totalTimelineWidth}px` : 'auto',
            height: isMobile ? `${timeline.totalTimelineHeight}px` : 'auto',
            paddingLeft: !isMobile ? `${sideWidth}px` : '0px',
            paddingRight: !isMobile ? `${sideWidth}px` : '0px',
          }}
        >
          {timeline.artworksArray.map((artwork, index) => (
            <TimelineArtworkSlot
              key={artwork.id}
              artwork={artwork}
              index={index}
              scrollRootRef={timelineRef}
              artworkContainerWidth={state.artworkContainerWidth}
              artworkContainerHeight={state.artworkContainerHeight}
              marginRight={artwork.marginRight || 0}
              marginBottom={artwork.marginBottom || 0}
              isLast={index === timeline.artworksArray.length - 1}
              isMobile={isMobile}
              onLinkClick={handleArtworkLinkClick}
            />
          ))}
        </div>
        <div
          className="artworks-timeline__marker-layer"
          aria-hidden={false}
          style={{
            width: !isMobile ? `${timeline.totalTimelineWidth}px` : '64px',
            height: isMobile ? `${timeline.totalTimelineHeight}px` : '84px',
          }}
        >
          <svg
            className="artworks-timeline__throughline-svg"
            width={!isMobile ? timeline.totalTimelineWidth : 64}
            height={isMobile ? timeline.totalTimelineHeight : 84}
            viewBox={`0 0 ${!isMobile ? timeline.totalTimelineWidth : 64} ${
              isMobile ? timeline.totalTimelineHeight : 84
            }`}
            role="presentation"
          >
            {throughlineSegments.map((segment) => (
              <g key={segment.id} className="artworks-timeline__throughline-segment">
                <line x1={segment.x1} y1={segment.y1} x2={segment.x2} y2={segment.y2} />
                <circle cx={segment.x1} cy={segment.y1} r="2.25" />
                <circle cx={segment.x2} cy={segment.y2} r="2.25" />
              </g>
            ))}
          </svg>

          {bioMarkerLayout.map((marker) =>
            marker.href ? (
              <Link
                key={marker.id}
                href={marker.href}
                className="artworks-timeline__marker artworks-timeline__marker--bio"
                style={{ left: `${marker.x}px`, top: `${marker.y}px` }}
                aria-label={marker.title}
                title={marker.title}
              />
            ) : (
              <span
                key={marker.id}
                className="artworks-timeline__marker artworks-timeline__marker--bio"
                style={{ left: `${marker.x}px`, top: `${marker.y}px` }}
                aria-hidden
              />
            ),
          )}

          {historicalMarkerLayout.map((marker) => (
            <Link
              key={marker.id}
              href={marker.href}
              className={`artworks-timeline__marker artworks-timeline__marker--historical artworks-timeline__marker--historical-${marker.type}`}
              style={{ left: `${marker.x}px`, top: `${marker.y}px` }}
              aria-label={marker.title}
              title={marker.title}
            />
          ))}
        </div>

        <div
          className="artworks-timeline__timeline-container"
          role="presentation"
          aria-hidden="true"
          style={{
            width: !isMobile
              ? `${timeline.totalTimelineWidth - sideWidth * 2}px`
              : '50px',
            height: isMobile ? `${timeline.totalTimelineHeight}px` : '50px',
            marginLeft: !isMobile ? `${sideWidth}px` : '0px',
            marginRight: !isMobile ? `${sideWidth}px` : '0px',
          }}
        >
          <div
            className="artworks-timeline__line"
            style={{
              width: !isMobile
                ? `${timeline.totalTimelineWidth - state.artworkContainerWidth - sideWidth * 2}px`
                : '1px',
              height: !isMobile
                ? '1px'
                : `${timeline.totalTimelineHeight - state.artworkContainerHeight}px`,
              left: !isMobile ? `${halfWidth}px` : '24px',
              top: !isMobile ? '24px' : `${halfHeight}px`,
            }}
          />
          <div
            className="artworks-timeline__small-lines"
            style={{
              marginLeft: !isMobile ? `${halfWidth}px` : '0px',
              marginTop: !isMobile ? '0px' : `${halfHeight}px`,
            }}
          >
            {smallLines}
          </div>
          <div
            className="artworks-timeline__year-markers"
            style={{
              left: !isMobile ? `-${halfWidth}px` : '0px',
              top: !isMobile ? '0px' : `-${halfHeight}px`,
            }}
          >
            {timeline.timepointsArray.map((yearMarker) => (
              <div
                key={yearMarker.id}
                className="artworks-timeline__year-marker"
                style={{
                  left: !isMobile ? `${halfWidth + yearMarker.distanceFromStart}px` : '0px',
                  top: isMobile ? `${halfHeight + yearMarker.distanceFromStart}px` : '0px',
                }}
              >
                <div className="artworks-timeline__year-tick" />
                {yearMarker.isVisible ? (
                  <span className="artworks-timeline__year-label">{yearMarker.year}</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      {!isMobile ? (
        <div className="artworks-timeline__controls-container">
          <div className="artworks-timeline__control" onClick={scrollPrevious} role="button" tabIndex={0}>
            <LeftArrowSvg isRight={false} />
          </div>
          <div className="artworks-timeline__control" onClick={scrollNext} role="button" tabIndex={0}>
            <RightArrowSvg />
          </div>
        </div>
      ) : null}
    </div>
  )
}
