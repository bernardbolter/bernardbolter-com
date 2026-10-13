'use client'

import { useEffect, useState, type ReactNode, type TransitionEvent } from 'react'

import ArtworkVerso from '@/components/artworks/ArtworkVerso'
import { RotateFlipSvg } from '@/components/icons'
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
  /** Hover peel — same single-slot 3D mount, small rotateY only. */
  const [peeling, setPeeling] = useState(false)

  useEffect(() => {
    if (flipped) {
      setFlip3d(true)
      setPeeling(false)
    }
  }, [flipped])

  useEffect(() => {
    if (flipped) return
    const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onMotion = () => {
      if (motionMq.matches) setPeeling(false)
    }
    onMotion()
    motionMq.addEventListener('change', onMotion)
    return () => motionMq.removeEventListener('change', onMotion)
  }, [flipped])

  const onSceneTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.propertyName !== 'transform') return
    if (event.target !== event.currentTarget) return
    if (!flipped && !peeling) setFlip3d(false)
  }

  const mount3d = flip3d || peeling

  const onPeelEnter = () => {
    if (flipped) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    setPeeling(true)
    setFlip3d(true)
  }

  const onPeelLeave = () => {
    if (flipped) return
    setPeeling(false)
  }

  return (
    <article
      className={`artwork-block${flipped ? ' is-flipped' : ''}${peeling && !flipped ? ' is-peeling' : ''}${
        mount3d ? ' artwork-block--flip-3d' : ''
      }${allowFootprintBreak ? ' artwork-block--may-break-footprint' : ''}`}
      data-artwork-slug={artwork.slug}
    >
      <div className="artwork-block__scene" onTransitionEnd={onSceneTransitionEnd}>
        <div className="artwork-block__face artwork-block__face--front">
          <button
            type="button"
            className="artwork-block__flip-surface"
            data-timeline-artwork-flip={artwork.slug}
            aria-pressed={flipped}
            aria-label={`Details for ${title}`}
            onClick={(event) => event.preventDefault()}
            onMouseEnter={onPeelEnter}
            onMouseLeave={onPeelLeave}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onToggleFlip()
              }
            }}
          >
            {image}
            <span className="artwork-block__flip-icon" aria-hidden>
              <RotateFlipSvg />
            </span>
          </button>
        </div>

        <div
          className="artwork-block__face artwork-block__face--back"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('a[href]')) return
            if ((event.target as HTMLElement).closest('[data-verso-page-nav]')) return
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
