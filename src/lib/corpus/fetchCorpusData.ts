import type { Payload, Where } from 'payload'

import {
  type CorpusIndexFilters,
} from '@/lib/corpus/corpusIndexFilters'
import { isPublicCatalogueSlug } from '@/lib/payload/publicSlug'
import type { Artist, Artwork, Series } from '@/payload-types'

const defaultLocale = 'en' as const
const PAGE_SIZE = 100

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
      depth: 3,
      sort: 'catalogueSequence',
      overrideAccess: true,
    })

    docs.push(...result.docs.filter((doc) => isPublicCatalogueSlug(doc.slug)))
    hasNextPage = result.hasNextPage
    page += 1
  }

  if (filters.hasVisionAnalyses == null) return docs
  return docs.filter((artwork) => {
    const has = artworkHasVisionAnalyses(artwork)
    return filters.hasVisionAnalyses ? has : !has
  })
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
