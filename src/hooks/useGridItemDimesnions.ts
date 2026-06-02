// hooks/useGridItemDimensions.ts

import { useMemo } from 'react'
import { getPrimaryMediaDimensions } from '@/helpers/artworkCatalog'
import type { Artwork } from '@/payload-types'

interface Dimensions {
  displayWidth: number
  displayHeight: number
}

interface UseGridItemDimensionsProps {
  artwork: Artwork
  /** The calculated width of a single grid column, derived from the main ArtworksGrid component. */
  columnWidth: number
}

/**
 * Display width/height for masonry grid cells (aspect ratio from Payload media or widthPx/heightPx).
 */
export const useGridItemDimensions = ({
  artwork,
  columnWidth,
}: UseGridItemDimensionsProps): Dimensions => {
  return useMemo(() => {
    const { width: originalWidth, height: originalHeight } = getPrimaryMediaDimensions(artwork)
    const aspectRatio = originalWidth / originalHeight
    const displayWidth = columnWidth
    const displayHeight = displayWidth / aspectRatio

    return {
      displayWidth: Math.round(displayWidth),
      displayHeight: Math.round(displayHeight),
    }
  }, [artwork, columnWidth])
}
