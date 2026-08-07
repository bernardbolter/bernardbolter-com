import type { Payload, Where } from 'payload'

import {
  type CorpusIndexFilters,
} from '@/lib/corpus/corpusIndexFilters'
import { isPublicCatalogueSlug } from '@/lib/payload/publicSlug'
import type { Artist, Artwork, Series } from '@/payload-types'

const defaultLocale = 'en' as const
const PAGE_SIZE = 200

/**
 * Fields required by buildCorpusRecord (Tier 1 + Tier 2) and resolveGist / computeAvailableTiers.
 * depth:1 populates `series` (slug, name, description) only — no deeper chains.
 */
const CORPUS_ARTWORK_SELECT = {
  slug: true,
  title: true,
  status: true,
  yearCreated: true,
  medium: true,
  catalogueNumber: true,
  catalogueSequence: true,
  reasoningStatus: true,
  series: true,
  descriptionShort: true,
  intent: true,
  visionAnalyses: true,
  dominantColors: true,
  conceptualKeywords: true,
  movementTags: true,
  styleTags: true,
  subjectTags: true,
  genreTags: true,
  periodTags: true,
  updatedAt: true,
} as const

function publishedArtworkWhere(filters: CorpusIndexFilters = {}): Where {
  const and: Where[] = [{ status: { equals: 'published' } }]

  const seriesFilter = filters.series?.trim()
  if (seriesFilter) {
    and.push({ 'series.slug': { equals: seriesFilter } })
  }

  if (filters.yearFrom != null) {
    and.push({ yearCreated: { greater_than_equal: filters.yearFrom } })
  }
  if (filters.yearTo != null) {
    and.push({ yearCreated: { less_than_equal: filters.yearTo } })
  }
  if (filters.status) {
    and.push({ reasoningStatus: { equals: filters.status } })
  }

  return { and }
}

function artworkHasVisionAnalyses(artwork: Artwork): boolean {
  return (artwork.visionAnalyses ?? []).some(
    (row) => Boolean(row?.text?.trim() && row.model?.trim() && row.date?.trim()),
  )
}

export async function fetchCorpusArtworks(
  payload: Payload,
  seriesSlugOrFilters?: string | null | CorpusIndexFilters,
): Promise<Artwork[]> {
  const filters: CorpusIndexFilters =
    typeof seriesSlugOrFilters === 'string' || seriesSlugOrFilters == null
      ? { series: seriesSlugOrFilters }
      : seriesSlugOrFilters

  const where = publishedArtworkWhere(filters)
  const docs: Artwork[] = []
  let page = 1
  let hasNextPage = true

  while (hasNextPage) {
    const result = await payload.find({
      collection: 'artworks',
      locale: defaultLocale,
      where,
      limit: PAGE_SIZE,
      page,
      depth: 1,
      sort: 'catalogueSequence',
      select: CORPUS_ARTWORK_SELECT,
      overrideAccess: true,
    })

    docs.push(...(result.docs.filter((doc) => isPublicCatalogueSlug(doc.slug)) as unknown as Artwork[]))
    hasNextPage = result.hasNextPage
    page += 1
  }

  if (filters.hasVisionAnalyses == null) return docs
  return docs.filter((artwork) => {
    const has = artworkHasVisionAnalyses(artwork)
    return filters.hasVisionAnalyses ? has : !has
  })
}

/**
 * Published public-catalogue artwork count (unfiltered).
 * Uses a fast limit:1 count query and reads totalDocs from the result.
 * Note: `__`-prefixed slugs are excluded application-side; they are
 * negligible in count and this is used only for display metadata.
 */
export async function fetchCorpusTotalArtworks(payload: Payload): Promise<number> {
  const result = await payload.find({
    collection: 'artworks',
    locale: defaultLocale,
    where: { status: { equals: 'published' } },
    limit: 1,
    page: 1,
    depth: 0,
    select: { slug: true },
    overrideAccess: true,
  })
  return result.totalDocs
}

export async function fetchCorpusSeries(payload: Payload): Promise<Series[]> {
  const result = await payload.find({
    collection: 'series',
    locale: defaultLocale,
    where: { status: { equals: 'published' } },
    limit: 100,
    depth: 0,
    sort: 'yearStart',
    overrideAccess: true,
  })

  return result.docs.filter((doc) => isPublicCatalogueSlug(doc.slug))
}

export async function fetchCorpusArtist(payload: Payload): Promise<Artist | null> {
  const result = await payload.find({
    collection: 'artists',
    locale: defaultLocale,
    limit: 1,
    depth: 0,
    sort: 'id',
    overrideAccess: true,
  })

  return result.docs[0] ?? null
}

/**
 * Allowlisted artist fields for reciprocal throughline/bio reverse lookups.
 * depth 0 keeps linkedArtworkSlugs as numeric IDs — enough to match artwork.id.
 */
export async function fetchCorpusArtistForReciprocalLinks(
  payload: Payload,
): Promise<Artist | null> {
  const result = await payload.find({
    collection: 'artists',
    locale: defaultLocale,
    limit: 1,
    depth: 0,
    sort: 'id',
    select: {
      bioTimelineEntries: true,
      statementThroughlines: true,
    },
    overrideAccess: true,
  })

  return (result.docs[0] as Artist | undefined) ?? null
}
