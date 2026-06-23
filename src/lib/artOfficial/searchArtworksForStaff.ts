import type { Payload } from 'payload'

import type { User } from '@/payload-types'

export type ArtworkSearchDoc = {
  id: number
  title: string | null
  slug: string | null
  yearCreated: number | null
  seriesTitle: string | null
  thumbnailUrl: string | null
}

function readSeriesName(series: unknown): string | null {
  if (!series || typeof series !== 'object') return null
  const name = (series as { name?: unknown }).name
  return typeof name === 'string' && name.trim() ? name : null
}

function mapArtworkDoc(artwork: {
  id: number
  title?: string | null
  slug?: string | null
  yearCreated?: number | null
  series?: unknown
  primaryImage?: unknown
}): ArtworkSearchDoc {
  return {
    id: artwork.id,
    title: artwork.title ?? null,
    slug: artwork.slug ?? null,
    yearCreated: artwork.yearCreated ?? null,
    seriesTitle: readSeriesName(artwork.series),
    thumbnailUrl:
      typeof artwork.primaryImage === 'object' && artwork.primaryImage !== null
        ? ((artwork.primaryImage as { url?: string }).url ?? null)
        : null,
  }
}

export async function searchArtworksForStaff(args: {
  payload: Payload
  user: User
  q?: string
  artworkId?: number
  limit?: number
}): Promise<ArtworkSearchDoc[]> {
  const limit = Math.min(args.limit ?? 12, 50)
  const q = args.q?.trim() ?? ''
  const artworkId = args.artworkId

  if (Number.isFinite(artworkId)) {
    const result = await args.payload.find({
      collection: 'artworks',
      locale: 'en',
      fallbackLocale: 'en',
      where: { id: { equals: artworkId } },
      limit: 1,
      depth: 1,
      overrideAccess: true,
      user: args.user,
      select: {
        id: true,
        title: true,
        slug: true,
        yearCreated: true,
        primaryImage: true,
        series: true,
      },
    })
    return result.docs.map(mapArtworkDoc)
  }

  const result = await args.payload.find({
    collection: 'artworks',
    locale: 'en',
    fallbackLocale: 'en',
    where: q
      ? {
          or: [
            { title: { contains: q } },
            { altTitle: { contains: q } },
            { slug: { contains: q } },
            { catalogueNumber: { contains: q } },
            { 'series.slug': { contains: q } },
            { 'series.name': { contains: q } },
          ],
        }
      : undefined,
    sort: '-updatedAt',
    limit,
    depth: 1,
    overrideAccess: true,
    user: args.user,
    select: {
      id: true,
      title: true,
      slug: true,
      yearCreated: true,
      primaryImage: true,
      series: true,
    },
  })

  return result.docs.map(mapArtworkDoc)
}
