import type { Payload, Where } from 'payload'

import { isPublicCatalogueSlug } from '@/lib/payload/publicSlug'
import type { Artist, Artwork, Series } from '@/payload-types'

const defaultLocale = 'en' as const
const PAGE_SIZE = 100

function publishedArtworkWhere(seriesSlug?: string | null): Where {
  const and: Where[] = [{ status: { equals: 'published' } }]

  const seriesFilter = seriesSlug?.trim()
  if (seriesFilter) {
    and.push({ 'series.slug': { equals: seriesFilter } })
  }

  return { and }
}

export async function fetchCorpusArtworks(
  payload: Payload,
  seriesSlug?: string | null,
): Promise<Artwork[]> {
  const where = publishedArtworkWhere(seriesSlug)
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

  return docs
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
