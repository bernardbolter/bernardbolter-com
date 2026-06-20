'use client'

import { useMemo } from 'react'

import ArtworkGridImage from '@/components/artworks/ArtworkGridImage'
import { getGridItemContainerSize } from '@/helpers/getGridItemContainerSize'
import { packArtworksIntoColumns } from '@/lib/artwork/gridLayout'
import { buildGridItemLayouts } from '@/lib/artwork/gridRealSize'
import { useArtworks } from '@/providers/ArtworkProvider'

export default function ArtworksGrid() {
  const [state] = useArtworks()
  const gridMetrics = getGridItemContainerSize(state.viewportWidth)

  const layouts = useMemo(
    () => buildGridItemLayouts(state.filtered, gridMetrics.width),
    [state.filtered, gridMetrics.width],
  )

  const columns = useMemo(
    () => packArtworksIntoColumns(layouts, gridMetrics.columns, gridMetrics.gap),
    [layouts, gridMetrics.columns, gridMetrics.gap],
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
          {column.map((layout) => (
            <ArtworkGridImage key={layout.artwork.id} layout={layout} />
          ))}
        </div>
      ))}
    </div>
  )
}
