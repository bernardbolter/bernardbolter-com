import type { GridItemLayout } from '@/lib/artwork/gridRealSize'

export type { GridItemLayout } from '@/lib/artwork/gridRealSize'

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
 * Shortest-column masonry — every item occupies exactly one column slot.
 */
export function packArtworksIntoColumns(
  layouts: GridItemLayout[],
  columnCount: number,
  gap: number,
): GridItemLayout[][] {
  const columns: GridItemLayout[][] = Array.from({ length: columnCount }, () => [])
  const columnHeights = new Array<number>(columnCount).fill(0)

  for (const layout of layouts) {
    const columnIndex = indexOfShortestColumn(columnHeights)
    columns[columnIndex].push(layout)
    columnHeights[columnIndex] += layout.contentHeight + gap
  }

  return columns
}
