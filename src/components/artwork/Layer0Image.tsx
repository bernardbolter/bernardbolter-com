'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactPlayer from 'react-player'

import MagnifyOverlay from '@/components/artwork/MagnifyOverlay'
import ArtworkSize, { getArtworkSizeInput } from '@/components/artworks/ArtworkSize'
import {
  ArtworkPauseSvg,
  ArtworkTimerSvg,
  LeftArrowSvg,
} from '@/components/icons'
import MagnifyAnimationSvg from '@/components/icons/MagnifyAnimationSvg'
import { getSizeTier, resolveSeriesSlug } from '@/helpers/artworkCatalog'
import { seriesColorBlurDataURLs } from '@/helpers/blurURLs'
import { getSeriesColor } from '@/helpers/seriesColor'
import useWindowSize from '@/hooks/useWindowSize'
import {
  artworkHasVideo,
  collectArtworkGalleryImages,
  getPrimaryVideoSource,
} from '@/lib/artwork/artworkGalleryImages'
import { formatArtworkYearRange, resolveWallLabelMedium } from '@/lib/artwork/artworkLabels'
import { getInitialMagnifyDragPosition } from '@/lib/artwork/magnifyDisplay'
import type { DragPosition } from '@/lib/artwork/magnifyDisplay'
import {
  calculateArtworkDisplaySize,
  resolveArtworkOrientation,
} from '@/utilities/artworkSizeDisplay'
import type { Artwork } from '@/payload-types'

const SLIDE_INTERVAL_MS = 4000
const TIMER_TICK_MS = 50

type Props = {
  artwork: Artwork
}

export default function Layer0Image({ artwork }: Props) {
  const size = useWindowSize()
  const viewportWidth = size.width || 1200
  const viewportHeight = size.height || 900

  const galleryImages = useMemo(() => collectArtworkGalleryImages(artwork), [artwork])
  const gallerySignature = useMemo(
    () => galleryImages.map((image) => image.url).join('|'),
    [galleryImages],
  )
  const loadedImageUrlsRef = useRef(new Set<string>())
  const [activeIndex, setActiveIndex] = useState(0)
  const [artworkPlaying, setArtworkPlaying] = useState(true)
  const [magnifyOpen, setMagnifyOpen] = useState(false)
  const [showVideo, setShowVideo] = useState(false)
  const [timerProgress, setTimerProgress] = useState(0)
  const [imageLoadingStates, setImageLoadingStates] = useState<boolean[]>([])
  const [imageErrorStates, setImageErrorStates] = useState<boolean[]>([])
  const [dragPositions, setDragPositions] = useState<DragPosition[]>([])

  const markImageLoaded = useCallback((url: string, index: number) => {
    loadedImageUrlsRef.current.add(url)
    setImageLoadingStates((prev) => {
      if (prev[index]) return prev
      const next = [...prev]
      next[index] = true
      return next
    })
  }, [])

  const markAllImagesLoaded = useCallback(() => {
    galleryImages.forEach((image) => loadedImageUrlsRef.current.add(image.url))
    setImageLoadingStates(galleryImages.map(() => true))
  }, [galleryImages])

  const hasMultiple = galleryImages.length > 1
  const maxIndex = galleryImages.length - 1
  const activeImage = galleryImages[activeIndex] ?? galleryImages[0]
  const videoSrc = getPrimaryVideoSource(artwork)
  const hasVideo = artworkHasVideo(artwork)
  const seriesSlug = resolveSeriesSlug(artwork) ?? 'default'
  const seriesColor = getSeriesColor(seriesSlug)
  const blurDataURL = seriesColorBlurDataURLs[seriesSlug] ?? seriesColorBlurDataURLs.default
  const sizeTier = getSizeTier(artwork)
  const sizeInput = getArtworkSizeInput(artwork)

  useEffect(() => {
    setImageLoadingStates(
      galleryImages.map((image) => loadedImageUrlsRef.current.has(image.url)),
    )
    setImageErrorStates(galleryImages.map(() => false))
    setDragPositions(galleryImages.map(() => ({ x: 0, y: 0 })))
  }, [gallerySignature, galleryImages])

  const displaySize = useMemo(() => {
    if (!activeImage) {
      return { displayWidth: 400, displayHeight: 300 }
    }
    return calculateArtworkDisplaySize({
      imageWidth: activeImage.width,
      imageHeight: activeImage.height,
      containerWidth: viewportWidth,
      containerHeight: viewportHeight,
      sizeTier,
      useImageFactors: true,
      orientation: resolveArtworkOrientation(artwork, activeImage.width, activeImage.height),
    })
  }, [activeImage, artwork, sizeTier, viewportHeight, viewportWidth])

  const { marginWidth, marginHeight } = useMemo(() => {
    return {
      marginWidth: Math.max(0, (viewportWidth - displaySize.displayWidth) / 2),
      marginHeight: Math.max(0, (viewportHeight - displaySize.displayHeight) / 2),
    }
  }, [displaySize.displayHeight, displaySize.displayWidth, viewportHeight, viewportWidth])

  const imageSizes = useMemo(
    () => `(max-width: 768px) 100vw, ${Math.round(displaySize.displayWidth)}px`,
    [displaySize.displayWidth],
  )

  const resetAndChangeImage = useCallback(
    (newIndex: number) => {
      if (magnifyOpen && galleryImages[newIndex]) {
        if (newIndex !== activeIndex) {
          const initial = getInitialMagnifyDragPosition(
            viewportWidth,
            viewportHeight,
            galleryImages[newIndex]!.width,
            galleryImages[newIndex]!.height,
          )
          setDragPositions((prev) => {
            const next = [...prev]
            next[newIndex] = initial
            return next
          })
        }
      }
      setActiveIndex(newIndex)
    },
    [activeIndex, galleryImages, magnifyOpen, viewportHeight, viewportWidth],
  )

  const handleNextImage = useCallback(() => {
    resetAndChangeImage(activeIndex === maxIndex ? 0 : activeIndex + 1)
  }, [activeIndex, maxIndex, resetAndChangeImage])

  const handlePrevImage = useCallback(() => {
    resetAndChangeImage(activeIndex === 0 ? maxIndex : activeIndex - 1)
  }, [activeIndex, maxIndex, resetAndChangeImage])

  const handleToggleMagnify = useCallback(() => {
    setMagnifyOpen((open) => {
      if (open) {
        markAllImagesLoaded()
      } else if (activeImage) {
        const initial = getInitialMagnifyDragPosition(
          viewportWidth,
          viewportHeight,
          activeImage.width,
          activeImage.height,
        )
        setDragPositions((prev) => {
          const next = [...prev]
          next[activeIndex] = initial
          return next
        })
      }
      return !open
    })
  }, [activeImage, activeIndex, markAllImagesLoaded, viewportHeight, viewportWidth])

  useEffect(() => {
    if (!hasMultiple || !artworkPlaying || magnifyOpen) {
      setTimerProgress(0)
      return
    }

    let progress = 0
    const interval = window.setInterval(() => {
      progress += (100 / SLIDE_INTERVAL_MS) * TIMER_TICK_MS
      if (progress >= 100) {
        progress = 0
        handleNextImage()
      }
      setTimerProgress(progress)
    }, TIMER_TICK_MS)

    return () => {
      window.clearInterval(interval)
      setTimerProgress(0)
    }
  }, [artworkPlaying, handleNextImage, hasMultiple, magnifyOpen])

  const showVideoPlayer = hasVideo && (showVideo || !activeImage)

  if (!galleryImages.length && !showVideoPlayer) {
    return (
      <div className="artwork-image__container">
        <p className="artwork-image__title">{artwork.title}</p>
      </div>
    )
  }

  return (
    <>
      {activeImage ? (
        <button
          type="button"
          className={`artwork-image__magnify-container${magnifyOpen ? ' artwork-image__magnify-container--open' : ''}`}
          onClick={handleToggleMagnify}
          aria-label={magnifyOpen ? 'Close magnify' : 'Magnify artwork'}
          aria-pressed={magnifyOpen}
        >
          <MagnifyAnimationSvg enlargeArtwork={magnifyOpen} color="#666" />
        </button>
      ) : null}

      <div
        className={`artwork-image__container${magnifyOpen ? ' artwork-image__container--magnify-hidden' : ''}`}
      >
        <div
          className="artwork-image__slider-viewport"
          style={{
            width: displaySize.displayWidth,
            height: displaySize.displayHeight,
            marginLeft: marginWidth,
            marginTop: marginHeight,
          }}
        >
          <div
            className="artwork-image__slider-wrapper"
            style={{
              width: displaySize.displayWidth * galleryImages.length,
              transform: `translateX(-${activeIndex * displaySize.displayWidth}px)`,
            }}
          >
            {galleryImages.map((image, index) => {
              const isLoaded =
                imageLoadingStates[index] || loadedImageUrlsRef.current.has(image.url)
              const hasError = imageErrorStates[index]
              return (
                <div
                  key={image.url}
                  className="artwork-image__image-slide"
                  style={{
                    width: displaySize.displayWidth,
                    height: displaySize.displayHeight,
                  }}
                >
                  <div
                    className="artwork-image__image-wrapper"
                    style={{
                      width: displaySize.displayWidth,
                      height: displaySize.displayHeight,
                      backgroundColor: seriesColor,
                    }}
                  >
                    {(!isLoaded || hasError) && (
                      <div
                        className="artwork-detail__placeholder-overlay"
                        style={{ zIndex: hasError ? 20 : 10 }}
                      >
                        <p>{artwork.title}</p>
                        <p>{hasError ? 'image failed to load' : 'loading...'}</p>
                      </div>
                    )}
                    <Image
                      className="artwork-image__image"
                      src={image.url}
                      sizes={imageSizes}
                      alt={image.alt || artwork.title || 'Bernard Bolter Artwork'}
                      width={displaySize.displayWidth}
                      height={displaySize.displayHeight}
                      quality={80}
                      placeholder="blur"
                      blurDataURL={blurDataURL}
                      priority={index === activeIndex}
                      onLoad={() => markImageLoaded(image.url, index)}
                      onError={() => {
                        setImageLoadingStates((prev) => {
                          const next = [...prev]
                          next[index] = true
                          return next
                        })
                        setImageErrorStates((prev) => {
                          const next = [...prev]
                          next[index] = true
                          return next
                        })
                      }}
                      style={{
                        objectFit: 'contain',
                        opacity: hasError ? 0 : 1,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {showVideoPlayer && videoSrc ? (
            <div className="artwork-image__video-inline absolute inset-0 z-10 bg-black">
              <ReactPlayer src={videoSrc} controls width="100%" height="100%" />
            </div>
          ) : null}
        </div>

        <div className="artwork-image__info-container">
          <div
            className="artwork-image__info--title-container"
            style={{ paddingRight: marginWidth }}
          >
            <h1 className="artwork-image__title">{artwork.title}</h1>
            <h2 className="artwork-image__year">{formatArtworkYearRange(artwork)}</h2>
            <h3 className="artwork-image__medium">{resolveWallLabelMedium(artwork)}</h3>
            {sizeInput ? (
              <ArtworkSize
                width={sizeInput.width}
                height={sizeInput.height}
                units={sizeInput.units}
              />
            ) : null}
            <div
              className="artwork-image__series-box"
              style={{
                background: seriesColor,
                left: marginWidth,
              }}
            />
          </div>
        </div>
      </div>

      {hasMultiple ? (
        <div className="artwork-image__buttons-container">
          <div className="artwork-image__counter">
            <p>
              {activeIndex + 1} / {galleryImages.length}
            </p>
          </div>
          <button
            type="button"
            className="artwork-image__button"
            onClick={handlePrevImage}
            aria-label="Previous image"
          >
            <LeftArrowSvg isRight={false} />
          </button>
          <button
            type="button"
            className="artwork-image__button right-arrow"
            onClick={handleNextImage}
            aria-label="Next image"
          >
            <LeftArrowSvg isRight />
          </button>
          {!magnifyOpen ? (
            <>
              <div className="artwork-image__button">
                <ArtworkPauseSvg
                  artworkPlaying={artworkPlaying}
                  setArtworkPlaying={setArtworkPlaying}
                />
              </div>
              <div className="artwork-image__button artwork-image__button--timer">
                <ArtworkTimerSvg progress={timerProgress} />
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {magnifyOpen && galleryImages.length > 0 ? (
        <MagnifyOverlay
          images={galleryImages}
          activeIndex={activeIndex}
          dragPositions={dragPositions}
          onDrag={(index, position) => {
            setDragPositions((prev) => {
              const next = [...prev]
              next[index] = position
              return next
            })
          }}
          onClose={handleToggleMagnify}
          onImageLoaded={(index) => {
            const image = galleryImages[index]
            if (image) markImageLoaded(image.url, index)
          }}
          seriesColor={seriesColor}
          blurDataURL={blurDataURL}
          artworkTitle={artwork.title ?? 'Artwork'}
        />
      ) : null}
    </>
  )
}
