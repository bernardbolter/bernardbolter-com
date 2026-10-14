'use client'

import Link from 'next/link'
import { useState, type CSSProperties } from 'react'

import ArtworkR2Image from '@/components/artwork/ArtworkR2Image'
import ArtworkIdentityLabel from '@/components/artworks/ArtworkIdentityLabel'
import { OpenArtworkSvg, PlayButtonSvg } from '@/components/icons'
import {
  getArtworkImagePair,
  getPrimaryMediaDimensions,
  resolveSeriesSlug,
} from '@/helpers/artworkCatalog'
import { getSeriesColor } from '@/helpers/seriesColor'
import { resolveCatalogueImageAlt } from '@/lib/artwork/catalogueIdentity'
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
  const imageAlt = resolveCatalogueImageAlt(artwork)
  const slug = artwork.slug?.trim() || ''
  const recordHref = slug ? `/${slug}` : '#'

  return (
    <article
      className="artwork-grid__image-container"
      style={{
        width: columnWidth,
        paddingTop: CELL_PAD,
        paddingBottom: CELL_PAD,
        boxSizing: 'border-box',
        ['--scatter-x' as string]: `${translate.x}px`,
        ['--scatter-y' as string]: `${translate.y}px`,
      }}
      data-using-fallback-sizing={usingFallbackSizing ? 'true' : undefined}
      data-artwork-slug={slug}
    >
      <div
        className="artwork-grid__image-wrapper"
        style={
          {
            width: displayWidth,
            '--caption-max-width': `${captionMaxWidth}px`,
          } as CSSProperties
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
          aria-label={title}
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

          <span className="artwork-grid__open-icon" aria-hidden>
            <OpenArtworkSvg />
          </span>
        </Link>

        <div className="artwork-grid__info">
          <ArtworkIdentityLabel
            artwork={artwork}
            filterSeries={state.filterSeries}
            fields="scan"
            seriesAccentPlacement="series-line"
            renderSeriesAccent={(resolved) => (
              <span
                className="artwork-identity__accent artwork-identity__accent--grid"
                style={{ backgroundColor: resolved.color }}
                aria-hidden
              />
            )}
          />
        </div>
      </div>
    </article>
  )
}
