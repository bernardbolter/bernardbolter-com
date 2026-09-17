'use client'

import { useState, type SyntheticEvent } from 'react'

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
import { normalizeOrientation } from '@/utilities/artworkSizeDisplay'

interface ArtworkImageProps {
  artwork: Artwork
  artworkContainerWidth: number
  artworkContainerHeight: number
  useImageFactors?: boolean
  priority?: boolean
  /** R2 derivative — grid/similar 400w, timeline/slideshow/artwork page 800w, vision 1200w. */
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
  const inferred = getPrimaryMediaDimensions(artwork)
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null)
  const { width, height } = naturalSize ?? inferred
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
    orientation: normalizeOrientation(artwork.orientation),
  })

  const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      setNaturalSize((prev) => {
        if (prev && prev.width === img.naturalWidth && prev.height === img.naturalHeight) {
          return prev
        }
        return { width: img.naturalWidth, height: img.naturalHeight }
      })
    }
    onLoad?.()
  }

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
        onLoad={handleLoad}
        onError={() => setFailed(true)}
        style={{ opacity: failed ? 0 : 1 }}
      />
    </div>
  )
}
