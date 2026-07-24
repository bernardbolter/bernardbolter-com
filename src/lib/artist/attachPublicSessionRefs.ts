import type { Artist, Session } from '@/payload-types'
import { getPayload } from 'payload'
import config from '@payload-config'

function collectSessionIds(artist: Artist): number[] {
  const ids = new Set<number>()

  const push = (value: unknown) => {
    if (typeof value === 'number') ids.add(value)
    else if (value && typeof value === 'object' && 'id' in value) {
      const id = (value as { id: unknown }).id
      if (typeof id === 'number') ids.add(id)
    }
  }

  for (const entry of artist.bioTimelineEntries ?? []) {
    push(entry.sourceSessionRef)
  }
  for (const entry of artist.statementThroughlines ?? []) {
    push(entry.sourceSessionRef)
    for (const row of entry.reinforcingSessions ?? []) {
      push(row.session)
    }
  }
  return [...ids]
}

type PublicSession = Pick<
  Session,
  | 'id'
  | 'sessionId'
  | 'status'
  | 'sessionType'
  | 'completedAt'
  | 'fieldsCoveredThisSession'
  | 'revisitOf'
  | 'linchpinFlag'
  | 'sessionStruggleFlag'
  | 'priorFieldConflicts'
>

/**
 * Sessions are staff-only for list/read via access control. For public bio/statement
 * pages we attach minimal session docs so completed sessions can link + gloss
 * without exposing transcripts.
 */
export async function attachPublicSessionRefs(artist: Artist): Promise<Artist> {
  const ids = collectSessionIds(artist)
  if (!ids.length) return artist

  const payload = await getPayload({ config })
  const map = new Map<number, PublicSession>()

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
            sessionType: true,
            completedAt: true,
            fieldsCoveredThisSession: true,
            revisitOf: true,
            linchpinFlag: true,
            sessionStruggleFlag: true,
            priorFieldConflicts: true,
          },
        })
        if (session) {
          map.set(id, {
            id: session.id,
            sessionId: session.sessionId,
            status: session.status,
            sessionType: session.sessionType,
            completedAt: session.completedAt,
            fieldsCoveredThisSession: session.fieldsCoveredThisSession,
            revisitOf: session.revisitOf,
            linchpinFlag: session.linchpinFlag,
            sessionStruggleFlag: session.sessionStruggleFlag,
            priorFieldConflicts: session.priorFieldConflicts,
          })
        }
      } catch {
        // omit missing
      }
    }),
  )

  const hydrate = (ref: number | Session | null | undefined): number | Session | null | undefined => {
    if (typeof ref !== 'number') return ref
    return (map.get(ref) as Session | undefined) ?? ref
  }

  const hydrateRequired = (ref: number | Session): number | Session => {
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
      reinforcingSessions: (entry.reinforcingSessions ?? []).map((row) => ({
        ...row,
        session: hydrateRequired(row.session),
      })),
    })),
  }
}
