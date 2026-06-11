'use client'

import { useMemo } from 'react'

import {
  calculateArtworkDisplaySize,
  type ArtworkDisplayDimensions,
} from '@/utilities/artworkSizeDisplay'

interface UseArtworkDimensionsProps {
  imageWidth: number
  imageHeight: number
  artworkContainerWidth: number
  artworkContainerHeight: number
  artworkSize: string
  useImageFactors?: boolean
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
      }),
    [
      artworkContainerWidth,
      artworkContainerHeight,
      useImageFactors,
      imageWidth,
      imageHeight,
      artworkSize,
    ],
  )
}
