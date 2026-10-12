'use client'

import Link from 'next/link'
import type { CSSProperties } from 'react'

import {
  OPEN_THE_RECORD_LABEL,
  formatCatalogueStatus,
  resolveVersoConnectorLinks,
  resolveVersoDescription,
} from '@/lib/artwork/catalogueIdentity'
import type { CatalogueClientRow, TimelineMarkersData } from '@/types/frontend'

type ArtworkVersoProps = {
  artwork: CatalogueClientRow
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
        {OPEN_THE_RECORD_LABEL}
      </Link>
    </div>
  )
}
