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

import ArtworkImage from './ArtworkImage'

const DRAG_THRESHOLD_PX = 5
const WHEEL_SCROLL_SENSITIVITY = 0.85

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
            <div
              key={artwork.id}
              className="artworks-timeline__artwork-inside"
              draggable={false}
              onDragStart={(event) => event.preventDefault()}
              style={{
                marginRight:
                  !isMobile && index < timeline.artworksArray.length - 1
                    ? `${artwork.marginRight || 0}px`
                    : '0px',
                marginBottom:
                  isMobile && index < timeline.artworksArray.length - 1
                    ? `${artwork.marginBottom || 0}px`
                    : '0px',
                minWidth: `${state.artworkContainerWidth}px`,
                minHeight: `${state.artworkContainerHeight}px`,
              }}
            >
              <Link
                href={`/${artwork.slug}`}
                data-timeline-artwork-link
                className="flex h-full w-full cursor-pointer items-center justify-center"
                draggable={false}
                onDragStart={(event) => event.preventDefault()}
                onClick={handleArtworkLinkClick}
              >
                <ArtworkImage
                  artwork={artwork}
                  artworkContainerWidth={state.artworkContainerWidth}
                  artworkContainerHeight={state.artworkContainerHeight}
                  priority={index < 5}
                />
              </Link>
            </div>
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
