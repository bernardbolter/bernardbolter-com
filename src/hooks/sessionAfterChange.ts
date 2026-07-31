import type { CollectionAfterChangeHook, Payload } from 'payload'

import { revalidateArchive } from '@/lib/cache/revalidateArchive'
import { revalidateCorpusFeed } from '@/lib/cache/revalidateCorpusFeed'
import type { Artwork, Event, Session } from '@/payload-types'

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

function eventId(value: number | Event | null | undefined): number | null {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && typeof value.id === 'number') return value.id
  return null
}

function eventSlugValue(value: number | Event | null | undefined): string | null {
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

async function resolveEventSlug(
  payload: Payload,
  value: number | Event | null | undefined,
): Promise<string | null> {
  const fromDoc = eventSlugValue(value)
  if (fromDoc) return fromDoc
  const id = eventId(value)
  if (!id) return null
  try {
    const event = await payload.findByID({
      collection: 'events',
      id,
      depth: 0,
      select: { slug: true },
    })
    return typeof event.slug === 'string' && event.slug.trim() ? event.slug.trim() : null
  } catch {
    return null
  }
}

/**
 * Invalidate Tier 5 corpus caches for the primary artwork, mentioned artworks,
 * and linked event (event-${slug} tag scope).
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

  const eventSlugs = new Set<string>()
  for (const entry of [doc.eventRecord, previousDoc?.eventRecord]) {
    const slug = await resolveEventSlug(req.payload, entry)
    if (slug) eventSlugs.add(slug)
  }

  const paths = ['/sessions']
  if (typeof doc.sessionId === 'string' && doc.sessionId.trim()) {
    const sid = doc.sessionId.trim()
    paths.push(`/sessions/${sid}`)
  }
  for (const slug of slugs) {
    paths.push(`/sessions?artwork=${slug}`)
  }

  revalidateArchive({ tags: ['artworks'], paths })
  revalidateCorpusFeed({
    artworkSlugs: [...slugs],
    eventSlugs: [...eventSlugs],
    sessionId: typeof doc.sessionId === 'string' ? doc.sessionId : undefined,
  })
  return doc
}
