import type { ReactNode } from 'react'

import ArtworkDimensionsRow from '@/components/artwork/ArtworkDimensionsRow'
import { resolveSeriesSlug } from '@/helpers/artworkCatalog'
import { getSeriesColor } from '@/helpers/seriesColor'
import { resolveMediumLabel } from '@/lib/artwork/mediumVocabulary'
import { resolveArtworkTopLevelSeries } from '@/lib/artwork/resolveTopLevelSeries'
import {
  formatArtworkYearRange,
  isDigitalOnlyMeasurement,
  resolveEditionTypeLabel,
  resolveFramingLabel,
  resolveScaleLabel,
  resolveSupportLabel,
  resolveWorkStateLabel,
} from '@/lib/artwork/artworkLabels'
import type { Artwork } from '@/payload-types'

type Props = {
  artwork: Artwork
}

function RecordRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="artwork-page__row">
      <div className="artwork-page__label">{label}</div>
      <div>{children}</div>
    </div>
  )
}

function madeInLabel(artwork: Artwork): string | null {
  const city = artwork.locationCreated?.city?.trim()
  if (!city) return null
  const country = artwork.locationCreated?.country?.trim()
  if (!country || country === 'Germany') return city
  return `${city}, ${country}`
}

export default function Layer1ObjectRecord({ artwork }: Props) {
  const topSeries = resolveArtworkTopLevelSeries(artwork.series)
  const seriesSlug = resolveSeriesSlug(artwork) ?? topSeries?.slug
  const seriesColor = seriesSlug ? getSeriesColor(seriesSlug) : '#999'
  const showFraming = !isDigitalOnlyMeasurement(artwork.measurementType)
  const madeIn = madeInLabel(artwork)

  return (
    <section className="artwork-page__layer artwork-page__layer--object-record">
      <div className="artwork-page__inner">
        <div className="artwork-page__grid-2">
          <div>
            <RecordRow label="Medium">{resolveMediumLabel(artwork)}</RecordRow>
            {resolveSupportLabel(artwork) ? (
              <RecordRow label="Support">{resolveSupportLabel(artwork)}</RecordRow>
            ) : null}
            <RecordRow label="Dimensions">
              <ArtworkDimensionsRow artwork={artwork} />
            </RecordRow>
            <RecordRow label="Scale">{resolveScaleLabel(artwork)}</RecordRow>
            {showFraming && resolveFramingLabel(artwork.framing) ? (
              <RecordRow label="Framing">{resolveFramingLabel(artwork.framing)}</RecordRow>
            ) : null}
          </div>
          <div>
            {artwork.altTitle?.trim() ? (
              <RecordRow label="Also known as">{artwork.altTitle.trim()}</RecordRow>
            ) : null}
            <RecordRow label="Year">{formatArtworkYearRange(artwork)}</RecordRow>
            {madeIn ? <RecordRow label="Made in">{madeIn}</RecordRow> : null}
            {topSeries ? (
              <RecordRow label="Series">
                <span className="inline-flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: seriesColor }}
                  />
                  {topSeries.name}
                </span>
              </RecordRow>
            ) : null}
            {resolveEditionTypeLabel(artwork.editionType) ? (
              <RecordRow label="Edition">{resolveEditionTypeLabel(artwork.editionType)}</RecordRow>
            ) : null}
            {resolveWorkStateLabel(artwork.workState) ? (
              <RecordRow label="Work state">{resolveWorkStateLabel(artwork.workState)}</RecordRow>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
