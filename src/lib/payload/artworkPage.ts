import { getPayload } from 'payload'
import config from '@payload-config'
import type { Artwork } from '@/payload-types'

import { withDbRetry } from '@/lib/payload/withDbRetry'

const defaultLocale = 'en' as const

/** Depth for series parent chain + populated events and tags on the artwork page. */
export const ARTWORK_PAGE_DEPTH = 3

export async function getPublishedArtworkSlugs(): Promise<string[]> {
  const payload = await getPayload({ config })
  const slugs: string[] = []
  let page = 1
  let hasNextPage = true

  while (hasNextPage) {
    const result = await payload.find({
      collection: 'artworks',
      locale: defaultLocale,
      where: { status: { equals: 'published' } },
      limit: 100,
      page,
      depth: 0,
      select: { slug: true },
      overrideAccess: false,
    })

    for (const doc of result.docs) {
      const slug = doc.slug?.trim()
      if (slug && !slug.startsWith('__')) {
        slugs.push(slug)
      }
    }

    hasNextPage = result.hasNextPage
    page += 1
  }

  return slugs
}

/**
 * Strip raw embedding vectors from a fetched artwork so they are never
 * serialised into the RSC flight payload (each is 768–1536 floats, ~10–15 KB).
 * These fields are queried directly from pgvector for similarity — the page
 * never reads them.  We strip post-fetch rather than using select:{false} because
 * Payload's denylist select mode corrupts join-field hydration (capturePhotos etc).
 */
function stripEmbeddings(artwork: Artwork): Artwork {
  const copy = artwork as unknown as Record<string, unknown>
  delete copy.clipEmbedding
  delete copy.dinov2Embedding
  delete copy.reasoningTextEmbedding
  delete copy.embedding
  return artwork
}

export async function getPublishedArtworkForPage(slug: string): Promise<Artwork | null> {
  return withDbRetry(async () => {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'artworks',
      locale: defaultLocale,
      where: {
        and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }],
      },
      limit: 1,
      depth: ARTWORK_PAGE_DEPTH,
      overrideAccess: false,
    })
    const doc = result.docs[0]
    return doc ? stripEmbeddings(doc) : null
  })
}

/**
 * Dev-only: load any artwork by slug (draft or published) with full field access.
 * Production callers must guard with `NODE_ENV === 'development'`.
 */
export async function getArtworkForPreview(slug: string): Promise<Artwork | null> {
  return withDbRetry(async () => {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'artworks',
      locale: defaultLocale,
      where: { slug: { equals: slug } },
      limit: 1,
      depth: ARTWORK_PAGE_DEPTH,
      overrideAccess: true,
    })
    const doc = result.docs[0]
    return doc ? stripEmbeddings(doc) : null
  })
}

/** Published artwork for the public page; drafts visible in local dev only. */
export async function getArtworkForPage(slug: string): Promise<Artwork | null> {
  const published = await getPublishedArtworkForPage(slug)
  if (published) return published
  if (process.env.NODE_ENV === 'development') {
    return getArtworkForPreview(slug)
  }
  return null
}
