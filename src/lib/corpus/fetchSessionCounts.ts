import type { Payload } from 'payload'

import type { Artwork } from '@/payload-types'

function artworkSlugFromRelation(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const slug = (value as Artwork).slug
  if (typeof slug !== 'string') return null
  const trimmed = slug.trim()
  return trimmed || null
}

/**
 * One pass over completed sessions → slug → count.
 * Counts primaryArtwork / artworkRecord and each mentionedArtwork.
 */
export async function fetchSessionCountBySlug(payload: Payload): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  const PAGE_SIZE = 100
  let page = 1
  let hasNextPage = true

  const bump = (slug: string | null) => {
    if (!slug) return
    counts.set(slug, (counts.get(slug) ?? 0) + 1)
  }

  while (hasNextPage) {
    const result = await payload.find({
      collection: 'sessions',
      where: { status: { equals: 'completed' } },
      limit: PAGE_SIZE,
      page,
      depth: 1,
      overrideAccess: true,
      select: {
        primaryArtwork: true,
        artworkRecord: true,
        mentionedArtworks: true,
        status: true,
      },
    })

    for (const session of result.docs) {
      const primary =
        artworkSlugFromRelation(session.primaryArtwork) ??
        artworkSlugFromRelation(session.artworkRecord)
      bump(primary)

      for (const mentioned of session.mentionedArtworks ?? []) {
        const mentionedSlug = artworkSlugFromRelation(mentioned)
        // Avoid double-counting when primary is also in mentioned
        if (mentionedSlug && mentionedSlug !== primary) bump(mentionedSlug)
      }
    }

    hasNextPage = result.hasNextPage
    page += 1
  }

  return counts
}
