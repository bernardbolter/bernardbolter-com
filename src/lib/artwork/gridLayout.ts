import { getPrimaryMediaDimensions, getSizeTier } from '@/helpers/artworkCatalog'
import type { CatalogueArtwork } from '@/types/frontend'
import {
  calculateArtworkDisplaySize,
  resolveArtworkOrientation,
  GRID_SPAN_ASPECT_RATIO_THRESHOLD,
  type ArtworkDisplayDimensions,
} from '@/utilities/artworkSizeDisplay'

/** space-3 caption padding (8px) + single-line title row (~18px). */
export const GRID_CAPTION_BLOCK_HEIGHT_PX = 26

export type GridColumnSpan = 1 | 2

export type GridItemLayout = {
  artwork: CatalogueArtwork
  columnSpan: GridColumnSpan
  dimensions: ArtworkDisplayDimensions
  contentHeight: number
}

export type PackedGridCell =
  | { type: 'artwork'; layout: GridItemLayout }
  | { type: 'span-spacer'; height: number }

export function resolveGridColumnSpan(aspectRatio: number, columnCount: number): GridColumnSpan {
  if (columnCount < 3) return 1
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) return 1
  return aspectRatio >= GRID_SPAN_ASPECT_RATIO_THRESHOLD ? 2 : 1
}

export function gridItemContainerWidth(
  columnWidth: number,
  gap: number,
  columnSpan: GridColumnSpan,
): number {
  if (columnSpan === 2) {
    return columnWidth * 2 + gap
  }
  return columnWidth
}

export function calculateGridItemLayout(
  artwork: CatalogueArtwork,
  columnWidth: number,
  gap: number,
  columnSpan: GridColumnSpan,
): GridItemLayout {
  const { width: imageWidth, height: imageHeight } = getPrimaryMediaDimensions(artwork)
  const aspectRatio = imageWidth / imageHeight
  const orientation = resolveArtworkOrientation(artwork, imageWidth, imageHeight)
  const containerWidth = gridItemContainerWidth(columnWidth, gap, columnSpan)

  const dimensions = calculateArtworkDisplaySize({
    imageWidth,
    imageHeight,
    containerWidth,
    containerHeight: containerWidth,
    sizeTier: getSizeTier(artwork),
    useImageFactors: false,
    orientation,
    gridView: false,
  })

  return {
    artwork,
    columnSpan,
    dimensions,
    contentHeight: dimensions.displayHeight + GRID_CAPTION_BLOCK_HEIGHT_PX,
  }
}

function indexOfShortestColumn(heights: number[]): number {
  let minIndex = 0
  for (let i = 1; i < heights.length; i++) {
    if (heights[i] < heights[minIndex]) {
      minIndex = i
    }
  }
  return minIndex
}

/**
 * Shortest-column masonry with optional 2-column spans at 3+ columns.
 * Spanning items get a height-matched spacer in the adjacent column.
 */
export function packArtworksIntoColumns(
  artworks: CatalogueArtwork[],
  columnCount: number,
  columnWidth: number,
  gap: number,
): PackedGridCell[][] {
  const columns: PackedGridCell[][] = Array.from({ length: columnCount }, () => [])
  const columnHeights = new Array<number>(columnCount).fill(0)

  for (const artwork of artworks) {
    const { width, height } = getPrimaryMediaDimensions(artwork)
    const aspectRatio = width / Math.max(height, 1)
    const columnSpan = resolveGridColumnSpan(aspectRatio, columnCount)
    const layout = calculateGridItemLayout(artwork, columnWidth, gap, columnSpan)
    const blockHeight = layout.contentHeight + gap

    if (columnSpan === 1) {
      const columnIndex = indexOfShortestColumn(columnHeights)
      columns[columnIndex].push({ type: 'artwork', layout })
      columnHeights[columnIndex] += blockHeight
      continue
    }

    let bestPair = 0
    let bestStartHeight = Number.POSITIVE_INFINITY
    for (let i = 0; i < columnCount - 1; i++) {
      const startHeight = Math.max(columnHeights[i], columnHeights[i + 1])
      if (startHeight < bestStartHeight) {
        bestStartHeight = startHeight
        bestPair = i
      }
    }

    columns[bestPair].push({ type: 'artwork', layout })
    columns[bestPair + 1].push({ type: 'span-spacer', height: layout.contentHeight })
    const nextHeight = bestStartHeight + blockHeight
    columnHeights[bestPair] = nextHeight
    columnHeights[bestPair + 1] = nextHeight
  }

  return columns
}
