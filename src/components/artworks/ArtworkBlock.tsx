'use client'

import type { ReactNode } from 'react'

import ArtworkIdentityLabel from '@/components/artworks/ArtworkIdentityLabel'
import ArtworkVerso from '@/components/artworks/ArtworkVerso'
import { VERSO_MIN_WIDTH_PX } from '@/lib/artwork/catalogueIdentity'
import type { CatalogueClientRow, FilterCategory, TimelineMarkersData } from '@/types/frontend'

type ArtworkBlockProps = {
  artwork: CatalogueClientRow
  filterSeries: FilterCategory[]
  timelineMarkers: TimelineMarkersData
  sessionDates: string[]
  flipped: boolean
  onToggleFlip: () => void
  image: ReactNode
  /** Mobile timeline may let the verso break the painting footprint. */
  allowFootprintBreak?: boolean
}

export default function ArtworkBlock({
  artwork,
  filterSeries,
  timelineMarkers,
  sessionDates,
  flipped,
  onToggleFlip,
  image,
  allowFootprintBreak = false,
}: ArtworkBlockProps) {
  const title = artwork.title?.trim() || artwork.slug

  return (
    <article
      className={`artwork-block${flipped ? ' is-flipped' : ''}${
        allowFootprintBreak ? ' artwork-block--may-break-footprint' : ''
      }`}
      style={{ ['--verso-min-width' as string]: `${VERSO_MIN_WIDTH_PX}px` }}
      data-artwork-slug={artwork.slug}
    >
      <div className="artwork-block__scene">
        <div className="artwork-block__face artwork-block__face--front">
          <button
            type="button"
            className="artwork-block__flip-surface"
            data-timeline-artwork-flip={artwork.slug}
            aria-pressed={flipped}
            aria-label={`Show details for ${title}`}
            onClick={(event) => event.preventDefault()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onToggleFlip()
              }
            }}
          >
            {image}
            <span className="artwork-block__flip-affordance">{`Details for ${title}`}</span>
          </button>
        </div>

        <div className="artwork-block__face artwork-block__face--back">
          <ArtworkVerso
            artwork={artwork}
            timelineMarkers={timelineMarkers}
            sessionDates={sessionDates}
          />
        </div>
      </div>

      <div className="artwork-block__label">
        <ArtworkIdentityLabel
          artwork={artwork}
          filterSeries={filterSeries}
          renderSeriesAccent={(series) => (
            <span
              className="artwork-identity__accent artwork-identity__accent--block"
              style={{ backgroundColor: series.color }}
              aria-hidden
            />
          )}
        />
      </div>
    </article>
  )
}
