'use client'

import { useState } from 'react'

import ArtworkR2Image from '@/components/artwork/ArtworkR2Image'
import { useArtworkDimensions } from '@/hooks/useArtworkDimensions'
import {
  getArtworkImagePair,
  getPrimaryMediaDimensions,
  getSizeTier,
  resolveSeriesSlug,
} from '@/helpers/artworkCatalog'
import { resolveCatalogueImageAlt } from '@/lib/artwork/catalogueIdentity'
import { getSeriesColor } from '@/helpers/seriesColor'
import type { ArtworkImageContext } from '@/lib/media/artworkR2Images'
import type { CatalogueClientRow } from '@/types/frontend'

interface ArtworkImageProps {
  artwork: CatalogueClientRow
  artworkContainerWidth: number
  artworkContainerHeight: number
  useImageFactors?: boolean
  /** Eager load (first timeline row). Does not by itself set fetchpriority. */
  priority?: boolean
  /**
   * LCP candidate — only the first visible painting. Sets fetchpriority=high so
   * the runtime preloads this image alone (not the rest of the eager row).
   */
  lcpCandidate?: boolean
  /** R2 derivative — grid/similar 400w, timeline 400w+800w srcset, etc. */
  imageContext?: ArtworkImageContext
  onLoad?: () => void
  /** Overrides title-only alt. Catalogue homepage passes the identity label line. */
  alt?: string
}

export default function ArtworkImage({
  artwork,
  artworkContainerWidth,
  artworkContainerHeight,
  useImageFactors = false,
  priority = false,
  lcpCandidate = false,
  imageContext = 'artwork-page',
  onLoad,
  alt,
}: ArtworkImageProps) {
  const imagePair = getArtworkImagePair(artwork, imageContext)
  const { width, height } = getPrimaryMediaDimensions(artwork)
  const sizeTier = getSizeTier(artwork)
  const seriesSlug = resolveSeriesSlug(artwork) ?? 'default'
  const seriesColor = getSeriesColor(seriesSlug)
  const [failed, setFailed] = useState(false)
  const imageAlt = alt ?? resolveCatalogueImageAlt(artwork)

  const { displayWidth, displayHeight } = useArtworkDimensions({
    artworkContainerWidth,
    artworkContainerHeight,
    artworkSize: sizeTier,
    imageWidth: width,
    imageHeight: height,
    useImageFactors,
  })

  if (!imagePair) {
    return (
      <div
        className="artwork-placeholder"
        style={{
          width: displayWidth,
          height: displayHeight,
          backgroundColor: seriesColor,
        }}
      >
        <p>No image</p>
      </div>
    )
  }

  return (
    <div
      className="relative overflow-hidden"
      draggable={false}
      onDragStart={(event) => event.preventDefault()}
      style={{
        width: displayWidth,
        height: displayHeight,
        backgroundColor: seriesColor,
      }}
    >
      <ArtworkR2Image
        src={imagePair.src}
        // srcSet only on the LCP candidate — React 19 preloads every eager
        // imageSrcSet, which re-contended the first paint with five siblings.
        // Timeline srcSet uses 1x/2x (no sizes needed).
        srcSet={lcpCandidate ? imagePair.srcSet : undefined}
        fallbackSrc={imagePair.fallback}
        alt={imageAlt}
        width={displayWidth}
        height={displayHeight}
        draggable={false}
        className="h-full w-full object-contain"
        loading={priority || lcpCandidate ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={lcpCandidate ? 'high' : 'auto'}
        onLoad={onLoad}
        onError={() => setFailed(true)}
        style={{ opacity: failed ? 0 : 1 }}
      />
    </div>
  )
}
