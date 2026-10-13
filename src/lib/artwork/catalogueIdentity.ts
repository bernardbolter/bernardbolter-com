import { resolveSeriesSlug } from '@/helpers/artworkCatalog'
import { getSeriesColor } from '@/helpers/seriesColor'
import { convertSizeForDisplay } from '@/helpers/convertUnits'
import { resolveMediumLabel } from '@/lib/artwork/mediumVocabulary'
import { truncateAtBoundary } from '@/lib/corpus/truncateAtBoundary'
import type { Artwork } from '@/payload-types'
import type { FilterCategory } from '@/types/frontend'

/** Minimum readable width of a flipped verso. Single source for CSS and layout. */
export const VERSO_MIN_WIDTH_PX = 320

/** Record CTA on timeline/grid verso — single string for the bottom bar. */
export const OPEN_THE_RECORD_LABEL = 'See the whole painting →'

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

type SizeInputFields = {
  measurementType?: Artwork['measurementType'] | null
  widthPx?: number | null
  heightPx?: number | null
  dimensionUnit?: Artwork['dimensionUnit'] | null
  widthWhole?: number | null
  heightWhole?: number | null
  widthFraction?: string | null
  heightFraction?: string | null
  widthMm?: number | null
  heightMm?: number | null
}

/** Same input ArtworkSize uses — catalogue rows fall through to mm when inches are unselected. */
export function getArtworkSizeInput(
  artwork: SizeInputFields,
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
  artwork: SizeInputFields,
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
  artwork: {
    seriesSlug?: string | null
    series?: { slug?: string | null; name?: string | null } | number | null
  },
  filterSeries: FilterCategory[],
): SeriesDisplay | null {
  const slug = resolveSeriesSlug(artwork)
  if (!slug) return null

  const fromRelation =
    artwork.series && typeof artwork.series === 'object' ? artwork.series.name?.trim() : null
  const named = filterSeries.find((series) => series.slug === slug)?.name?.trim()
  const name = fromRelation || named || slug.replaceAll('-', ' ')

  return {
    slug,
    name,
    href: `/series/${slug}`,
    color: getSeriesColor(slug),
  }
}

/** descriptionShort, else intent, else nothing. Never a sliced vision sentence. */
export function resolveVersoDescription(
  artwork: Pick<Artwork, 'descriptionShort' | 'intent'>,
): string | null {
  const short = artwork.descriptionShort?.replace(/\s+/g, ' ').trim()
  if (short) return short
  const intent = artwork.intent?.replace(/\s+/g, ' ').trim()
  return intent || null
}

const SHORT_LABEL_MAX_WORDS = 6

function wordCount(value: string): number {
  return value.split(/\s+/).filter(Boolean).length
}

/**
 * Display label for a throughline or bio entry link.
 * Order: shortTitle → claim text if already short (≤6 words) → omit.
 * Never humanise a slug.
 */
export function resolveConnectorCardLabel(entry: {
  text: string
  shortTitle?: string | null
  slug?: string | null
}): string | null {
  const shortTitle = entry.shortTitle?.replace(/\s+/g, ' ').trim()
  if (shortTitle) return shortTitle

  const text = entry.text.replace(/\s+/g, ' ').trim()
  if (text && wordCount(text) <= SHORT_LABEL_MAX_WORDS) return text

  return null
}

export type VersoConnectorLink = {
  href: string
  label: string
}

export type VersoConnector = {
  id: string
  kind: 'throughline' | 'bio'
  href: string
  label: string
  /** Full claim / entry text — SSR'd into the chip overlay. */
  claim: string
  linkedArtworkIds: number[]
}

export function resolveVersoConnectors(
  artworkId: number,
  kind: 'throughline' | 'bio',
  entries: Array<{
    id: string
    text: string
    shortTitle?: string | null
    permalinkHref: string | null
    linkedArtworkIds: number[]
  }>,
): VersoConnector[] {
  const connectors: VersoConnector[] = []
  for (const entry of entries) {
    if (!entry.linkedArtworkIds.includes(artworkId)) continue
    if (!entry.permalinkHref) continue
    const claim = entry.text.replace(/\s+/g, ' ').trim()
    if (!claim) continue
    const label = resolveConnectorCardLabel({
      text: claim,
      shortTitle: entry.shortTitle,
    })
    if (!label) continue
    connectors.push({
      id: `${kind}:${entry.id}`,
      kind,
      href: entry.permalinkHref,
      label,
      claim,
      linkedArtworkIds: entry.linkedArtworkIds,
    })
  }
  return connectors
}

export function resolveVersoConnectorLinks(
  artworkId: number,
  entries: Array<{
    text: string
    shortTitle?: string | null
    permalinkHref: string | null
    linkedArtworkIds: number[]
  }>,
): VersoConnectorLink[] {
  const links: VersoConnectorLink[] = []
  for (const entry of entries) {
    if (!entry.linkedArtworkIds.includes(artworkId)) continue
    if (!entry.permalinkHref) continue
    const label = resolveConnectorCardLabel({
      text: entry.text,
      shortTitle: entry.shortTitle,
    })
    if (!label) continue
    links.push({ href: entry.permalinkHref, label })
  }
  return links
}

function formatCataloguedMonthYear(date: Date): string {
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/**
 * Public verso status from completed primary-artwork session dates.
 * Callers must pass only sessions with messages.length > 0 — a zero-message
 * completed shell is not a cataloguing event.
 */
export function formatCatalogueStatus(isoDates: string[]): string {
  const dates = isoDates
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())

  if (dates.length === 0) return 'Not yet catalogued'
  if (dates.length === 1) return `Catalogued ${formatCataloguedMonthYear(dates[0]!)}`
  return `Last catalogued ${formatCataloguedMonthYear(dates[dates.length - 1]!)}`
}

function firstVisionSentence(artwork: Pick<Artwork, 'visionAnalyses'>): string | null {
  const text = artwork.visionAnalyses?.[0]?.text?.trim()
  if (!text) return null
  const sentence = text.match(/^[^.!?]+[.!?]/)
  return (sentence ? sentence[0] : text).replace(/\s+/g, ' ').trim()
}

function identityLabelLine(artwork: {
  title?: string | null
  yearCreated?: number | null
  medium?: Artwork['medium'] | null
  mediumOther?: string | null
}): string {
  const title = artwork.title?.trim() || 'Artwork'
  const year = artwork.yearCreated ? String(artwork.yearCreated) : ''
  const medium = resolveMediumLabel(artwork)
  return [title, year, medium].filter(Boolean).join(', ')
}

/**
 * Alt describes the picture. Title-only is not a description.
 * Source order: primaryImageAltText → first vision sentence → identity label line.
 */
export function resolveCatalogueImageAlt(artwork: {
  title?: string | null
  yearCreated?: number | null
  medium?: Artwork['medium'] | null
  mediumOther?: string | null
  primaryImageAltText?: string | null
  visionAnalyses?: Artwork['visionAnalyses']
}): string {
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
