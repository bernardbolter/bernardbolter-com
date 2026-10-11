import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Payload } from 'payload'

import type { Artwork, Session } from '@/payload-types'

/** Public HTML session projection — messages only; never private streams. */
export type ArtworkPageSession = {
  id: number
  sessionId: string
  sessionType: Session['sessionType']
  status: Session['status']
  completedAt?: string | null
  createdAt?: string
  messages?: Session['messages']
  primaryArtwork: Artwork | null
  mentionedArtworks: Artwork[]
}

const PUBLIC_SESSION_SELECT = {
  sessionId: true,
  sessionType: true,
  status: true,
  createdAt: true,
  completedAt: true,
  primaryArtwork: true,
  artworkRecord: true,
  mentionedArtworks: true,
  messages: true,
} as const

function readArtwork(value: number | Artwork | null | undefined): Artwork | null {
  if (!value || typeof value !== 'object') return null
  return value
}

function resolvePrimary(session: {
  primaryArtwork?: number | Artwork | null
  artworkRecord?: number | Artwork | null
}): Artwork | null {
  return readArtwork(session.primaryArtwork) ?? readArtwork(session.artworkRecord)
}

function isPrimaryForArtwork(
  session: { primaryArtwork?: number | Artwork | null; artworkRecord?: number | Artwork | null },
  artworkId: number,
): boolean {
  const primary = resolvePrimary(session)
  if (primary?.id === artworkId) return true
  if (typeof session.primaryArtwork === 'number' && session.primaryArtwork === artworkId) return true
  if (typeof session.artworkRecord === 'number' && session.artworkRecord === artworkId) return true
  return false
}

function projectSession(session: Session): ArtworkPageSession | null {
  const sessionId = session.sessionId?.trim()
  if (!sessionId || session.status !== 'completed') return null
  return {
    id: session.id,
    sessionId,
    sessionType: session.sessionType,
    status: session.status,
    completedAt: session.completedAt,
    createdAt: session.createdAt,
    messages: session.messages,
    primaryArtwork: resolvePrimary(session),
    mentionedArtworks: (session.mentionedArtworks ?? [])
      .map((entry) => readArtwork(entry))
      .filter((artwork): artwork is Artwork => artwork !== null),
  }
}

function sortNewestFirst(a: ArtworkPageSession, b: ArtworkPageSession): number {
  const aKey = a.completedAt || a.createdAt || ''
  const bKey = b.completedAt || b.createdAt || ''
  return bKey.localeCompare(aKey)
}

/**
 * Sessions for /{slug}: primary (inline transcript) vs mention-only (link).
 * Privacy: select never includes sessionNotes, firstImpression, agentDraft*, fieldUpdateTimeline.
 */
export async function fetchArtworkPageSessions(
  payload: Payload,
  artworkId: number,
): Promise<{ primary: ArtworkPageSession[]; mentioned: ArtworkPageSession[] }> {
  const [primaryResult, mentionedResult] = await Promise.all([
    payload.find({
      collection: 'sessions',
      where: {
        and: [
          { status: { equals: 'completed' } },
          {
            or: [
              { primaryArtwork: { equals: artworkId } },
              { artworkRecord: { equals: artworkId } },
            ],
          },
        ],
      },
      depth: 1,
      limit: 50,
      sort: '-completedAt',
      overrideAccess: true,
      select: PUBLIC_SESSION_SELECT,
    }),
    payload.find({
      collection: 'sessions',
      where: {
        and: [
          { status: { equals: 'completed' } },
          { mentionedArtworks: { contains: artworkId } },
        ],
      },
      depth: 1,
      limit: 50,
      sort: '-completedAt',
      overrideAccess: true,
      select: PUBLIC_SESSION_SELECT,
    }),
  ])

  const primary: ArtworkPageSession[] = []
  const seen = new Set<number>()
  for (const doc of primaryResult.docs) {
    const projected = projectSession(doc as Session)
    if (!projected || seen.has(projected.id)) continue
    seen.add(projected.id)
    primary.push(projected)
  }
  primary.sort(sortNewestFirst)

  const mentioned: ArtworkPageSession[] = []
  for (const doc of mentionedResult.docs) {
    if (isPrimaryForArtwork(doc, artworkId)) continue
    const projected = projectSession(doc as Session)
    if (!projected || seen.has(projected.id)) continue
    seen.add(projected.id)
    mentioned.push(projected)
  }
  mentioned.sort(sortNewestFirst)

  return { primary, mentioned }
}

/** Cached sessions for public artwork HTML (production). */
export async function getArtworkPageSessions(
  artworkId: number,
  artworkSlug: string,
): Promise<{ primary: ArtworkPageSession[]; mentioned: ArtworkPageSession[] }> {
  if (process.env.NODE_ENV === 'development') {
    const payload = await getPayload({ config })
    return fetchArtworkPageSessions(payload, artworkId)
  }
  return unstable_cache(
    async () => {
      const payload = await getPayload({ config })
      return fetchArtworkPageSessions(payload, artworkId)
    },
    ['artwork-page-sessions', String(artworkId)],
    { revalidate: 3600, tags: ['artworks', `artwork-${artworkSlug}`] },
  )()
}
