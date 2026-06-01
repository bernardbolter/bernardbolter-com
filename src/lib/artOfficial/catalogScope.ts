import type { CatalogField, CareerStage } from './fieldCatalog'
import { isFieldExpectedAtCareerStage } from './fieldCatalog'
import type { SeriesRecord } from './seriesSlugs'
import { isSlugDescendantOf } from './seriesSlugs'

export const ACH_ROOT_SERIES_SLUG = 'a-colorful-history'
export const DCS_ROOT_SERIES_SLUG = 'digital-city-series'
export const MEGACITIES_ROOT_SERIES_SLUG = 'megacities'

export type CatalogSeriesScope = 'ach' | 'dcs' | 'megacities'
export type CatalogMediumScope = 'physical'

export interface ArtworkCoverageContext {
  seriesSlug?: string | null
  medium?: string | null
  measurementTypes?: string[]
  seriesRecords?: SeriesRecord[]
}

type TimelineEntryLike = {
  targetCollection?: string
  field?: string
  value?: unknown
  timestamp?: string
}

function latestTimelineEntry(
  timeline: unknown,
  field: string,
): TimelineEntryLike | undefined {
  if (!Array.isArray(timeline)) return undefined

  let latest: TimelineEntryLike | undefined
  for (const raw of timeline) {
    if (!raw || typeof raw !== 'object') continue
    const entry = raw as TimelineEntryLike
    if (entry.targetCollection && entry.targetCollection !== 'artworks') continue
    if (entry.field !== field) continue

    if (!latest) {
      latest = entry
      continue
    }
    const existingTs = latest.timestamp ? Date.parse(latest.timestamp) : 0
    const nextTs = entry.timestamp ? Date.parse(entry.timestamp) : 0
    if (nextTs >= existingTs) latest = entry
  }
  return latest
}

function readSeriesSlugFromValue(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed && !/^\d+$/.test(trimmed)) return trimmed
  }
  if (value && typeof value === 'object' && 'slug' in value) {
    const slug = (value as { slug?: unknown }).slug
    if (typeof slug === 'string' && slug.trim()) return slug.trim()
  }
  return null
}

export function resolveArtworkSeriesSlug(
  artwork: Record<string, unknown> | null,
  timeline?: unknown,
): string | null {
  if (artwork) {
    if (typeof artwork.seriesSlug === 'string' && artwork.seriesSlug.trim()) {
      return artwork.seriesSlug.trim()
    }
    const fromSeries = readSeriesSlugFromValue(artwork.series)
    if (fromSeries) return fromSeries
  }

  const staged = latestTimelineEntry(timeline, 'series')
  return readSeriesSlugFromValue(staged?.value)
}

function resolveMedium(
  artwork: Record<string, unknown> | null,
  timeline?: unknown,
): string | null {
  if (artwork && typeof artwork.medium === 'string' && artwork.medium.trim()) {
    return artwork.medium.trim()
  }
  const staged = latestTimelineEntry(timeline, 'medium')
  return typeof staged?.value === 'string' && staged.value.trim() ? staged.value.trim() : null
}

function resolveMeasurementTypes(
  artwork: Record<string, unknown> | null,
  timeline?: unknown,
): string[] {
  const fromArtwork = artwork?.measurementType
  if (Array.isArray(fromArtwork)) {
    return fromArtwork.map(String).filter(Boolean)
  }

  const staged = latestTimelineEntry(timeline, 'measurementType')
  if (Array.isArray(staged?.value)) {
    return staged.value.map(String).filter(Boolean)
  }
  if (typeof staged?.value === 'string' && staged.value.trim()) {
    return [staged.value.trim()]
  }
  return []
}

export function buildArtworkCoverageContext(args: {
  artwork: Record<string, unknown> | null
  timeline?: unknown
  seriesRecords?: SeriesRecord[]
}): ArtworkCoverageContext {
  return {
    seriesSlug: resolveArtworkSeriesSlug(args.artwork, args.timeline),
    medium: resolveMedium(args.artwork, args.timeline),
    measurementTypes: resolveMeasurementTypes(args.artwork, args.timeline),
    seriesRecords: args.seriesRecords,
  }
}

export function seriesScopeForField(
  field: CatalogField,
): CatalogSeriesScope | undefined {
  if (field.seriesScope) return field.seriesScope
  if (field.field.startsWith('ach.')) return 'ach'
  if (field.field.startsWith('dcs.')) return 'dcs'
  if (field.field.startsWith('megacities.')) return 'megacities'
  return undefined
}

export function artworkMatchesAchSeries(ctx: ArtworkCoverageContext): boolean {
  const slug = ctx.seriesSlug
  if (!slug) return false
  if (slug === ACH_ROOT_SERIES_SLUG) return true
  if (ctx.seriesRecords?.length) {
    return isSlugDescendantOf(ctx.seriesRecords, slug, ACH_ROOT_SERIES_SLUG)
  }
  return false
}

export function artworkMatchesDcsSeries(ctx: ArtworkCoverageContext): boolean {
  return ctx.seriesSlug === DCS_ROOT_SERIES_SLUG
}

export function artworkMatchesMegacitiesSeries(ctx: ArtworkCoverageContext): boolean {
  return ctx.seriesSlug === MEGACITIES_ROOT_SERIES_SLUG
}

/** True when the work is a physical object (vs digital / time-based file). */
export function artworkIsPhysical(ctx: ArtworkCoverageContext): boolean {
  const medium = ctx.medium?.toLowerCase() ?? ''

  // DCS / Megacities primary output is a digital composite or photo collage — not a sculptural object.
  if (artworkMatchesDcsSeries(ctx) || artworkMatchesMegacitiesSeries(ctx)) {
    if (medium === 'digital' || medium === 'video') return false
    if (
      !medium ||
      medium === 'mixed-media-on-canvas' ||
      medium === 'photo-collage' ||
      medium === 'other'
    ) {
      return false
    }
  }

  const types = ctx.measurementTypes ?? []
  if (types.length > 0) {
    if (types.includes('physical') && !types.includes('digital') && !types.includes('time-based')) {
      return true
    }
    if (types.includes('digital') && !types.includes('physical')) return false
    if (types.includes('time-based') && !types.includes('physical')) return false
  }

  if (medium === 'digital' || medium === 'video') return false

  return true
}

export function isFieldExpectedForArtwork(
  field: CatalogField,
  careerStage: CareerStage,
  ctx: ArtworkCoverageContext,
): boolean {
  if (!isFieldExpectedAtCareerStage(field.tier, careerStage)) return false

  const seriesScope = seriesScopeForField(field)
  if (seriesScope) {
    if (!ctx.seriesSlug) return false
    if (seriesScope === 'ach' && !artworkMatchesAchSeries(ctx)) return false
    if (seriesScope === 'dcs' && !artworkMatchesDcsSeries(ctx)) return false
    if (seriesScope === 'megacities' && !artworkMatchesMegacitiesSeries(ctx)) return false
  }

  if (field.mediumScope === 'physical' && !artworkIsPhysical(ctx)) return false

  return true
}
