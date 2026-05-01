'use client'

import { useMemo } from 'react'

// --- TYPES ---
type SizeKey = 'sm' | 'md' | 'lg' | 'xl'
type OrientationKey = 'portrait' | 'landscape' | 'square'

interface Dimensions {
  displayWidth: number
  displayHeight: number
}

interface UseArtworkDimensionsProps {
  imageWidth: number
  imageHeight: number
  artworkContainerWidth: number
  artworkContainerHeight: number
  artworkSize: string
  useImageFactors?: boolean
}

// --- FACTOR CONSTANTS ---
const SIZE_FACTORS = {
  common: {
    xl: 0.95,
    lg: 0.85,
    md: 0.75,
    sm: 0.65
  },
  square: {
    xl: 0.90,
    lg: 0.80,
    md: 0.70,
    sm: 0.60
  },
  imageCommon: {
    xl: 0.95,
    lg: 0.90,
    md: 0.85,
    sm: 0.80
  }
} as const

/**
 * Custom hook to calculate the display width and height of an artwork image or video poster
 * based on its orientation, size factor, and container dimensions.
 */
export const useArtworkDimensions = ({
  artworkContainerWidth,
  artworkContainerHeight,
  useImageFactors = false,
  imageWidth,
  imageHeight,
  artworkSize
}: UseArtworkDimensionsProps): Dimensions => {
  const FALLBACK_DIM = 800
  const FALLBACK_SIZE: SizeKey = 'lg'

  // Validate inputs
  const mediaWidth = Math.max(imageWidth || FALLBACK_DIM, 1)
  const mediaHeight = Math.max(imageHeight || FALLBACK_DIM, 1)
  const safeContainerWidth = Math.max(artworkContainerWidth || 0, 0)
  const safeContainerHeight = Math.max(artworkContainerHeight || 0, 0)
  const currentSize: SizeKey = (artworkSize in SIZE_FACTORS.common ? artworkSize : FALLBACK_SIZE) as SizeKey

  // Calculate aspect ratio and orientation
  const aspectRatio = mediaWidth / mediaHeight
  const currentOrientation: OrientationKey = aspectRatio > 1 ? 'landscape' : aspectRatio < 1 ? 'portrait' : 'square'

  // Select appropriate factor based on orientation and useImageFactors
  const factor = useImageFactors
    ? SIZE_FACTORS.imageCommon[currentSize]
    : currentOrientation === 'square'
      ? SIZE_FACTORS.square[currentSize]
      : SIZE_FACTORS.common[currentSize]

  return useMemo(() => {
    let maxW: number
    let maxH: number

    if (currentOrientation === 'square') {
      const minContainerDim = Math.min(safeContainerWidth, safeContainerHeight)
      maxW = minContainerDim * factor
      maxH = minContainerDim * factor
    } else {
      maxW = safeContainerWidth * factor
      maxH = safeContainerHeight * factor
    }

    // Scale to fit container while preserving aspect ratio
    let displayW = maxW
    let displayH = maxW / aspectRatio

    if (displayH > maxH) {
      displayH = maxH
      displayW = displayH * aspectRatio
    }

    if (displayW > safeContainerWidth) {
      displayW = safeContainerWidth
      displayH = displayW / aspectRatio
    }
    if (displayH > safeContainerHeight) {
      displayH = safeContainerHeight
      displayW = displayH * aspectRatio
    }

    // Round dimensions and ensure positive
    const displayWidth = Math.max(Math.round(displayW), 1)
    const displayHeight = Math.max(Math.round(displayH), 1)

    // Debug logging
    // console.log(`useArtworkDimensions: 
    //   container=${safeContainerWidth}x${safeContainerHeight}, 
    //   media=${mediaWidth}x${mediaHeight}, 
    //   orientation=${currentOrientation}, 
    //   size=${currentSize}, 
    //   factor=${factor}, 
    //   display=${displayWidth}x${displayHeight}`)

    return { displayWidth, displayHeight }
  }, [safeContainerWidth, safeContainerHeight, currentOrientation, factor, aspectRatio])
}