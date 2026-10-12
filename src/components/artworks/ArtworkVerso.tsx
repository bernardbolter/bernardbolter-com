'use client'

import Link from 'next/link'
import type { CSSProperties } from 'react'

import ArtworkIdentityLabel from '@/components/artworks/ArtworkIdentityLabel'
import {
  OPEN_THE_RECORD_LABEL,
  formatCatalogueStatus,
  resolveVersoConnectorLinks,
  resolveVersoDescription,
} from '@/lib/artwork/catalogueIdentity'
import type { CatalogueClientRow, FilterCategory, TimelineMarkersData } from '@/types/frontend'

type ArtworkVersoProps = {
  artwork: CatalogueClientRow
  filterSeries: FilterCategory[]
  timelineMarkers: TimelineMarkersData
  sessionDates: string[]
  className?: string
  /** Extra attrs for the grid card (series accent border). */
  style?: CSSProperties
  /** Grid selection dismisses on outside click via `[data-grid-card]`. */
  dataGridCard?: boolean
}

export default function ArtworkVerso({
  artwork,
  filterSeries,
  timelineMarkers,
  sessionDates,
  className,
  style,
  dataGridCard = false,
}: ArtworkVersoProps) {
  const title = artwork.title?.trim() || artwork.slug
  const recordHref = `/${artwork.slug}`
  const description = resolveVersoDescription(artwork)
  const status = formatCatalogueStatus(sessionDates)
  const throughlineLinks = resolveVersoConnectorLinks(artwork.id, timelineMarkers.throughlines)
  const bioLinks = resolveVersoConnectorLinks(artwork.id, timelineMarkers.bioEntries)

  return (
    <div
      className={className}
      style={style}
      {...(dataGridCard ? { 'data-grid-card': '' } : {})}
    >
      <h2 className="artwork-block__verso-title">{title}</h2>
      <ArtworkIdentityLabel
        artwork={artwork}
        filterSeries={filterSeries}
        includeTitle={false}
        className="artwork-block__verso-identity"
        renderSeriesAccent={(series) => (
          <span
            className="artwork-identity__accent artwork-identity__accent--block"
            style={{ backgroundColor: series.color }}
            aria-hidden
          />
        )}
      />
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
      <Link
        href={recordHref}
        className="artwork-block__record-link"
        onClick={(event) => event.stopPropagation()}
      >
        {OPEN_THE_RECORD_LABEL}
      </Link>
    </div>
  )
}
