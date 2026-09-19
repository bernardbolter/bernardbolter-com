import { resolveSeriesSlug } from '@/helpers/artworkCatalog'
import { getSeriesColor } from '@/helpers/seriesColor'
import { convertSizeForDisplay } from '@/helpers/convertUnits'
import { resolveMediumLabel } from '@/lib/artwork/mediumVocabulary'
import { truncateAtBoundary } from '@/lib/corpus/truncateAtBoundary'
import type { Artwork } from '@/payload-types'
import type { FilterCategory } from '@/types/frontend'

/** Minimum readable width of a flipped verso. Single source for CSS and layout. */
export const VERSO_MIN_WIDTH_PX = 320

const ALT_MAX_CHARS = 125

export type ArtworkDimensionLines = {
  primary: string
  secondary: string | null
}

export type SeriesDisplay = {
  slug: string
  name: string
  href: string
  color: string
}

function formatImperialDimension(whole?: number | null, fraction?: string | null): string {
  if (whole == null) return '0'
  const trimmedFraction = fraction?.trim()
  return trimmedFraction ? `${whole} ${trimmedFraction}` : String(whole)
}

function formatImperialDisplay(whole: string | null, fraction: string): string {
  if (!whole) return ''
  return fraction ? `${whole} ${fraction}"` : `${whole}"`
}

/** Same input ArtworkSize uses — catalogue rows fall through to mm when inches are unselected. */
export function getArtworkSizeInput(
  artwork: Pick<
    Artwork,
    | 'measurementType'
    | 'widthPx'
    | 'heightPx'
    | 'dimensionUnit'
    | 'widthWhole'
    | 'heightWhole'
    | 'widthFraction'
    | 'heightFraction'
    | 'widthMm'
    | 'heightMm'
  >,
): { width: string; height: string; units: string } | null {
  if (artwork.measurementType?.includes('digital') && artwork.widthPx && artwork.heightPx) {
    return {
      width: String(artwork.widthPx),
      height: String(artwork.heightPx),
      units: 'pixels',
    }
  }

  if (!artwork.measurementType?.includes('physical')) return null

  if (artwork.dimensionUnit === 'in' && artwork.widthWhole != null && artwork.heightWhole != null) {
    return {
      width: formatImperialDimension(artwork.widthWhole, artwork.widthFraction),
      height: formatImperialDimension(artwork.heightWhole, artwork.heightFraction),
      units: 'imperial',
    }
  }

  if (artwork.widthMm && artwork.heightMm) {
    return {
      width: String(artwork.widthMm / 10),
      height: String(artwork.heightMm / 10),
      units: 'metric',
    }
  }

  return null
}

/** Both units as visible strings. Absence when the work has no measurable size. */
export function formatArtworkDimensionLines(
  artwork: Parameters<typeof getArtworkSizeInput>[0],
): ArtworkDimensionLines | null {
  const input = getArtworkSizeInput(artwork)
  if (!input) return null

  const converted = convertSizeForDisplay(input.width, input.height, input.units)

  if (input.units === 'pixels') {
    if (!converted.widthPixels || !converted.heightPixels) return null
    return {
      primary: `${converted.widthPixels}px x ${converted.heightPixels}px`,
      secondary: null,
    }
  }

  const metric = `${converted.widthMetric} x ${converted.heightMetric}`
  const imperial = `${formatImperialDisplay(converted.widthImperialInches, converted.widthImperialFraction)} x ${formatImperialDisplay(converted.heightImperialInches, converted.heightImperialFraction)}`

  if (!converted.widthMetric || !converted.heightMetric) return null

  if (input.units === 'imperial') {
    return { primary: imperial, secondary: metric }
  }

  return { primary: metric, secondary: imperial }
}

export function resolveSeriesDisplay(
  artwork: Pick<Artwork, 'seriesSlug' | 'series'>,
  filterSeries: FilterCategory[],
): SeriesDisplay | null {
  const slug = resolveSeriesSlug(artwork)
  if (!slug) return null

  const named = filterSeries.find((series) => series.slug === slug)?.name?.trim()
  const name = named || slug.replaceAll('-', ' ')

  return {
    slug,
    name,
    href: `/series/${slug}`,
    color: getSeriesColor(slug),
  }
}

function firstVisionSentence(artwork: Pick<Artwork, 'visionAnalyses'>): string | null {
  const text = artwork.visionAnalyses?.[0]?.text?.trim()
  if (!text) return null
  const sentence = text.match(/^[^.!?]+[.!?]/)
  return (sentence ? sentence[0] : text).replace(/\s+/g, ' ').trim()
}

function identityLabelLine(
  artwork: Pick<Artwork, 'title' | 'yearCreated' | 'medium' | 'mediumOther'>,
): string {
  const title = artwork.title?.trim() || 'Artwork'
  const year = artwork.yearCreated ? String(artwork.yearCreated) : ''
  const medium = resolveMediumLabel(artwork as Artwork)
  return [title, year, medium].filter(Boolean).join(', ')
}

/**
 * Alt describes the picture. Title-only is not a description.
 * Source order: primaryImageAltText → first vision sentence → identity label line.
 */
export function resolveCatalogueImageAlt(
  artwork: Pick<
    Artwork,
    'title' | 'yearCreated' | 'medium' | 'mediumOther' | 'primaryImageAltText' | 'visionAnalyses'
  >,
): string {
  const explicit = artwork.primaryImageAltText?.trim()
  if (explicit) {
    return truncateAtBoundary(explicit, ALT_MAX_CHARS) ?? explicit.slice(0, ALT_MAX_CHARS)
  }

  const vision = firstVisionSentence(artwork)
  if (vision) {
    return truncateAtBoundary(vision, ALT_MAX_CHARS) ?? vision.slice(0, ALT_MAX_CHARS)
  }

  const label = identityLabelLine(artwork)
  return truncateAtBoundary(label, ALT_MAX_CHARS) ?? label
}

export function formatCoverageLine(totalCount: number, cataloguedCount: number): string {
  return `${totalCount} artworks · ${cataloguedCount} fully catalogued`
}
