'use client'

import { useMemo } from 'react'

import ArtworkSize, { getArtworkSizeInput } from '@/components/artworks/ArtworkSize'
import YoutubePlainSvg from '@/components/icons/YoutubePlainSvg'
import useWindowSize from '@/hooks/useWindowSize'
import {
  getPrimaryVideoSource,
  getYoutubeAccessUrl,
  isYoutubeVideoUrl,
} from '@/lib/artwork/artworkGalleryImages'
import { formatArtworkYearRange, resolveWallLabelMedium } from '@/lib/artwork/artworkLabels'
import { mediaPublicUrl } from '@/lib/media/publicUrl'
import type { Artwork, Media } from '@/payload-types'

type Props = {
  artwork: Artwork
}

function readPosterMedia(artwork: Artwork): Media | null {
  const candidate = artwork.posterImage ?? artwork.primaryImage
  if (candidate && typeof candidate === 'object') return candidate as Media
  return null
}

function readPosterUrl(artwork: Artwork): string | null {
  return mediaPublicUrl(readPosterMedia(artwork))
}

function readPosterDimensions(artwork: Artwork): { width: number; height: number } {
  const media = readPosterMedia(artwork)
  if (media) {
    return {
      width: media.width && media.width > 0 ? media.width : 1600,
      height: media.height && media.height > 0 ? media.height : 900,
    }
  }
  return { width: 1600, height: 900 }
}

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

export default function Layer0Video({ artwork }: Props) {
  const size = useWindowSize()
  const videoSource = getPrimaryVideoSource(artwork)
  const youtubeAccessUrl = getYoutubeAccessUrl(artwork)
  const posterUrl = readPosterUrl(artwork)
  const { width: intrinsicWidth, height: intrinsicHeight } = readPosterDimensions(artwork)
  const containerWidth = (size.width || 1200) * 0.9
  const containerHeight = (size.height || 900) * 0.9

  const { displayWidth, displayHeight } = useMemo(
    () =>
      calculateVideoDisplayDimensions(
        intrinsicWidth,
        intrinsicHeight,
        containerWidth,
        containerHeight,
      ),
    [containerHeight, containerWidth, intrinsicHeight, intrinsicWidth],
  )

  const topMargin = size.height ? (size.height - displayHeight) / 2 : 100
  const isSelfHosted = Boolean(videoSource && !isYoutubeVideoUrl(videoSource))

  if (!videoSource && !youtubeAccessUrl) return null

  const sizeInput = getArtworkSizeInput(artwork)

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
              title={artwork.title ?? 'Artwork video'}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
            >
              <source src={videoSource} />
            </video>
          ) : posterUrl ? (
            <img
              src={posterUrl}
              alt={artwork.title ?? 'Artwork video poster'}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : null}
        </div>

        <div className="artwork-video__info-container">
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
