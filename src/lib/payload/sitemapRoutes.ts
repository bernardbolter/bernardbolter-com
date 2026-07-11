import { getPayload } from 'payload'
import config from '@payload-config'

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

export async function fetchSitemapEntries(): Promise<SitemapEntries> {
  try {
    return await withDbRetry(async () => {
      const payload = await getPayload({ config })

      const artworksResult = await payload.find({
        collection: 'artworks',
        where: { status: { equals: 'published' } },
        limit: 1000,
        depth: 0,
        overrideAccess: true,
      })

      const seriesResult = await payload.find({
        collection: 'series',
        where: { status: { equals: 'published' } },
        limit: 100,
        depth: 0,
        overrideAccess: true,
      })

      const eventsResult = await payload.find({
        collection: 'events',
        where: {
          and: [{ status: { equals: 'published' } }, { hasPage: { equals: true } }],
        },
        limit: 500,
        depth: 0,
        overrideAccess: true,
      })

      return {
        artworks: artworksResult.docs.filter((doc) => isPublicCatalogueSlug(doc.slug)),
        series: seriesResult.docs.filter((doc) => isPublicCatalogueSlug(doc.slug)),
        events: eventsResult.docs.filter((doc) => isPublicCatalogueSlug(doc.slug)),
      }
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
