import { getPayload, type Payload, type Where } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'

import type { Artwork, Media } from '@/payload-types'
import type {
  CatalogueClientMedia,
  CatalogueClientRow,
  CatalogueClientSeries,
  CatalogueClientVideoClip,
} from '@/types/frontend'
import { withDbRetry } from '@/lib/payload/withDbRetry'

const getPayloadInstance = async () => getPayload({ config })

/**
 * Fields required by the home grid, timeline, filters, verso, and Info menu.
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

export type LayoutProviderArtworks = CatalogueClientRow[]

function slimCatalogueMedia(value: unknown): CatalogueClientMedia | null {
  if (!value || typeof value !== 'object') return null
  const media = value as Media
  return {
    url: media.url ?? null,
    width: media.width ?? null,
    height: media.height ?? null,
  }
}

function slimCatalogueSeries(value: Artwork['series']): CatalogueClientRow['series'] {
  if (value == null) return value
  if (typeof value === 'number') return value
  if (typeof value !== 'object' || typeof value.id !== 'number') return null
  const slim: CatalogueClientSeries = {
    id: value.id,
    name: value.name,
    slug: value.slug,
  }
  return slim
}

function slimVideoClips(value: Artwork['videos']): CatalogueClientVideoClip[] | null {
  if (!value?.length) return null
  return value.map((clip) => ({
    videoRole: clip.videoRole ?? null,
    videoUrl: clip.videoUrl ?? null,
    videoFile: slimCatalogueMedia(clip.videoFile) ?? (typeof clip.videoFile === 'number' ? clip.videoFile : null),
  }))
}

/**
 * Map a Payload artwork doc to the slim client row.
 * Post-fetch (not denylist select) — same pattern as stripEmbeddings.
 */
export function toCatalogueClientRow(artwork: Artwork): CatalogueClientRow {
  return {
    id: artwork.id,
    slug: artwork.slug,
    title: artwork.title ?? null,
    series: slimCatalogueSeries(artwork.series),
    seriesSlug: artwork.seriesSlug ?? null,
    availabilityStatus: artwork.availabilityStatus ?? null,
    city: artwork.city ?? null,
    country: artwork.country ?? null,
    medium: artwork.medium ?? null,
    mediumOther: artwork.mediumOther ?? null,
    yearCreated: artwork.yearCreated ?? null,
    sortIndex: artwork.sortIndex ?? null,
    timelineDate: artwork.timelineDate ?? null,
    createdAt: artwork.createdAt,
    sizeTier: artwork.sizeTier ?? null,
    orientation: artwork.orientation ?? null,
    widthMm: artwork.widthMm ?? null,
    heightMm: artwork.heightMm ?? null,
    widthPx: artwork.widthPx ?? null,
    heightPx: artwork.heightPx ?? null,
    aspectRatio: artwork.aspectRatio ?? null,
    measurementType: artwork.measurementType ?? null,
    primaryImage: slimCatalogueMedia(artwork.primaryImage),
    posterImage: slimCatalogueMedia(artwork.posterImage),
    videoFile: slimCatalogueMedia(artwork.videoFile),
    videoUrl: artwork.videoUrl ?? null,
    videos: slimVideoClips(artwork.videos),
    descriptionShort: artwork.descriptionShort ?? null,
    intent: artwork.intent ?? null,
    primaryImageAltText: artwork.primaryImageAltText ?? null,
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

  return result.docs.map((doc) => toCatalogueClientRow(doc as Artwork))
}

async function fetchCatalogueArtworks(seriesSlug?: string): Promise<CatalogueClientRow[]> {
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
export async function getArtworks(seriesSlug?: string): Promise<CatalogueClientRow[]> {
  if (process.env.NODE_ENV === 'development') {
    return fetchCatalogueArtworks(seriesSlug)
  }
  return getCachedCatalogueArtworks(seriesSlug)
}
