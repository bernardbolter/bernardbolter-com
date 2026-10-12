'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

import {
  formatArtworkDimensionLines,
  resolveSeriesDisplay,
  type SeriesDisplay,
} from '@/lib/artwork/catalogueIdentity'
import { resolveMediumLabel } from '@/lib/artwork/mediumVocabulary'
import type { CatalogueClientRow, FilterCategory } from '@/types/frontend'

export type ArtworkIdentityLabelProps = {
  artwork: CatalogueClientRow
  filterSeries: FilterCategory[]
  className?: string
  /**
   * Surface paints the series colour control. Only called when series resolves —
   * never invent a colour for a work without a series.
   */
  renderSeriesAccent?: (series: SeriesDisplay) => ReactNode
  /**
   * `series-line` — accent sits on the series row (timeline block, title overlay).
   * `leading` — accent sits before the whole field stack (grid caption).
   */
  seriesAccentPlacement?: 'series-line' | 'leading'
}

/**
 * Shared identity fields — one markup source for timeline, grid, and focused title.
 * Field order: title → year → medium → dimensions → series.
 * Empty year/medium/dimensions/series are omitted; title falls back to slug.
 */
export default function ArtworkIdentityLabel({
  artwork,
  filterSeries,
  className,
  renderSeriesAccent,
  seriesAccentPlacement = 'series-line',
}: ArtworkIdentityLabelProps) {
  const title = artwork.title?.trim() || artwork.slug
  const year = artwork.yearCreated ? String(artwork.yearCreated) : ''
  const medium = resolveMediumLabel(artwork)
  const dimensions = formatArtworkDimensionLines(artwork)
  const series = resolveSeriesDisplay(artwork, filterSeries)
  const recordHref = `/${artwork.slug}`
  const accent = series && renderSeriesAccent ? renderSeriesAccent(series) : null

  return (
    <div className={['artwork-identity', className].filter(Boolean).join(' ')}>
      {seriesAccentPlacement === 'leading' ? accent : null}
      <div className="artwork-identity__fields">
        <p className="artwork-identity__title">
          <Link href={recordHref}>{title}</Link>
        </p>
        {year ? <p className="artwork-identity__year">{year}</p> : null}
        {medium ? <p className="artwork-identity__medium">{medium}</p> : null}
        {dimensions ? (
          <p className="artwork-identity__dimensions">
            <span>{dimensions.primary}</span>
            {dimensions.secondary ? (
              <span className="artwork-identity__dimensions-converted">{dimensions.secondary}</span>
            ) : null}
          </p>
        ) : null}
        {series ? (
          <p className="artwork-identity__series">
            {seriesAccentPlacement === 'series-line' ? accent : null}
            <Link href={series.href} className="artwork-identity__series-name">
              {series.name}
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  )
}
