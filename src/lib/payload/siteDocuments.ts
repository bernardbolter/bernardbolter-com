import { getPayload } from 'payload'
import config from '@payload-config'
import type { Artist, Artwork, Event } from '@/payload-types'

const defaultLocale = 'en' as const

/** Primary artist row for JSON-LD / site (single-tenant: first document). */
export async function getArtistRecord(): Promise<Artist | null> {
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
}

/** @deprecated Use getArtistRecord */
export async function getArtistGlobal(): Promise<Artist | null> {
  return getArtistRecord()
}

export async function getPublishedArtworkBySlug(slug: string): Promise<Artwork | null> {
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
}

export async function getPublishedEventBySlug(slug: string): Promise<Event | null> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'events',
    locale: defaultLocale,
    where: {
      and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: false,
  })
  return result.docs[0] ?? null
}
