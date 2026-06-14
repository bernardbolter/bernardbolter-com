'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

import { PlayButtonSvg } from '@/components/icons'
import {
  getDisplayImageUrl,
  getPrimaryMediaDimensions,
  getSizeTier,
  resolveSeriesSlug,
} from '@/helpers/artworkCatalog'
import { seriesColorBlurDataURLs } from '@/helpers/blurURLs'
import { getSeriesColor } from '@/helpers/seriesColor'
import { useArtworkDimensions } from '@/hooks/useArtworkDimensions'
import type { Artwork } from '@/payload-types'
import { resolveArtworkOrientation } from '@/utilities/artworkSizeDisplay'

interface ArtworkGridImageProps {
  artwork: Artwork
  itemSize: {
    width: number
    height: number
    gap: number
  }
}

const INFO_BOX_HEIGHT = 49

function isVideoArtwork(artwork: Artwork): boolean {
  const primary = artwork.primaryImage
  const hasPrimaryImage = Boolean(primary && typeof primary === 'object' && primary.url)
  if (hasPrimaryImage) return false

  const hasPoster = Boolean(
    artwork.posterImage && typeof artwork.posterImage === 'object' && artwork.posterImage.url,
  )
  const hasVideoFile = Boolean(
    artwork.videoFile && typeof artwork.videoFile === 'object' && artwork.videoFile.url,
  )
  const hasVideoUrl = Boolean(artwork.videoUrl)
  const hasClips = (artwork.videos ?? []).some(
    (clip) =>
      (clip.videoFile && typeof clip.videoFile === 'object' && clip.videoFile.url) ||
      Boolean(clip.videoUrl),
  )

  return hasPoster || hasVideoFile || hasVideoUrl || hasClips
}

function getImageSizes(itemWidth: number): string {
  return `(max-width: 550px) 100vw, (max-width: 768px) 50vw, (max-width: 980px) 33vw, (max-width: 1200px) 25vw, ${itemWidth}px`
}

export default function ArtworkGridImage({ artwork, itemSize }: ArtworkGridImageProps) {
  const [isImageLoading, setIsImageLoading] = useState(true)
  const [imageFailed, setImageFailed] = useState(false)

  const isVideo = isVideoArtwork(artwork)
  const seriesSlug = resolveSeriesSlug(artwork) ?? 'default'
  const imageSrc = getDisplayImageUrl(artwork) ?? ''
  const { width: imageWidth, height: imageHeight } = getPrimaryMediaDimensions(artwork)

  const orientation = resolveArtworkOrientation(artwork, imageWidth, imageHeight)

  const { displayWidth, displayHeight } = useArtworkDimensions({
    artworkContainerWidth: itemSize.width,
    artworkContainerHeight: 5000,
    imageWidth,
    imageHeight,
    artworkSize: getSizeTier(artwork),
    useImageFactors: !isVideo,
    orientation,
    gridView: true,
  })

  const blurDataURL = seriesColorBlurDataURLs[seriesSlug] ?? seriesColorBlurDataURLs.default
  const horizontalMargin = Math.round((itemSize.width - displayWidth) / 2)

  return (
    <Link
      href={`/${artwork.slug}`}
      className="artwork-grid__image-container"
      style={{
        width: itemSize.width,
        paddingBottom: INFO_BOX_HEIGHT,
      }}
    >
      <div
        className="artwork-grid__image-wrapper"
        style={{
          marginLeft: horizontalMargin,
          marginRight: horizontalMargin,
          position: 'relative',
          width: displayWidth,
          height: displayHeight,
        }}
      >
        {isVideo ? <PlayButtonSvg /> : null}

        {(isImageLoading || imageFailed) && (
          <div
            className="artwork-grid__placeholer-overlay"
            style={{
              backgroundColor: getSeriesColor(seriesSlug),
              zIndex: imageFailed ? 20 : 10,
            }}
          >
            {imageFailed ? <p>image failed to load</p> : <p>image loading...</p>}
          </div>
        )}

        {imageSrc ? (
          <Image
            className="artwork-grid__image object-contain"
            src={imageSrc}
            alt={artwork.title ?? 'Artwork'}
            fill
            style={{
              opacity: imageFailed ? 0 : 1,
            }}
            placeholder="blur"
            blurDataURL={blurDataURL}
            loading="lazy"
            sizes={getImageSizes(itemSize.width)}
            onLoad={() => setIsImageLoading(false)}
            onError={() => {
              setIsImageLoading(false)
              setImageFailed(true)
            }}
          />
        ) : null}

        <div className="artwork-grid__info">
          <div
            className="artwork-grid__info--series-box"
            style={{ backgroundColor: getSeriesColor(seriesSlug) }}
          />
          <h3>{artwork.title}</h3>
        </div>
      </div>
    </Link>
  )
}
