'use client'

import Link from 'next/link'
import type { CSSProperties } from 'react'

import ArtworkIdentityLabel from '@/components/artworks/ArtworkIdentityLabel'
import {
  OPEN_THE_RECORD_LABEL,
  formatCatalogueStatus,
  resolveSeriesDisplay,
  resolveVersoConnectorLinks,
  resolveVersoDescription,
} from '@/lib/artwork/catalogueIdentity'
import type { CatalogueClientRow, FilterCategory, TimelineMarkersData } from '@/types/frontend'

const CONNECTOR_GROUP_THROUGHLINES = 'Throughlines'
const CONNECTOR_GROUP_BIOGRAPHY = 'Biography'

type ConnectorLink = { href: string; label: string }

type ArtworkVersoProps = {
  artwork: CatalogueClientRow
  filterSeries: FilterCategory[]
  timelineMarkers: TimelineMarkersData
  sessionDates: string[]
  className?: string
  /** Extra attrs for the grid card. */
  style?: CSSProperties
  /** Grid selection dismisses on outside click via `[data-grid-card]`. */
  dataGridCard?: boolean
}

function ConnectorGroup({
  label,
  links,
  keyPrefix,
}: {
  label: string
  links: ConnectorLink[]
  keyPrefix: string
}) {
  if (links.length === 0) return null
  return (
    <div className="artwork-verso__connector-group">
      <p className="artwork-verso__connector-label">{label}</p>
      <ul className="artwork-verso__connector-list">
        {links.map((link) => (
          <li key={`${keyPrefix}-${link.href}`}>
            <Link href={link.href} className="artwork-verso__connector-link">
              <span className="artwork-verso__connector-mark" aria-hidden>
                –
              </span>
              <span className="artwork-verso__connector-text">{link.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
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
  const series = resolveSeriesDisplay(artwork, filterSeries)
  const hasConnectors = throughlineLinks.length > 0 || bioLinks.length > 0

  const rootStyle = {
    ...style,
    ...(series ? ({ ['--verso-series-color' as string]: series.color } as CSSProperties) : null),
  } as CSSProperties

  return (
    <div
      className={['artwork-verso', className].filter(Boolean).join(' ')}
      style={rootStyle}
      data-verso-tint={series ? 'series' : 'neutral'}
      {...(dataGridCard ? { 'data-grid-card': '' } : {})}
    >
      <div className="artwork-verso__card">
        <div className="artwork-verso__body">
          <div className="artwork-verso__body-inner">
            <h2 className="artwork-block__verso-title">{title}</h2>
            <ArtworkIdentityLabel
              artwork={artwork}
              filterSeries={filterSeries}
              includeTitle={false}
              className="artwork-block__verso-identity"
              renderSeriesAccent={(resolved) => (
                <span
                  className="artwork-identity__accent artwork-identity__accent--block"
                  style={{ backgroundColor: resolved.color }}
                  aria-hidden
                />
              )}
            />
            {description ? <p className="artwork-block__verso-description">{description}</p> : null}
            {hasConnectors ? (
              <div className="artwork-verso__connectors">
                <ConnectorGroup
                  label={CONNECTOR_GROUP_THROUGHLINES}
                  links={throughlineLinks}
                  keyPrefix="throughline"
                />
                <ConnectorGroup
                  label={CONNECTOR_GROUP_BIOGRAPHY}
                  links={bioLinks}
                  keyPrefix="bio"
                />
              </div>
            ) : null}
            <p className="artwork-block__verso-status">{status}</p>
          </div>
        </div>

        {/*
          Footer padding is the dead zone: clicks here stopPropagation so a
          near-miss on the bar neither flips the card nor navigates.
        */}
        <div className="artwork-verso__footer" onClick={(event) => event.stopPropagation()}>
          <Link href={recordHref} className="artwork-verso__record-bar">
            <span className="artwork-verso__record-bar-label">{OPEN_THE_RECORD_LABEL}</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
