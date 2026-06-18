'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import { PlayButtonSvg } from '@/components/icons'
import {
  getDisplayImageUrl,
  getPrimaryMediaDimensions,
  resolveSeriesSlug,
} from '@/helpers/artworkCatalog'
import { seriesColorBlurDataURLs } from '@/helpers/blurURLs'
import { getSeriesColor } from '@/helpers/seriesColor'
import {
  calculateGridItemLayout,
  gridItemContainerWidth,
  type GridColumnSpan,
} from '@/lib/artwork/gridLayout'
import type { CatalogueArtwork } from '@/types/frontend'

interface ArtworkGridImageProps {
  artwork: CatalogueArtwork
  columnWidth: number
  gap: number
  columnSpan?: GridColumnSpan
}

function isVideoArtwork(artwork: CatalogueArtwork): boolean {
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

function getImageSizes(itemWidth: number, columnSpan: GridColumnSpan): string {
  const spanFactor = columnSpan === 2 ? 2 : 1
  const px = itemWidth * spanFactor
  return `(max-width: 550px) 100vw, (max-width: 768px) 50vw, (max-width: 980px) 33vw, (max-width: 1200px) 25vw, ${px}px`
}

export default function ArtworkGridImage({
  artwork,
  columnWidth,
  gap,
  columnSpan = 1,
}: ArtworkGridImageProps) {
  const [isImageLoading, setIsImageLoading] = useState(true)
  const [imageFailed, setImageFailed] = useState(false)

  const isVideo = isVideoArtwork(artwork)
  const seriesSlug = resolveSeriesSlug(artwork) ?? 'default'
  const imageSrc = getDisplayImageUrl(artwork) ?? ''
  const { width: imageWidth, height: imageHeight } = getPrimaryMediaDimensions(artwork)

  const { dimensions } = useMemo(
    () => calculateGridItemLayout(artwork, columnWidth, gap, columnSpan),
    [artwork, columnWidth, gap, columnSpan],
  )

  const { displayWidth, displayHeight } = dimensions
  const containerWidth = gridItemContainerWidth(columnWidth, gap, columnSpan)
  const horizontalMargin = Math.round((containerWidth - displayWidth) / 2)
  const blurDataURL = seriesColorBlurDataURLs[seriesSlug] ?? seriesColorBlurDataURLs.default

  return (
    <Link
      href={`/${artwork.slug}`}
      className="artwork-grid__image-container"
      style={{ width: containerWidth }}
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
            width={imageWidth}
            height={imageHeight}
            style={{
              width: displayWidth,
              height: displayHeight,
              opacity: imageFailed ? 0 : 1,
            }}
            placeholder="blur"
            blurDataURL={blurDataURL}
            loading="lazy"
            sizes={getImageSizes(columnWidth, columnSpan)}
            onLoad={() => setIsImageLoading(false)}
            onError={() => {
              setIsImageLoading(false)
              setImageFailed(true)
            }}
          />
        ) : null}
      </div>

      <div className="artwork-grid__info">
        <div
          className="artwork-grid__info--series-box"
          style={{ backgroundColor: getSeriesColor(seriesSlug) }}
        />
        <h3>{artwork.title}</h3>
      </div>
    </Link>
  )
}
