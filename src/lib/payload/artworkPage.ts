import { getPayload } from 'payload'
import config from '@payload-config'
import type { Artwork } from '@/payload-types'

import { omitPrivateArtworkCommerceFields } from '@/hooks/artworkAfterRead'
import { projectArtworkProvenanceForPublicPage } from '@/lib/artwork/artworkProvenancePublic'
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
 * Depth 2 populates creator → bioTimelineEntries / statementThroughlines →
 * sourceSessionRef as full Session docs (messages, firstImpression, sessionNotes,
 * agentDraft*, fieldUpdateTimeline). The page never reads creator (artist is
 * fetched separately). Drop it entirely so sessions cannot enter any client
 * boundary. No select involved.
 */
function stripCreatorForPage(artwork: Artwork): Artwork {
  const copy = artwork as unknown as Record<string, unknown>
  delete copy.creator
  return artwork
}

/**
 * Coerce every sourceSessionRef relation to a numeric id. Defense in depth for
 * any depth-2 population that survives stripCreatorForPage (e.g. on events).
 */
function coerceSourceSessionRefs(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) coerceSourceSessionRefs(item)
    return
  }
  if (!value || typeof value !== 'object') return
  const row = value as Record<string, unknown>
  if ('sourceSessionRef' in row) {
    const id = relationToId(row.sourceSessionRef)
    row.sourceSessionRef = id
  }
  for (const nested of Object.values(row)) {
    if (nested && typeof nested === 'object') coerceSourceSessionRefs(nested)
  }
}

function prepareArtworkForPage(artwork: Artwork): Artwork {
  // Defense in depth: afterRead already omits these for anonymous reads, but
  // page props go into RSC flight — never leave commerce keys (even as undefined).
  const withoutCommerce = omitPrivateArtworkCommerceFields(
    artwork as unknown as Record<string, unknown>,
  ) as unknown as Artwork
  // Provenance is privateFieldAccess (absent from anonymous REST). Public pages
  // fetch with overrideAccess then project a public-safe subset for SSR.
  const prepared = stripCreatorForPage(
    stripEmbeddings(projectArtworkProvenanceForPublicPage(withoutCommerce)),
  )
  coerceSourceSessionRefs(prepared)
  return prepared
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
      overrideAccess: true,
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
