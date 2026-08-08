import { getPayload } from 'payload'
import config from '@payload-config'
import type { Artwork } from '@/payload-types'

import { omitPrivateArtworkCommerceFields } from '@/hooks/artworkAfterRead'
import { withDbRetry } from '@/lib/payload/withDbRetry'

const defaultLocale = 'en' as const

/**
 * Depth for series (incl. one parentSeries hop), relatedWorks, tags, events.
 * Must stay ≤ 2: depth 3 populates creator → linkedArtworkSlugs as full Artwork
 * docs (~319 KB unused on /[slug]). Bio/statement routes fetch the artist
 * separately via getBioPageArtist / getStatementPageArtist — not this constant.
 */
export const ARTWORK_PAGE_DEPTH = 2

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

function relationToId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id: unknown }).id
    if (typeof id === 'number' && Number.isFinite(id)) return id
  }
  return null
}

/**
 * Depth 2 still populates creator.bioTimelineEntries / statementThroughlines
 * → linkedArtworkSlugs as Artwork docs. Nothing on /[slug] renders those;
 * coerce to IDs so they never enter the RSC flight. No select involved.
 */
function stripCreatorLinkedArtworkDocs(artwork: Artwork): Artwork {
  const creator = artwork.creator
  if (!creator || typeof creator !== 'object') return artwork

  const coerce = (entries: unknown) => {
    if (!Array.isArray(entries)) return
    for (const entry of entries) {
      if (!entry || typeof entry !== 'object') continue
      const row = entry as { linkedArtworkSlugs?: unknown }
      if (!Array.isArray(row.linkedArtworkSlugs)) continue
      row.linkedArtworkSlugs = row.linkedArtworkSlugs
        .map(relationToId)
        .filter((id): id is number => id !== null)
    }
  }

  coerce((creator as { bioTimelineEntries?: unknown }).bioTimelineEntries)
  coerce((creator as { statementThroughlines?: unknown }).statementThroughlines)
  return artwork
}

function prepareArtworkForPage(artwork: Artwork): Artwork {
  // Defense in depth: afterRead already omits these for anonymous reads, but
  // page props go into RSC flight — never leave commerce keys (even as undefined).
  const withoutCommerce = omitPrivateArtworkCommerceFields(
    artwork as unknown as Record<string, unknown>,
  ) as unknown as Artwork
  return stripCreatorLinkedArtworkDocs(stripEmbeddings(withoutCommerce))
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
    return doc ? prepareArtworkForPage(doc) : null
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
    return doc ? prepareArtworkForPage(doc) : null
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
