'use client'

import Link from 'next/link'
import { useState } from 'react'

import ArtworkR2Image from '@/components/artwork/ArtworkR2Image'
import { PlayButtonSvg } from '@/components/icons'
import {
  getArtworkImagePair,
  getPrimaryMediaDimensions,
  resolveSeriesSlug,
} from '@/helpers/artworkCatalog'
import { getSeriesColor } from '@/helpers/seriesColor'
import {
  formatArtworkDimensionLines,
  resolveCatalogueImageAlt,
  resolveSeriesDisplay,
} from '@/lib/artwork/catalogueIdentity'
import { resolveMediumLabel } from '@/lib/artwork/mediumVocabulary'
import { CELL_PAD, type GridItemLayout } from '@/lib/artwork/gridRealSize'
import { getTranslateOffset } from '@/lib/artwork/gridTranslate'
import { useArtworks } from '@/providers/ArtworkProvider'
import type { CatalogueArtwork } from '@/types/frontend'

interface ArtworkGridImageProps {
  layout: GridItemLayout
  /** First row in each column — eager load (lazy breaks inside the grid scroll container). */
  priority?: boolean
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

export default function ArtworkGridImage({ layout, priority = false }: ArtworkGridImageProps) {
  const [state] = useArtworks()
  const [isImageLoading, setIsImageLoading] = useState(true)
  const [imageFailed, setImageFailed] = useState(false)

  const { artwork, columnWidth, displayWidth, displayHeight, usingFallbackSizing } = layout
  const isVideo = isVideoArtwork(artwork)
  const seriesSlug = resolveSeriesSlug(artwork) ?? 'default'
  const imagePair = getArtworkImagePair(artwork, 'grid')
  const { width: imageWidth, height: imageHeight } = getPrimaryMediaDimensions(artwork)
  const captionMaxWidth = columnWidth - (columnWidth - displayWidth) / 2
  const translate = getTranslateOffset(artwork.id)
  const title = artwork.title?.trim() || artwork.slug
  const recordHref = `/${artwork.slug}`
  const year = artwork.yearCreated ? String(artwork.yearCreated) : ''
  const medium = resolveMediumLabel(artwork)
  const dimensions = formatArtworkDimensionLines(artwork)
  const series = resolveSeriesDisplay(artwork, state.filterSeries)
  const imageAlt = resolveCatalogueImageAlt(artwork)

  return (
    <article
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
        <Link
          href={recordHref}
          className="artwork-grid__image-frame"
          style={{
            position: 'relative',
            width: displayWidth,
            height: displayHeight,
            display: 'block',
          }}
        >
          {isVideo ? <PlayButtonSvg /> : null}

          {(isImageLoading || imageFailed) && imagePair ? (
            <div
              className="artwork-grid__placeholer-overlay"
              aria-hidden
              style={{
                backgroundColor: getSeriesColor(seriesSlug),
                zIndex: imageFailed ? 20 : 10,
              }}
            >
              {imageFailed ? <p>image failed to load</p> : null}
            </div>
          ) : null}

          {imagePair ? (
            <ArtworkR2Image
              className="artwork-grid__image"
              src={imagePair.src}
              fallbackSrc={imagePair.fallback}
              alt={imageAlt}
              width={imageWidth}
              height={imageHeight}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              fetchPriority={priority ? 'high' : 'auto'}
              style={{
                width: displayWidth,
                height: displayHeight,
                opacity: imageFailed ? 0 : 1,
              }}
              onLoad={() => setIsImageLoading(false)}
              onError={() => {
                setIsImageLoading(false)
                setImageFailed(true)
              }}
            />
          ) : (
            <div
              className="artwork-grid__placeholer-overlay artwork-placeholder"
              style={{
                backgroundColor: getSeriesColor(seriesSlug),
                zIndex: 10,
                position: 'relative',
                width: displayWidth,
                height: displayHeight,
              }}
            >
              <p>{isVideo ? 'video' : 'no image'}</p>
            </div>
          )}
        </Link>

        <div className="artwork-grid__info">
          {series ? (
            <span
              className="artwork-grid__info--series-box"
              style={{ backgroundColor: series.color }}
              aria-hidden
            />
          ) : (
            <span
              className="artwork-grid__info--series-box"
              style={{ backgroundColor: getSeriesColor(seriesSlug) }}
              aria-hidden
            />
          )}
          <div className="artwork-grid__info-text">
            <h3>
              <Link href={recordHref}>{title}</Link>
            </h3>
            {year ? <p className="artwork-grid__year">{year}</p> : null}
            {series ? (
              <p className="artwork-grid__series">
                <Link href={series.href}>{series.name}</Link>
              </p>
            ) : null}
            {medium ? <p className="artwork-grid__medium">{medium}</p> : null}
            {dimensions ? (
              <p className="artwork-grid__dimensions">
                {dimensions.primary}
                {dimensions.secondary ? (
                  <span className="artwork-grid__dimensions-converted"> {dimensions.secondary}</span>
                ) : null}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}
