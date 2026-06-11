'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import ReactPlayer from 'react-player'

import MagnifyOverlay from '@/components/artwork/MagnifyOverlay'
import ArtworkSize, { getArtworkSizeInput } from '@/components/artworks/ArtworkSize'
import { CloseCircleSvg } from '@/components/icons'
import { getSizeTier, resolveSeriesSlug } from '@/helpers/artworkCatalog'
import { seriesColorBlurDataURLs } from '@/helpers/blurURLs'
import { getSeriesColor } from '@/helpers/seriesColor'
import useWindowSize from '@/hooks/useWindowSize'
import {
  artworkHasVideo,
  collectArtworkGalleryImages,
  getDocumentationVideoSource,
  getPrimaryVideoSource,
} from '@/lib/artwork/artworkGalleryImages'
import { formatArtworkYearRange, resolveWallLabelMedium } from '@/lib/artwork/artworkLabels'
import { resolveArtworkOrientation } from '@/utilities/artworkSizeDisplay'
import { calculateArtworkDisplaySize } from '@/utilities/artworkSizeDisplay'
import type { Artwork } from '@/payload-types'

const SLIDE_INTERVAL_MS = 6000

type Props = {
  artwork: Artwork
}

export default function Layer0Image({ artwork }: Props) {
  const size = useWindowSize()
  const viewportWidth = size.width || 1200
  const viewportHeight = size.height || 900
  const containerWidth = viewportWidth >= 768 ? viewportWidth : viewportWidth
  const containerHeight =
    viewportWidth >= 768 ? Math.max(1, viewportHeight - 180) : Math.max(1, viewportWidth - 80)

  const galleryImages = useMemo(() => collectArtworkGalleryImages(artwork), [artwork])
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [magnifyOpen, setMagnifyOpen] = useState(false)
  const [showVideo, setShowVideo] = useState(false)

  const activeImage = galleryImages[activeIndex] ?? galleryImages[0]
  const hasMultiple = galleryImages.length > 1
  const videoSrc = getPrimaryVideoSource(artwork)
  const documentationVideo = getDocumentationVideoSource(artwork)
  const hasVideo = artworkHasVideo(artwork)
  const seriesSlug = resolveSeriesSlug(artwork) ?? 'default'
  const seriesColor = getSeriesColor(seriesSlug)
  const blurDataURL = seriesColorBlurDataURLs[seriesSlug] ?? seriesColorBlurDataURLs.default
  const sizeTier = getSizeTier(artwork)

  const displaySize = useMemo(() => {
    if (!activeImage) {
      return { displayWidth: 400, displayHeight: 300 }
    }
    return calculateArtworkDisplaySize({
      imageWidth: activeImage.width,
      imageHeight: activeImage.height,
      containerWidth,
      containerHeight,
      sizeTier,
      useImageFactors: true,
      orientation: resolveArtworkOrientation(artwork, activeImage.width, activeImage.height),
    })
  }, [activeImage, artwork, containerHeight, containerWidth, sizeTier])

  const sizeInput = getArtworkSizeInput(artwork)

  const nextSlide = useCallback(() => {
    if (!hasMultiple) return
    setActiveIndex((index) => (index + 1) % galleryImages.length)
  }, [galleryImages.length, hasMultiple])

  useEffect(() => {
    if (!hasMultiple || paused) return
    const timer = window.setInterval(nextSlide, SLIDE_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [hasMultiple, nextSlide, paused])

  const showVideoPlayer = hasVideo && (showVideo || !activeImage)

  return (
    <section className="layer0 artwork-page__layer">
      <Link href="/" className="layer0__controls layer0__controls--close flex items-center gap-2 no-underline">
        <span className="h-6 w-6 fill-white">
          <CloseCircleSvg />
        </span>
        <span className="font-heading text-sm text-white/90">close</span>
      </Link>

      {activeImage ? (
        <button
          type="button"
          className="layer0__controls layer0__controls--magnify rounded bg-white/10 px-3 py-1 text-sm text-white"
          onClick={() => setMagnifyOpen(true)}
        >
          Magnify
        </button>
      ) : null}

      {hasMultiple ? (
        <div className="layer0__controls layer0__controls--nav flex items-center gap-2 text-sm text-white/90">
          <button
            type="button"
            className="rounded bg-white/10 px-2 py-1"
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? 'Play' : 'Pause'}
          </button>
          <span>
            {activeIndex + 1} / {galleryImages.length}
          </span>
          <button type="button" className="rounded bg-white/10 px-2 py-1" onClick={nextSlide}>
            Next
          </button>
        </div>
      ) : null}

      <div className="layer0__stage">
        <div
          className="relative overflow-hidden"
          style={{
            width: displaySize.displayWidth,
            height: displaySize.displayHeight,
            backgroundColor: seriesColor,
          }}
        >
          {showVideoPlayer && videoSrc ? (
            <div className="flex h-full w-full flex-col">
              {!showVideo && activeImage ? (
                <button
                  type="button"
                  className="relative h-full w-full"
                  onClick={() => setShowVideo(true)}
                  aria-label="Play video"
                >
                  <Image
                    src={activeImage.url}
                    alt={activeImage.alt}
                    width={displaySize.displayWidth}
                    height={displaySize.displayHeight}
                    className="h-full w-full object-contain"
                    priority
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white">
                    Play video
                  </span>
                </button>
              ) : (
                <ReactPlayer src={videoSrc} controls width="100%" height="100%" />
              )}
              {hasVideo && activeImage ? (
                <button
                  type="button"
                  className="absolute bottom-2 right-2 rounded bg-black/50 px-2 py-1 text-xs text-white"
                  onClick={() => setShowVideo((value) => !value)}
                >
                  {showVideo ? 'Show image' : 'Show video'}
                </button>
              ) : null}
            </div>
          ) : activeImage ? (
            <Image
              src={activeImage.url}
              alt={activeImage.alt}
              width={displaySize.displayWidth}
              height={displaySize.displayHeight}
              className="h-full w-full object-contain"
              placeholder="blur"
              blurDataURL={blurDataURL}
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-white/70">
              No image
            </div>
          )}
        </div>
      </div>

      <div className="layer0__wall-label">
        <h1>{artwork.title}</h1>
        <h2>{formatArtworkYearRange(artwork)}</h2>
        <h3>{resolveWallLabelMedium(artwork)}</h3>
        {sizeInput ? (
          <div className="text-white/80 [&_.artwork-title__size]:!text-white/80">
            <ArtworkSize width={sizeInput.width} height={sizeInput.height} units={sizeInput.units} />
          </div>
        ) : null}
        {documentationVideo && videoSrc ? (
          <p className="mt-2 text-xs text-white/55">
            Documentation video is separate from the primary work recording.
          </p>
        ) : null}
      </div>

      {magnifyOpen && activeImage ? (
        <MagnifyOverlay image={activeImage} onClose={() => setMagnifyOpen(false)} />
      ) : null}
    </section>
  )
}
