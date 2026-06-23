import { getPayload } from 'payload'
import config from '@payload-config'

import { withDbRetry } from '@/lib/payload/withDbRetry'
import type { Artwork, Event, Series } from '@/payload-types'

const FIXTURE_SLUG_PATTERN = '__%'

export function isPublicSitemapSlug(slug: string | null | undefined): boolean {
  const value = slug?.trim()
  if (!value) return false
  return !value.startsWith('__')
}

export type SitemapEntries = {
  artworks: Artwork[]
  series: Series[]
  events: Event[]
}

export async function fetchSitemapEntries(): Promise<SitemapEntries> {
  return withDbRetry(async () => {
    const payload = await getPayload({ config })

    const artworksResult = await payload.find({
      collection: 'artworks',
      where: {
        and: [
          { status: { equals: 'published' } },
          { slug: { not_like: FIXTURE_SLUG_PATTERN } },
        ],
      },
      limit: 1000,
      depth: 0,
      overrideAccess: true,
    })

    const seriesResult = await payload.find({
      collection: 'series',
      where: {
        and: [
          { status: { equals: 'published' } },
          { slug: { not_like: FIXTURE_SLUG_PATTERN } },
        ],
      },
      limit: 100,
      depth: 0,
      overrideAccess: true,
    })

    const eventsResult = await payload.find({
      collection: 'events',
      where: {
        and: [
          { status: { equals: 'published' } },
          { hasPage: { equals: true } },
          { slug: { not_like: FIXTURE_SLUG_PATTERN } },
        ],
      },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    })

    return {
      artworks: artworksResult.docs,
      series: seriesResult.docs,
      events: eventsResult.docs,
    }
  })
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
