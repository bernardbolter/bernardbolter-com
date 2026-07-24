import type { CollectionAfterChangeHook, Payload } from 'payload'

import { revalidateArchive } from '@/lib/cache/revalidateArchive'
import type { Artwork, Session } from '@/payload-types'

function artworkId(value: number | Artwork | null | undefined): number | null {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && typeof value.id === 'number') return value.id
  return null
}

function artworkSlug(value: number | Artwork | null | undefined): string | null {
  if (!value || typeof value !== 'object') return null
  if (typeof value.slug === 'string' && value.slug.trim()) return value.slug.trim()
  return null
}

async function resolveArtworkSlug(
  payload: Payload,
  value: number | Artwork | null | undefined,
): Promise<string | null> {
  const fromDoc = artworkSlug(value)
  if (fromDoc) return fromDoc
  const id = artworkId(value)
  if (!id) return null
  try {
    const artwork = await payload.findByID({
      collection: 'artworks',
      id,
      depth: 0,
      select: { slug: true },
    })
    return typeof artwork.slug === 'string' && artwork.slug.trim() ? artwork.slug.trim() : null
  } catch {
    return null
  }
}

/**
 * Invalidate Tier 5 corpus caches for the primary artwork and every mentioned artwork.
 * Only completed sessions are public at Tier 5; in-progress never enters the public path.
 */
export const sessionAfterChange: CollectionAfterChangeHook<Session> = async ({
  doc,
  previousDoc,
  req,
}) => {
  const wasOrIsCompleted =
    doc.status === 'completed' || previousDoc?.status === 'completed'
  if (!wasOrIsCompleted) {
    return doc
  }

  const related = [
    doc.primaryArtwork,
    doc.artworkRecord,
    ...(doc.mentionedArtworks ?? []),
    previousDoc?.primaryArtwork,
    previousDoc?.artworkRecord,
    ...(previousDoc?.mentionedArtworks ?? []),
  ]

  const slugs = new Set<string>()
  for (const entry of related) {
    const slug = await resolveArtworkSlug(req.payload, entry)
    if (slug) slugs.add(slug)
  }

  const paths = ['/sessions', '/api/corpus/sessions']
  for (const slug of slugs) {
    paths.push(`/api/corpus/${slug}`, `/api/corpus/${slug}?tier=5`, `/sessions?artwork=${slug}`)
  }

  revalidateArchive({ tags: ['corpus', 'artworks'], paths })
  return doc
}
