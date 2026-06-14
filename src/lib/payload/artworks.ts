import { getPayload, type Where } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'

import type { Artwork } from '@/payload-types'

const getPayloadInstance = async () => getPayload({ config })

/** Fields required by the home grid, timeline, filters, and Info menu slug lookup. */
const CATALOGUE_ARTWORK_SELECT = {
  id: true,
  slug: true,
  title: true,
  status: true,
  seriesSlug: true,
  series: true,
  sizeTier: true,
  orientation: true,
  primaryImage: true,
  posterImage: true,
  videoFile: true,
  videoUrl: true,
  videos: true,
  availabilityStatus: true,
  yearCreated: true,
  yearCompleted: true,
  city: true,
  country: true,
  medium: true,
  mediumOther: true,
  sortIndex: true,
  timelineDate: true,
  dateDisplay: true,
  dateCreated: true,
  createdAt: true,
  widthPx: true,
  heightPx: true,
} as const

async function fetchCatalogueArtworks(seriesSlug?: string): Promise<Artwork[]> {
  const payload = await getPayloadInstance()

  const where: Where = seriesSlug
    ? {
        and: [
          { status: { equals: 'published' } },
          { 'series.slug': { equals: seriesSlug } },
        ],
      }
    : { status: { equals: 'published' } }

  const result = await payload.find({
    collection: 'artworks',
    where,
    sort: '-yearCreated',
    depth: 1,
    limit: 500,
    select: CATALOGUE_ARTWORK_SELECT,
    overrideAccess: false,
  })

  return result.docs as Artwork[]
}

const getCachedCatalogueArtworks = unstable_cache(
  fetchCatalogueArtworks,
  ['artworks-catalogue'],
  {
    revalidate: 3600,
    tags: ['artworks'],
  },
)

/** Published catalogue rows for layout provider (grid / timeline / filters). */
export async function getArtworks(seriesSlug?: string): Promise<Artwork[]> {
  if (process.env.NODE_ENV === 'development') {
    return fetchCatalogueArtworks(seriesSlug)
  }
  return getCachedCatalogueArtworks(seriesSlug)
}
