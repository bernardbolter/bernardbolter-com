'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactPlayer from 'react-player'

import ArtworkImage from './ArtworkImage'
import { useArtworks } from '@/providers/ArtworkProvider'
import type { Artwork, Media } from '@/payload-types'

interface ArtworksSlideshowProps {
  autoPlayInterval?: number
}

function readMediaUrl(media: number | Media | null | undefined): string | null {
  if (!media || typeof media !== 'object') return null
  return media.url ?? null
}

function getPrimaryVideoSource(artwork: Artwork): string | null {
  const directFile = readMediaUrl(artwork.videoFile)
  if (directFile) return directFile
  if (artwork.videoUrl) return artwork.videoUrl

  const clips = artwork.videos ?? []
  const preferred = clips.find((clip) => clip.videoRole === 'primary') ?? clips[0]
  if (!preferred) return null
  return readMediaUrl(preferred.videoFile) ?? preferred.videoUrl ?? null
}

export default function ArtworksSlideshow({ autoPlayInterval = 5000 }: ArtworksSlideshowProps) {
  const [state, setState] = useArtworks()
  const [loadedIndex, setLoadedIndex] = useState(-1)

  const animationRef = useRef<number | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startTimeRef = useRef<number>(0)
  const pausedProgressRef = useRef<number>(0)
  const indexRef = useRef<number>(state.currentArtworkIndex)

  useEffect(() => {
    indexRef.current = state.currentArtworkIndex
  }, [state.currentArtworkIndex])

  const currentArtwork = state.filtered[state.currentArtworkIndex] ?? null
  const videoSrc = useMemo(
    () => (currentArtwork ? getPrimaryVideoSource(currentArtwork) : null),
    [currentArtwork],
  )

  const totalArtworks = state.filtered.length
  const isMediaLoaded = loadedIndex === state.currentArtworkIndex

  const advanceToNext = useCallback(() => {
    if (totalArtworks <= 1) return
    const nextIndex = indexRef.current >= totalArtworks - 1 ? 0 : indexRef.current + 1
    pausedProgressRef.current = 0
    setState((prev) => ({
      ...prev,
      slideshowTimerProgress: 0,
      currentArtworkIndex: nextIndex,
    }))
  }, [setState, totalArtworks])

  const updateProgress = useCallback(() => {
    const elapsed = Date.now() - startTimeRef.current
    const progress = Math.min((elapsed / autoPlayInterval) * 100, 100)

    pausedProgressRef.current = progress
    setState((prev) => ({ ...prev, slideshowTimerProgress: progress }))

    if (progress < 100) {
      animationRef.current = requestAnimationFrame(updateProgress)
    } else {
      animationRef.current = null
    }
  }, [autoPlayInterval, setState])

  useEffect(() => {
    pausedProgressRef.current = 0
    setState((prev) => ({ ...prev, slideshowTimerProgress: 0 }))
    setLoadedIndex(-1)
  }, [setState, state.currentArtworkIndex])

  useEffect(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    if (!state.slideshowPlaying || !isMediaLoaded) return

    startTimeRef.current = Date.now() - (pausedProgressRef.current / 100) * autoPlayInterval
    animationRef.current = requestAnimationFrame(updateProgress)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [
    autoPlayInterval,
    isMediaLoaded,
    state.currentArtworkIndex,
    state.slideshowPlaying,
    updateProgress,
  ])

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    if (!state.slideshowPlaying || totalArtworks <= 1 || !isMediaLoaded) return

    const remainingMs = autoPlayInterval - (pausedProgressRef.current / 100) * autoPlayInterval
    timeoutRef.current = setTimeout(advanceToNext, Math.max(remainingMs, 1))

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [
    advanceToNext,
    autoPlayInterval,
    isMediaLoaded,
    state.currentArtworkIndex,
    state.slideshowPlaying,
    totalArtworks,
  ])

  useEffect(() => {
    if (!state.slideshowPlaying && pausedProgressRef.current > 0) {
      setState((prev) => ({
        ...prev,
        slideshowTimerProgress: pausedProgressRef.current,
      }))
    }
  }, [setState, state.slideshowPlaying])

  const handleImageLoad = useCallback(() => {
    setLoadedIndex(state.currentArtworkIndex)
  }, [state.currentArtworkIndex])

  const handleVideoReady = useCallback(() => {
    setLoadedIndex(state.currentArtworkIndex)
  }, [state.currentArtworkIndex])

  if (!currentArtwork) return null

  return (
    <div className="artworks-slideshow__container">
      <div className="artworks-slideshow__media">
        {videoSrc ? (
          <div
            className="overflow-hidden"
            style={{
              width: state.artworkContainerWidth,
              height: state.artworkContainerHeight,
            }}
          >
            <ReactPlayer
              key={state.currentArtworkIndex}
              src={videoSrc}
              playing={state.slideshowPlaying}
              muted
              controls={false}
              width="100%"
              height="100%"
              onReady={handleVideoReady}
              onEnded={advanceToNext}
            />
          </div>
        ) : (
          <ArtworkImage
            key={state.currentArtworkIndex}
            artwork={currentArtwork}
            artworkContainerWidth={state.artworkContainerWidth}
            artworkContainerHeight={state.artworkContainerHeight}
            imageContext="slideshow"
            priority
            onLoad={handleImageLoad}
          />
        )}
      </div>
    </div>
  )
}
