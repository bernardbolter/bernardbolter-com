'use client'

import { useMemo } from 'react'

import {
  calculateArtworkDisplaySize,
  type ArtworkDisplayDimensions,
  type ArtworkOrientation,
} from '@/utilities/artworkSizeDisplay'

interface UseArtworkDimensionsProps {
  imageWidth: number
  imageHeight: number
  artworkContainerWidth: number
  artworkContainerHeight: number
  artworkSize: string
  useImageFactors?: boolean
  orientation?: ArtworkOrientation | null
  gridView?: boolean
}

/**
 * Client hook wrapping `calculateArtworkDisplaySize` for responsive container sizing.
 */
export const useArtworkDimensions = ({
  artworkContainerWidth,
  artworkContainerHeight,
  useImageFactors = false,
  imageWidth,
  imageHeight,
  artworkSize,
  orientation,
  gridView = false,
}: UseArtworkDimensionsProps): ArtworkDisplayDimensions => {
  return useMemo(
    () =>
      calculateArtworkDisplaySize({
        imageWidth,
        imageHeight,
        containerWidth: artworkContainerWidth,
        containerHeight: artworkContainerHeight,
        sizeTier: artworkSize,
        useImageFactors,
        orientation,
        gridView,
      }),
    [
      artworkContainerWidth,
      artworkContainerHeight,
      useImageFactors,
      imageWidth,
      imageHeight,
      artworkSize,
      orientation,
      gridView,
    ],
  )
}
