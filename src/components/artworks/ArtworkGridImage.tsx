'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

import { PlayButtonSvg } from '@/components/icons'
import {
  getDisplayImageUrl,
  getPrimaryMediaDimensions,
  resolveSeriesSlug,
} from '@/helpers/artworkCatalog'
import { seriesColorBlurDataURLs } from '@/helpers/blurURLs'
import { getSeriesColor } from '@/helpers/seriesColor'
import { CELL_PAD, type GridItemLayout } from '@/lib/artwork/gridRealSize'
import { getTranslateOffset } from '@/lib/artwork/gridTranslate'
import type { CatalogueArtwork } from '@/types/frontend'

interface ArtworkGridImageProps {
  layout: GridItemLayout
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

function getImageSizes(columnWidth: number): string {
  const px = Math.round(columnWidth)
  return `(max-width: 550px) 100vw, (max-width: 768px) 50vw, (max-width: 980px) 33vw, (max-width: 1200px) 25vw, ${px}px`
}

export default function ArtworkGridImage({ layout }: ArtworkGridImageProps) {
  const [isImageLoading, setIsImageLoading] = useState(true)
  const [imageFailed, setImageFailed] = useState(false)

  const { artwork, columnWidth, displayWidth, displayHeight, usingFallbackSizing } = layout
  const isVideo = isVideoArtwork(artwork)
  const seriesSlug = resolveSeriesSlug(artwork) ?? 'default'
  const imageSrc = getDisplayImageUrl(artwork) ?? ''
  const { width: imageWidth, height: imageHeight } = getPrimaryMediaDimensions(artwork)
  const blurDataURL = seriesColorBlurDataURLs[seriesSlug] ?? seriesColorBlurDataURLs.default
  const captionMaxWidth = columnWidth - (columnWidth - displayWidth) / 2
  const translate = getTranslateOffset(artwork.id)

  return (
    <Link
      href={`/${artwork.slug}`}
      className="artwork-grid__image-container"
      style={{
        width: columnWidth,
        paddingTop: CELL_PAD,
        paddingBottom: CELL_PAD,
        boxSizing: 'border-box',
      }}
      data-using-fallback-sizing={usingFallbackSizing ? 'true' : undefined}
    >
      <div
        className="artwork-grid__image-wrapper"
        style={
          {
            width: displayWidth,
            '--caption-max-width': `${captionMaxWidth}px`,
            transform: `translate(${translate.x}px, ${translate.y}px)`,
          } as React.CSSProperties
        }
      >
        <div
          className="artwork-grid__image-frame"
          style={{
            position: 'relative',
            width: displayWidth,
            height: displayHeight,
          }}
        >
          {isVideo ? <PlayButtonSvg /> : null}

          {(isImageLoading || imageFailed) && imageSrc ? (
            <div
              className="artwork-grid__placeholer-overlay"
              style={{
                backgroundColor: getSeriesColor(seriesSlug),
                zIndex: imageFailed ? 20 : 10,
              }}
            >
              {imageFailed ? <p>image failed to load</p> : <p>image loading...</p>}
            </div>
          ) : null}

          {imageSrc ? (
            <Image
              className="artwork-grid__image"
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
              sizes={getImageSizes(columnWidth)}
              onLoad={() => setIsImageLoading(false)}
              onError={() => {
                setIsImageLoading(false)
                setImageFailed(true)
              }}
            />
          ) : (
            <div
              className="artwork-grid__placeholer-overlay"
              style={{
                backgroundColor: getSeriesColor(seriesSlug),
                zIndex: 10,
                width: displayWidth,
                height: displayHeight,
              }}
            >
              <p>{isVideo ? 'video' : 'no image'}</p>
            </div>
          )}
        </div>

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
