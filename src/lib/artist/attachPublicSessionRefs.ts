import { getPayload } from 'payload'
import config from '@payload-config'

import type { Artist, Session } from '@/payload-types'

function sessionIdsFromArtist(artist: Artist): number[] {
  const ids = new Set<number>()
  for (const entry of artist.bioTimelineEntries ?? []) {
    const ref = entry.sourceSessionRef
    if (typeof ref === 'number') ids.add(ref)
  }
  for (const entry of artist.statementThroughlines ?? []) {
    const ref = entry.sourceSessionRef
    if (typeof ref === 'number') ids.add(ref)
    for (const reinforcing of entry.reinforcingSessions ?? []) {
      if (typeof reinforcing === 'number') ids.add(reinforcing)
    }
  }
  return [...ids]
}

/**
 * Sessions are staff-only for list/read via access control. For public bio/statement
 * pages we attach minimal session docs (sessionId + status) so completed sessions
 * can link without exposing transcripts.
 */
export async function attachPublicSessionRefs(artist: Artist): Promise<Artist> {
  const ids = sessionIdsFromArtist(artist)
  if (!ids.length) return artist

  const payload = await getPayload({ config })
  const map = new Map<number, Pick<Session, 'id' | 'sessionId' | 'status'>>()

  await Promise.all(
    ids.map(async (id) => {
      try {
        const session = await payload.findByID({
          collection: 'sessions',
          id,
          depth: 0,
          select: {
            sessionId: true,
            status: true,
          },
        })
        if (session) {
          map.set(id, {
            id: session.id,
            sessionId: session.sessionId,
            status: session.status,
          })
        }
      } catch {
        // omit missing
      }
    }),
  )

  const hydrate = (
    ref: number | Session | null | undefined,
  ): number | Session | null | undefined => {
    if (typeof ref !== 'number') return ref
    return (map.get(ref) as Session | undefined) ?? ref
  }

  return {
    ...artist,
    bioTimelineEntries: (artist.bioTimelineEntries ?? []).map((entry) => ({
      ...entry,
      sourceSessionRef: hydrate(entry.sourceSessionRef),
    })),
    statementThroughlines: (artist.statementThroughlines ?? []).map((entry) => ({
      ...entry,
      sourceSessionRef: hydrate(entry.sourceSessionRef),
      reinforcingSessions: (entry.reinforcingSessions ?? [])
        .map((ref) => hydrate(ref))
        .filter((ref): ref is number | Session => ref != null),
    })),
  }
}
