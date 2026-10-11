import type { Artist, Session } from '@/payload-types'
import { getPayload } from 'payload'
import config from '@payload-config'

import { projectPublicSessionGloss } from '@/lib/corpus/projectPublicSessionGloss'

function relationToId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id: unknown }).id
    if (typeof id === 'number' && Number.isFinite(id)) return id
  }
  return null
}

function collectSessionIds(artist: Artist): number[] {
  const ids = new Set<number>()

  const push = (value: unknown) => {
    const id = relationToId(value)
    if (id != null) ids.add(id)
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
  | 'fieldUpdateTimeline'
  | 'revisitOf'
  | 'linchpinFlag'
  | 'sessionStruggleFlag'
  | 'priorFieldConflicts'
>

/**
 * Sessions are staff-only for list/read via access control. For public bio/statement
 * pages we attach minimal session docs so completed sessions can link + gloss
 * without exposing transcripts or timeline/conflict *values*.
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
            fieldUpdateTimeline: true,
            revisitOf: true,
            linchpinFlag: true,
            sessionStruggleFlag: true,
            priorFieldConflicts: true,
          },
        })
        if (session) {
          const projected = projectPublicSessionGloss({
            id: session.id,
            sessionId: session.sessionId,
            status: session.status,
            sessionType: session.sessionType,
            completedAt: session.completedAt,
            fieldsCoveredThisSession: session.fieldsCoveredThisSession,
            fieldUpdateTimeline: session.fieldUpdateTimeline,
            revisitOf: session.revisitOf,
            linchpinFlag: session.linchpinFlag,
            sessionStruggleFlag: session.sessionStruggleFlag,
            priorFieldConflicts: session.priorFieldConflicts,
          } as Session)
          map.set(id, {
            id: projected.id,
            sessionId: projected.sessionId,
            status: projected.status,
            sessionType: projected.sessionType,
            completedAt: projected.completedAt,
            fieldsCoveredThisSession: projected.fieldsCoveredThisSession,
            fieldUpdateTimeline: projected.fieldUpdateTimeline,
            revisitOf: projected.revisitOf,
            linchpinFlag: projected.linchpinFlag,
            sessionStruggleFlag: projected.sessionStruggleFlag,
            priorFieldConflicts: projected.priorFieldConflicts,
          })
        }
      } catch {
        // omit missing
      }
    }),
  )

  /** Always replace populated depth-2 Session docs with the slim public projection. */
  const hydrate = (ref: number | Session | null | undefined): number | Session | null | undefined => {
    const id = relationToId(ref)
    if (id == null) return ref == null ? ref : null
    return (map.get(id) as Session | undefined) ?? id
  }

  const hydrateRequired = (ref: number | Session): number | Session => {
    const id = relationToId(ref)
    if (id == null) return typeof ref === 'number' ? ref : ref
    return (map.get(id) as Session | undefined) ?? id
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
