import { getPayload } from 'payload'
import config from '@payload-config'

import { withDbUnavailableFallback } from '@/lib/payload/buildSafeDb'
import type { Artist, Event } from '@/payload-types'

async function fetchStatementPageArtist(): Promise<Artist | null> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'artists',
    locale: 'en',
    limit: 1,
    depth: 3,
    overrideAccess: false,
  })
  return result.docs[0] ?? null
}

/** Artist row with populated statement related works and nested event relations. */
export async function getStatementPageArtist(): Promise<Artist | null> {
  return withDbUnavailableFallback(fetchStatementPageArtist, null)
}

function readEvent(entry: number | Event | null | undefined): Event | null {
  if (!entry || typeof entry !== 'object') return null
  return entry
}

/** Fetch a single event with populated artworks for statement JSON-LD about block. */
export async function getStatementAboutEvent(eventId: number): Promise<Event | null> {
  const payload = await getPayload({ config })
  try {
    const event = await payload.findByID({
      collection: 'events',
      id: eventId,
      locale: 'en',
      depth: 2,
      overrideAccess: false,
    })
    return event ?? null
  } catch {
    return null
  }
}

export async function getStatementAboutEventFromArtist(artist: Artist): Promise<Event | null> {
  const counts = new Map<number, number>()

  for (const entry of artist.statementRelatedWorks ?? []) {
    const artwork = entry.artwork
    if (!artwork || typeof artwork !== 'object') continue

    for (const eventEntry of artwork.events?.docs ?? []) {
      const event = readEvent(eventEntry)
      if (!event) continue
      counts.set(event.id, (counts.get(event.id) ?? 0) + 1)
    }
  }

  let bestId: number | null = null
  let bestCount = 0
  for (const [id, count] of counts) {
    if (count > bestCount) {
      bestId = id
      bestCount = count
    }
  }

  if (bestId === null) return null
  return getStatementAboutEvent(bestId)
}
