import { getPayload, type Payload, type Where } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'

import type { Artwork, Media } from '@/payload-types'
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
  seriesSlug: true,
  sizeTier: true,
  orientation: true,
  primaryImage: true,
  posterImage: true,
  videoFile: true,
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
} as const

export type LayoutProviderArtworks = Artwork[]

const CHROME_ARTWORK_SELECT = {
  slug: true,
  seriesSlug: true,
  widthMm: true,
  heightMm: true,
  sizeTier: true,
} as const

/** Catalogue consumers only need url/width/height (alt uses artwork.title). */
type CatalogueMediaSlim = Pick<Media, 'url' | 'width' | 'height'>

function slimCatalogueMedia(
  value: Artwork['primaryImage'],
): CatalogueMediaSlim | number | null {
  if (typeof value === 'number') return value
  if (!value || typeof value !== 'object') return null
  return {
    url: value.url ?? null,
    width: value.width ?? null,
    height: value.height ?? null,
  }
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
    // Depth 0: primaryImage stays an id. Depth 1 pulls full Media rows
    // (embeddings included) over SSH and stalls the homepage for ~60s.
    depth: 0,
    joins: false,
    limit: 500,
    select: CATALOGUE_ARTWORK_SELECT,
    overrideAccess: false,
  })

  return result.docs.map((doc) => shapeCatalogueArtwork(doc as Artwork))
}

/** Depth-0 slug/size rows for menu colour + grid scale — not the image catalogue. */
export async function fetchChromeArtworkSummaryWithPayload(
  payload: Payload,
): Promise<LayoutProviderArtworks> {
  const result = await payload.find({
    collection: 'artworks',
    where: { status: { equals: 'published' } },
    sort: '-yearCreated',
    depth: 0,
    limit: 500,
    select: CHROME_ARTWORK_SELECT,
    overrideAccess: false,
  })

  return result.docs as Artwork[]
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
