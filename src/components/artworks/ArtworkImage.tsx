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
import { getSeriesColor } from '@/helpers/seriesColor'
import type { ArtworkImageContext } from '@/lib/media/artworkR2Images'
import type { Artwork } from '@/payload-types'

interface ArtworkImageProps {
  artwork: Artwork
  artworkContainerWidth: number
  artworkContainerHeight: number
  useImageFactors?: boolean
  priority?: boolean
  /** R2 derivative size — timeline/grid use 400w; artwork page uses 1200w. */
  imageContext?: ArtworkImageContext
  onLoad?: () => void
}

export default function ArtworkImage({
  artwork,
  artworkContainerWidth,
  artworkContainerHeight,
  useImageFactors = false,
  priority = false,
  imageContext = 'artwork-page',
  onLoad,
}: ArtworkImageProps) {
  const imagePair = getArtworkImagePair(artwork, imageContext)
  const { width, height } = getPrimaryMediaDimensions(artwork)
  const sizeTier = getSizeTier(artwork)
  const seriesSlug = resolveSeriesSlug(artwork) ?? 'default'
  const seriesColor = getSeriesColor(seriesSlug)
  const [failed, setFailed] = useState(false)

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
        fallbackSrc={imagePair.fallback}
        alt={artwork.title ?? 'Artwork'}
        draggable={false}
        className="h-full w-full object-contain"
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={onLoad}
        onError={() => setFailed(true)}
        style={{ opacity: failed ? 0 : 1 }}
      />
    </div>
  )
}
