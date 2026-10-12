'use client'

import { useEffect, useState, type ReactNode, type TransitionEvent } from 'react'

import ArtworkVerso from '@/components/artworks/ArtworkVerso'
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
  /** Keep preserve-3d mounted through the close animation, then drop it. */
  const [flip3d, setFlip3d] = useState(flipped)

  useEffect(() => {
    if (flipped) setFlip3d(true)
  }, [flipped])

  const onSceneTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.propertyName !== 'transform') return
    if (event.target !== event.currentTarget) return
    if (!flipped) setFlip3d(false)
  }

  return (
    <article
      className={`artwork-block${flipped ? ' is-flipped' : ''}${flip3d ? ' artwork-block--flip-3d' : ''}${
        allowFootprintBreak ? ' artwork-block--may-break-footprint' : ''
      }`}
      data-artwork-slug={artwork.slug}
    >
      <div className="artwork-block__scene" onTransitionEnd={onSceneTransitionEnd}>
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

        <div
          className="artwork-block__face artwork-block__face--back"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('a[href]')) return
            onToggleFlip()
          }}
          role="presentation"
        >
          <ArtworkVerso
            artwork={artwork}
            filterSeries={filterSeries}
            timelineMarkers={timelineMarkers}
            sessionDates={sessionDates}
            active={flipped}
          />
        </div>
      </div>
    </article>
  )
}
