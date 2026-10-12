'use client'

import { useEffect, useMemo, type CSSProperties } from 'react'

import ArtworkGridImage from '@/components/artworks/ArtworkGridImage'
import { useHomepageFlip } from '@/components/artworks/homepageFlip'
import { getGridItemContainerSize } from '@/helpers/getGridItemContainerSize'
import { packArtworksIntoColumns } from '@/lib/artwork/gridLayout'
import { buildGridItemLayouts, GRID_SELECTION_SCALE } from '@/lib/artwork/gridRealSize'
import { useArtworks } from '@/providers/ArtworkProvider'

export default function ArtworksGrid() {
  const [state] = useArtworks()
  const { gridSelectedSlug, setGridSelectedSlug } = useHomepageFlip()
  const gridMetrics = getGridItemContainerSize(state.viewportWidth)

  const layouts = useMemo(
    () => buildGridItemLayouts(state.filtered, gridMetrics.width, state.archiveMedianAreaMm2),
    [state.filtered, gridMetrics.width, state.archiveMedianAreaMm2],
  )

  const columns = useMemo(
    () => packArtworksIntoColumns(layouts, gridMetrics.columns, gridMetrics.gap),
    [layouts, gridMetrics.columns, gridMetrics.gap],
  )

  useEffect(() => {
    if (!gridSelectedSlug) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      if (target.closest('[data-grid-card], [data-grid-selected]')) return
      setGridSelectedSlug(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [gridSelectedSlug, setGridSelectedSlug])

  return (
    <div
      className={`artwork-grid__container${gridSelectedSlug ? ' is-selecting' : ''}`}
      style={
        {
          gap: gridMetrics.gap,
          ['--grid-selection-scale' as string]: String(GRID_SELECTION_SCALE),
        } as CSSProperties
      }
      role="region"
      aria-label="Scrollable artwork grid"
      onClick={(event) => {
        if (event.target === event.currentTarget) setGridSelectedSlug(null)
      }}
    >
      {columns.map((column, columnIndex) => (
        <div
          key={columnIndex}
          className="artwork-grid__column"
          style={{ width: gridMetrics.width, gap: gridMetrics.gap }}
        >
          {column.map((layout, rowIndex) => (
            <ArtworkGridImage
              key={layout.artwork.id}
              layout={layout}
              priority={rowIndex === 0}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
