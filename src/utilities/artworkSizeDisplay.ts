import type { Artwork } from '@/payload-types'
import type { ArtworkSizeTier } from '@/types/frontend'

export type ArtworkOrientation = 'portrait' | 'landscape' | 'square'

export type ArtworkDisplayDimensions = {
  displayWidth: number
  displayHeight: number
}

export type CalculateArtworkDisplaySizeInput = {
  imageWidth: number
  imageHeight: number
  containerWidth: number
  containerHeight: number
  sizeTier: string
  useImageFactors?: boolean
  /** When set, used instead of deriving orientation from image dimensions. */
  orientation?: ArtworkOrientation | null
}

const DEFAULT_MEDIA_DIMENSION = 800
const DEFAULT_SIZE_TIER: ArtworkSizeTier = 'lg'

const SIZE_FACTORS = {
  common: {
    xl: 0.95,
    lg: 0.85,
    md: 0.75,
    sm: 0.65,
  },
  square: {
    xl: 0.9,
    lg: 0.8,
    md: 0.7,
    sm: 0.6,
  },
  imageCommon: {
    xl: 0.95,
    lg: 0.9,
    md: 0.85,
    sm: 0.8,
  },
} as const

export const SIZE_TIER_LABELS: Record<ArtworkSizeTier, string> = {
  sm: 'Small',
  md: 'Medium',
  lg: 'Large',
  xl: 'Large-scale',
}

export function normalizeSizeTier(sizeTier: string | null | undefined): ArtworkSizeTier {
  if (sizeTier === 'sm' || sizeTier === 'md' || sizeTier === 'lg' || sizeTier === 'xl') {
    return sizeTier
  }
  return DEFAULT_SIZE_TIER
}

export function resolveOrientationFromDimensions(
  width: number,
  height: number,
): ArtworkOrientation {
  const mediaWidth = Math.max(width || DEFAULT_MEDIA_DIMENSION, 1)
  const mediaHeight = Math.max(height || DEFAULT_MEDIA_DIMENSION, 1)
  const aspectRatio = mediaWidth / mediaHeight
  if (aspectRatio > 1) return 'landscape'
  if (aspectRatio < 1) return 'portrait'
  return 'square'
}

export function normalizeOrientation(
  orientation: string | null | undefined,
): ArtworkOrientation | null {
  if (orientation === 'portrait' || orientation === 'landscape' || orientation === 'square') {
    return orientation
  }
  return null
}

export function resolveArtworkOrientation(
  artwork: Pick<Artwork, 'orientation'>,
  mediaWidth: number,
  mediaHeight: number,
): ArtworkOrientation {
  return (
    normalizeOrientation(artwork.orientation) ??
    resolveOrientationFromDimensions(mediaWidth, mediaHeight)
  )
}

export function getSizeFactor(
  sizeTier: ArtworkSizeTier,
  orientation: ArtworkOrientation,
  useImageFactors = false,
): number {
  if (useImageFactors) {
    return SIZE_FACTORS.imageCommon[sizeTier]
  }
  if (orientation === 'square') {
    return SIZE_FACTORS.square[sizeTier]
  }
  return SIZE_FACTORS.common[sizeTier]
}

export function sizeTierLabel(sizeTier: string | null | undefined): string {
  return SIZE_TIER_LABELS[normalizeSizeTier(sizeTier)]
}

/**
 * Compute centred display width/height for an artwork image or video poster.
 * Preserves aspect ratio; never normalises to fill the viewport.
 */
export function calculateArtworkDisplaySize(
  input: CalculateArtworkDisplaySizeInput,
): ArtworkDisplayDimensions {
  const mediaWidth = Math.max(input.imageWidth || DEFAULT_MEDIA_DIMENSION, 1)
  const mediaHeight = Math.max(input.imageHeight || DEFAULT_MEDIA_DIMENSION, 1)
  const containerWidth = Math.max(input.containerWidth || 0, 0)
  const containerHeight = Math.max(input.containerHeight || 0, 0)
  const sizeTier = normalizeSizeTier(input.sizeTier)
  const aspectRatio = mediaWidth / mediaHeight
  const orientation =
    input.orientation ?? resolveOrientationFromDimensions(mediaWidth, mediaHeight)
  const factor = getSizeFactor(sizeTier, orientation, input.useImageFactors)

  let maxW: number
  let maxH: number

  if (orientation === 'square') {
    const minContainerDim = Math.min(containerWidth, containerHeight)
    maxW = minContainerDim * factor
    maxH = minContainerDim * factor
  } else {
    maxW = containerWidth * factor
    maxH = containerHeight * factor
  }

  let displayW = maxW
  let displayH = maxW / aspectRatio

  if (displayH > maxH) {
    displayH = maxH
    displayW = displayH * aspectRatio
  }

  if (displayW > containerWidth) {
    displayW = containerWidth
    displayH = displayW / aspectRatio
  }
  if (displayH > containerHeight) {
    displayH = containerHeight
    displayW = displayH * aspectRatio
  }

  return {
    displayWidth: Math.max(Math.round(displayW), 1),
    displayHeight: Math.max(Math.round(displayH), 1),
  }
}
