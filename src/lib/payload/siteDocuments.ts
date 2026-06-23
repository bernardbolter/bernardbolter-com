import { getPayload } from 'payload'
import config from '@payload-config'
import type { Artist, Artwork, Event } from '@/payload-types'

import { withDbRetry } from '@/lib/payload/withDbRetry'

const defaultLocale = 'en' as const

/** Primary artist row for JSON-LD / site (single-tenant: first document). */
export async function getArtistRecord(): Promise<Artist | null> {
  return withDbRetry(async () => {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'artists',
      locale: defaultLocale,
      limit: 1,
      depth: 0,
      sort: 'id',
      overrideAccess: false,
    })
    return result.docs[0] ?? null
  })
}

/** @deprecated Use getArtistRecord */
export async function getArtistGlobal(): Promise<Artist | null> {
  return getArtistRecord()
}

export async function getPublishedArtworkBySlug(slug: string): Promise<Artwork | null> {
  return withDbRetry(async () => {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'artworks',
      locale: defaultLocale,
      where: {
        and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }],
      },
      limit: 1,
      depth: 2,
      overrideAccess: false,
    })
    return result.docs[0] ?? null
  })
}

export async function getPublishedEventBySlug(slug: string): Promise<Event | null> {
  return withDbRetry(async () => {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'events',
      locale: defaultLocale,
      where: {
        and: [
          { slug: { equals: slug } },
          { status: { equals: 'published' } },
          { hasPage: { equals: true } },
        ],
      },
      limit: 1,
      depth: 2,
      overrideAccess: true,
    })
    return result.docs[0] ?? null
  })
}

/** One random published artwork for 404 / discovery surfaces. */
export async function getRandomPublishedArtwork(): Promise<Artwork | null> {
  return withDbRetry(async () => {
    const payload = await getPayload({ config })
    const { totalDocs } = await payload.count({
      collection: 'artworks',
      where: { status: { equals: 'published' } },
      overrideAccess: false,
    })
    if (totalDocs === 0) return null

    const page = Math.floor(Math.random() * totalDocs) + 1
    const result = await payload.find({
      collection: 'artworks',
      locale: defaultLocale,
      where: { status: { equals: 'published' } },
      limit: 1,
      page,
      depth: 2,
      overrideAccess: false,
    })
    return result.docs[0] ?? null
  })
}
