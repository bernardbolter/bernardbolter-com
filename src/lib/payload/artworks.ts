import { getPayload, type Payload, type Where } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'

import type { Artwork, Media, Series } from '@/payload-types'
import { withDbRetry } from '@/lib/payload/withDbRetry'

const getPayloadInstance = async () => getPayload({ config })

/**
 * Fields required by the home grid, timeline, filters, and Info menu slug lookup.
 * Omits status / yearCompleted / dateDisplay (fetched for where/recompute only —
 * never read by catalogue UI). Media relations are slimmed post-fetch.
 */
const CATALOGUE_ARTWORK_SELECT = {
  id: true,
  slug: true,
  title: true,
  series: true,
  seriesSlug: true,
  sizeTier: true,
  orientation: true,
  primaryImage: true,
  posterImage: true,
  videoFile: true,
  videoUrl: true,
  videos: true,
  availabilityStatus: true,
  yearCreated: true,
  city: true,
  country: true,
  medium: true,
  mediumOther: true,
  sortIndex: true,
  timelineDate: true,
  dateCreated: true,
  createdAt: true,
  widthPx: true,
  heightPx: true,
  widthMm: true,
  heightMm: true,
  aspectRatio: true,
  measurementType: true,
  descriptionShort: true,
  intent: true,
  primaryImageAltText: true,
} as const

export type LayoutProviderArtworks = Artwork[]

/** Catalogue consumers only need url/width/height (alt uses primaryImageAltText). */
type CatalogueMediaSlim = Pick<Media, 'url' | 'width' | 'height'>
type CatalogueSeriesSlim = Pick<Series, 'id' | 'name' | 'slug'>

function slimCatalogueMedia(value: Artwork['primaryImage']): CatalogueMediaSlim | null {
  if (!value || typeof value !== 'object') return null
  return {
    url: value.url ?? null,
    width: value.width ?? null,
    height: value.height ?? null,
  }
}

function slimCatalogueSeries(value: Artwork['series']): Artwork['series'] {
  if (value == null || typeof value !== 'object') return value
  if (typeof value.id !== 'number') return value
  const slim: CatalogueSeriesSlim = {
    id: value.id,
    name: value.name,
    slug: value.slug,
  }
  return slim as Artwork['series']
}

/**
 * Drop Media metadata that is never read by grid/timeline/slideshow.
 * Post-fetch (not denylist select) — same pattern as stripEmbeddings /
 * stripCreatorLinkedArtworkDocs. Nested allowlist on uploads is unused
 * here so we keep the artwork-level select flat and safe.
 */
function shapeCatalogueArtwork(artwork: Artwork): Artwork {
  return {
    ...artwork,
    series: slimCatalogueSeries(artwork.series),
    primaryImage: slimCatalogueMedia(artwork.primaryImage) as Artwork['primaryImage'],
    posterImage: slimCatalogueMedia(artwork.posterImage) as Artwork['posterImage'],
  }
}

export async function fetchCatalogueArtworksWithPayload(
  payload: Payload,
  seriesSlug?: string,
): Promise<LayoutProviderArtworks> {
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

  return result.docs.map((doc) => shapeCatalogueArtwork(doc as Artwork))
}

async function fetchCatalogueArtworks(seriesSlug?: string): Promise<Artwork[]> {
  return withDbRetry(async () => {
    const payload = await getPayloadInstance()
    return fetchCatalogueArtworksWithPayload(payload, seriesSlug)
  })
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
