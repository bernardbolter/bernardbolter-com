import { getPayload } from 'payload'
import config from '@payload-config'
import type { Where } from 'payload'

import { withDbRetry } from '@/lib/payload/withDbRetry'
import { shouldUseDbUnavailableFallback } from '@/lib/payload/buildSafeDb'
import { isPublicCatalogueSlug } from '@/lib/payload/publicSlug'
import type { Artwork, Event, Series } from '@/payload-types'

export function isPublicSitemapSlug(slug: string | null | undefined): boolean {
  return isPublicCatalogueSlug(slug)
}

export type SitemapEntries = {
  artworks: Artwork[]
  series: Series[]
  events: Event[]
}

const PAGE_SIZE = 100

async function paginatePublished<T extends { slug?: string | null }>(
  collection: 'artworks' | 'series' | 'events',
  where: Where,
): Promise<T[]> {
  const payload = await getPayload({ config })
  const docs: T[] = []
  let page = 1
  let hasNextPage = true

  while (hasNextPage) {
    const result = await payload.find({
      collection,
      where,
      limit: PAGE_SIZE,
      page,
      depth: 0,
      overrideAccess: true,
    })
    for (const doc of result.docs) {
      if (isPublicCatalogueSlug(doc.slug)) {
        docs.push(doc as unknown as T)
      }
    }
    hasNextPage = result.hasNextPage
    page += 1
  }

  return docs
}

export async function fetchSitemapEntries(): Promise<SitemapEntries> {
  try {
    return await withDbRetry(async () => {
      const [artworks, series, events] = await Promise.all([
        paginatePublished<Artwork>('artworks', { status: { equals: 'published' } }),
        paginatePublished<Series>('series', { status: { equals: 'published' } }),
        paginatePublished<Event>('events', {
          and: [{ status: { equals: 'published' } }, { hasPage: { equals: true } }],
        }),
      ])

      return { artworks, series, events }
    })
  } catch (err) {
    if (shouldUseDbUnavailableFallback(err)) {
      return { artworks: [], series: [], events: [] }
    }
    throw err
  }
}

/** @deprecated Use fetchSitemapEntries */
export async function getSitemapArtworks(): Promise<Artwork[]> {
  return (await fetchSitemapEntries()).artworks
}

/** @deprecated Use fetchSitemapEntries */
export async function getSitemapSeries(): Promise<Series[]> {
  return (await fetchSitemapEntries()).series
}

/** @deprecated Use fetchSitemapEntries */
export async function getSitemapEvents(): Promise<Event[]> {
  return (await fetchSitemapEntries()).events
}
