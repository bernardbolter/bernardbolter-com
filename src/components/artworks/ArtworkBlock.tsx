'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

import {
  VERSO_MIN_WIDTH_PX,
  formatArtworkDimensionLines,
  formatCatalogueStatus,
  resolveSeriesDisplay,
  resolveVersoConnectorLinks,
  resolveVersoDescription,
  type SeriesDisplay,
} from '@/lib/artwork/catalogueIdentity'
import { resolveMediumLabel } from '@/lib/artwork/mediumVocabulary'
import type { Artwork } from '@/payload-types'
import type { FilterCategory, TimelineMarkersData } from '@/types/frontend'

type ArtworkBlockProps = {
  artwork: Artwork
  filterSeries: FilterCategory[]
  timelineMarkers: TimelineMarkersData
  sessionDates: string[]
  flipped: boolean
  onToggleFlip: () => void
  image: ReactNode
  /** Mobile timeline may let the verso break the painting footprint. */
  allowFootprintBreak?: boolean
}

function SeriesLine({ series }: { series: SeriesDisplay }) {
  return (
    <p className="artwork-block__series">
      <span
        className="artwork-block__series-dot"
        style={{ backgroundColor: series.color }}
        aria-hidden
      />
      <Link href={series.href} className="artwork-block__series-name">
        {series.name}
      </Link>
    </p>
  )
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
  const year = artwork.yearCreated ? String(artwork.yearCreated) : ''
  const medium = resolveMediumLabel(artwork)
  const dimensions = formatArtworkDimensionLines(artwork)
  const series = resolveSeriesDisplay(artwork, filterSeries)
  const recordHref = `/${artwork.slug}`
  const description = resolveVersoDescription(artwork)
  const status = formatCatalogueStatus(sessionDates)
  const throughlineLinks = resolveVersoConnectorLinks(artwork.id, timelineMarkers.throughlines)
  const bioLinks = resolveVersoConnectorLinks(artwork.id, timelineMarkers.bioEntries)

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
          <h2 className="artwork-block__verso-title">{title}</h2>
          {description ? <p className="artwork-block__verso-description">{description}</p> : null}
          {throughlineLinks.length > 0 || bioLinks.length > 0 ? (
            <ul className="artwork-block__verso-links">
              {throughlineLinks.map((link) => (
                <li key={`throughline-${link.href}`}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
              {bioLinks.map((link) => (
                <li key={`bio-${link.href}`}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="artwork-block__verso-status">{status}</p>
          <Link href={recordHref} className="artwork-block__record-link">
            Open the record
          </Link>
        </div>
      </div>

      <div className="artwork-block__label">
        <p className="artwork-block__title">
          <Link href={recordHref}>{title}</Link>
        </p>
        {year ? <p className="artwork-block__year">{year}</p> : null}
        {medium ? <p className="artwork-block__medium">{medium}</p> : null}
        {dimensions ? (
          <p className="artwork-block__dimensions">
            <span>{dimensions.primary}</span>
            {dimensions.secondary ? (
              <span className="artwork-block__dimensions-converted">{dimensions.secondary}</span>
            ) : null}
          </p>
        ) : null}
        {series ? <SeriesLine series={series} /> : null}
      </div>
    </article>
  )
}
