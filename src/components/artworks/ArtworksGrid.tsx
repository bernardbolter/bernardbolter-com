'use client'

import { useMemo } from 'react'

import ArtworkGridImage from '@/components/artworks/ArtworkGridImage'
import { getGridItemContainerSize } from '@/helpers/getGridItemContainerSize'
import { packArtworksIntoColumns } from '@/lib/artwork/gridLayout'
import { useArtworks } from '@/providers/ArtworkProvider'

export default function ArtworksGrid() {
  const [state] = useArtworks()
  const gridMetrics = getGridItemContainerSize(state.viewportWidth)

  const columns = useMemo(
    () =>
      packArtworksIntoColumns(
        state.filtered,
        gridMetrics.columns,
        gridMetrics.width,
        gridMetrics.gap,
      ),
    [state.filtered, gridMetrics.columns, gridMetrics.gap, gridMetrics.width],
  )

  return (
    <div
      className="artwork-grid__container"
      style={{ gap: gridMetrics.gap }}
      role="region"
      aria-label="Scrollable artwork grid"
    >
      {columns.map((column, columnIndex) => (
        <div
          key={columnIndex}
          className="artwork-grid__column"
          style={{ width: gridMetrics.width, gap: gridMetrics.gap }}
        >
          {column.map((cell, cellIndex) => {
            if (cell.type === 'span-spacer') {
              return (
                <div
                  key={`spacer-${columnIndex}-${cellIndex}`}
                  className="artwork-grid__span-spacer"
                  style={{ height: cell.height }}
                  aria-hidden
                />
              )
            }

            return (
              <ArtworkGridImage
                key={cell.layout.artwork.id}
                artwork={cell.layout.artwork}
                columnWidth={gridMetrics.width}
                gap={gridMetrics.gap}
                columnSpan={cell.layout.columnSpan}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
