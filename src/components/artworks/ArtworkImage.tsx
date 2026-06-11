'use client'

import Image from 'next/image'

import { useArtworkDimensions } from '@/hooks/useArtworkDimensions'
import {
  getDisplayImageUrl,
  getPrimaryMediaDimensions,
  getSizeTier,
  resolveSeriesSlug,
} from '@/helpers/artworkCatalog'
import { seriesColorBlurDataURLs } from '@/helpers/blurURLs'
import { getSeriesColor } from '@/helpers/seriesColor'
import type { Artwork } from '@/payload-types'

interface ArtworkImageProps {
  artwork: Artwork
  artworkContainerWidth: number
  artworkContainerHeight: number
  useImageFactors?: boolean
  priority?: boolean
  onLoad?: () => void
}

export default function ArtworkImage({
  artwork,
  artworkContainerWidth,
  artworkContainerHeight,
  useImageFactors = false,
  priority = false,
  onLoad,
}: ArtworkImageProps) {
  const imageUrl = getDisplayImageUrl(artwork)
  const { width, height } = getPrimaryMediaDimensions(artwork)
  const sizeTier = getSizeTier(artwork)
  const seriesSlug = resolveSeriesSlug(artwork) ?? 'default'
  const seriesColor = getSeriesColor(seriesSlug)
  const blurDataURL = seriesColorBlurDataURLs[seriesSlug] ?? seriesColorBlurDataURLs.default

  const { displayWidth, displayHeight } = useArtworkDimensions({
    artworkContainerWidth,
    artworkContainerHeight,
    artworkSize: sizeTier,
    imageWidth: width,
    imageHeight: height,
    useImageFactors,
  })

  if (!imageUrl) {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          width: displayWidth,
          height: displayHeight,
          backgroundColor: seriesColor,
        }}
      >
        <span className="font-heading text-sm text-surface-page">No image</span>
      </div>
    )
  }

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: displayWidth,
        height: displayHeight,
        backgroundColor: seriesColor,
      }}
    >
      <Image
        src={imageUrl}
        alt={artwork.title ?? 'Artwork'}
        width={displayWidth}
        height={displayHeight}
        className="h-full w-full object-contain"
        placeholder="blur"
        blurDataURL={blurDataURL}
        priority={priority}
        sizes={`(max-width: 48rem) 100vw, ${Math.round(displayWidth)}px`}
        onLoad={onLoad}
      />
    </div>
  )
}
