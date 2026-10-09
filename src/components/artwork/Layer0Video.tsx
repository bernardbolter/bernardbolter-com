'use client'

import { useMemo } from 'react'

import ArtworkSize from '@/components/artworks/ArtworkSize'
import YoutubePlainSvg from '@/components/icons/YoutubePlainSvg'
import useWindowSize from '@/hooks/useWindowSize'
import { isYoutubeVideoUrl } from '@/lib/artwork/artworkGalleryImages'
import type { Layer0VideoHeroProps } from '@/lib/artwork/layer0HeroProps'

function calculateVideoDisplayDimensions(
  videoWidth: number,
  videoHeight: number,
  containerWidth: number,
  containerHeight: number,
): { displayWidth: number; displayHeight: number } {
  const aspectRatio = videoWidth > 0 && videoHeight > 0 ? videoWidth / videoHeight : 16 / 9
  let scaledWidth = containerWidth
  let scaledHeight = scaledWidth / aspectRatio

  if (scaledHeight > containerHeight) {
    scaledHeight = containerHeight
    scaledWidth = scaledHeight * aspectRatio
  }

  return {
    displayWidth: Math.round(scaledWidth),
    displayHeight: Math.round(scaledHeight),
  }
}

export default function Layer0Video({
  title,
  yearLabel,
  mediumLabel,
  sizeInput,
  videoSource,
  youtubeAccessUrl,
  posterUrl,
  posterWidth,
  posterHeight,
}: Layer0VideoHeroProps) {
  const size = useWindowSize()
  const containerWidth = (size.width || 1200) * 0.9
  const containerHeight = (size.height || 900) * 0.9

  const { displayWidth, displayHeight } = useMemo(
    () =>
      calculateVideoDisplayDimensions(
        posterWidth,
        posterHeight,
        containerWidth,
        containerHeight,
      ),
    [containerHeight, containerWidth, posterHeight, posterWidth],
  )

  const topMargin = size.height ? (size.height - displayHeight) / 2 : 100
  const isSelfHosted = Boolean(videoSource && !isYoutubeVideoUrl(videoSource))

  if (!videoSource && !youtubeAccessUrl) return null

  return (
    <div className="artwork-video__container" style={{ width: size.width, marginTop: topMargin }}>
        <div
          className="artwork-video__player-wrapper"
          style={{ width: displayWidth, height: displayHeight, background: '#000', borderRadius: 12 }}
        >
          {isSelfHosted && videoSource ? (
            <video
              controls
              playsInline
              preload="metadata"
              poster={posterUrl ?? undefined}
              title={title}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
            >
              <source src={videoSource} />
            </video>
          ) : posterUrl ? (
            <img
              src={posterUrl}
              alt={`${title} video poster`}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : null}
        </div>

        <div className="artwork-video__info-container">
          <h1 className="artwork-image__title">{title}</h1>
          <h2 className="artwork-image__year">{yearLabel}</h2>
          <h3 className="artwork-image__medium">{mediumLabel}</h3>
          {sizeInput ? (
            <ArtworkSize
              width={sizeInput.width}
              height={sizeInput.height}
              units={sizeInput.units}
            />
          ) : null}
          {youtubeAccessUrl ? (
            <a
              className="artwork-video__youtube-access"
              href={youtubeAccessUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="artwork-video__youtube-access-icon" aria-hidden="true">
                <YoutubePlainSvg />
              </span>
              <span className="artwork-video__youtube-access-label">Watch on YouTube</span>
            </a>
          ) : null}
        </div>
    </div>
  )
}
