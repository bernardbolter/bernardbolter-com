import type { Artwork, Event, Session } from '@/payload-types'

import { CORPUS_CONTEXT } from '@/lib/corpus/constants'
import { buildScopeDepthEnvelope } from '@/lib/corpus/scopeDepth'
import { resolveSessionPrimaryArtwork } from '@/lib/corpus/sessionIndexFilters'
import { buildTierMap } from '@/lib/corpus/tierMap'

export type Tier5SessionSource = Pick<
  Session,
  | 'sessionId'
  | 'sessionType'
  | 'status'
  | 'createdAt'
  | 'completedAt'
  | 'primaryArtwork'
  | 'artworkRecord'
  | 'mentionedArtworks'
  | 'eventRecord'
  | 'messages'
  | 'firstImpression'
  | 'secondDescription'
  | 'fieldUpdateTimeline'
  | 'sessionNotes'
  | 'weakPhases'
  | 'blindDescriptionUseful'
  | 'formalContributionAccuracy'
  | 'dialogueRefinementFlag'
  | 'refinementNotes'
  | 'agentDraftDescriptionShort'
  | 'agentDraftDescriptionLong'
  | 'agentDraftConceptualKeywords'
  | 'agentDraftFormalContributionAssessment'
> & {
  agentModel?: string | null
}

function readArtwork(value: number | Artwork | null | undefined): Artwork | null {
  if (!value || typeof value !== 'object') return null
  return value
}

function artworkSlug(value: number | Artwork | null | undefined): string | null {
  const artwork = readArtwork(value)
  if (!artwork?.slug || typeof artwork.slug !== 'string') return null
  const slug = artwork.slug.trim()
  return slug || null
}

/** True when this completed session is primary for or mentions the queried artwork slug. */
export function sessionMatchesArtworkSlug(
  session: Tier5SessionSource,
  artworkSlugQuery: string,
): boolean {
  const primaryDoc = resolveSessionPrimaryArtwork(
    readArtwork(session.primaryArtwork),
    readArtwork(session.artworkRecord),
  )
  const primary = primaryDoc?.slug?.trim() || null
  if (primary === artworkSlugQuery) return true
  return (session.mentionedArtworks ?? []).some(
    (entry) => artworkSlug(entry) === artworkSlugQuery,
  )
}

function readEvent(value: number | Event | null | undefined): Event | null {
  if (!value || typeof value !== 'object') return null
  return value
}

function eventSlug(value: number | Event | null | undefined): string | null {
  const event = readEvent(value)
  if (!event?.slug || typeof event.slug !== 'string') return null
  const slug = event.slug.trim()
  return slug || null
}

/** True when this completed event-enrichment session targets the queried event slug. */
export function sessionMatchesEventSlug(
  session: Tier5SessionSource,
  eventSlugQuery: string,
): boolean {
  return eventSlug(session.eventRecord) === eventSlugQuery
}

function projectMessages(messages: Session['messages']): Array<{
  role: string
  content: unknown
}> {
  if (!Array.isArray(messages)) return []
  return messages
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const record = entry as Record<string, unknown>
      const role = typeof record.role === 'string' ? record.role : null
      if (!role || !('content' in record)) return null
      return { role, content: record.content }
    })
    .filter((entry): entry is { role: string; content: unknown } => entry !== null)
}

function projectKeywords(
  keywords: Session['agentDraftConceptualKeywords'],
): string[] | null {
  if (!Array.isArray(keywords) || keywords.length === 0) return null
  const values = keywords
    .map((row) => (typeof row?.keyword === 'string' ? row.keyword.trim() : ''))
    .filter(Boolean)
  return values.length > 0 ? values : null
}

/**
 * Project a completed session into the Tier 5 machine-readable shape:
 * `artistRecord` (reasoning trail) and `art-official:DialogueSelfAudit` (process integrity)
 * as clearly separated, distinctly-namespaced nodes.
 */
export function projectTier5Session(session: Tier5SessionSource) {
  const sessionId = session.sessionId
  if (!sessionId) return null
  if (session.status !== 'completed') return null

  const primaryDoc = resolveSessionPrimaryArtwork(
    readArtwork(session.primaryArtwork),
    readArtwork(session.artworkRecord),
  )
  const primary = primaryDoc?.slug?.trim() || null
  const mentioned = (session.mentionedArtworks ?? [])
    .map((entry) => artworkSlug(entry))
    .filter((slug): slug is string => Boolean(slug))
  const event = eventSlug(session.eventRecord)

  return {
    sessionId,
    sessionType: session.sessionType,
    createdAt: session.createdAt ?? null,
    completedAt: session.completedAt ?? null,
    primaryArtwork: primary,
    mentionedArtworks: mentioned,
    eventRecord: event,
    artistRecord: {
      firstImpression: session.firstImpression ?? null,
      secondDescription: session.secondDescription ?? null,
      messages: projectMessages(session.messages),
      fieldUpdateTimeline: Array.isArray(session.fieldUpdateTimeline)
        ? session.fieldUpdateTimeline
        : session.fieldUpdateTimeline ?? null,
    },
    'art-official:DialogueSelfAudit': {
      agentModel: session.agentModel ?? null,
      sessionNotes: session.sessionNotes ?? null,
      weakPhases: session.weakPhases ?? null,
      blindDescriptionUseful: session.blindDescriptionUseful ?? null,
      formalContributionAccuracy: session.formalContributionAccuracy ?? null,
      dialogueRefinementFlag: session.dialogueRefinementFlag ?? null,
      refinementNotes: session.refinementNotes ?? null,
      agentDraftDescriptionShort: session.agentDraftDescriptionShort ?? null,
      agentDraftDescriptionLong: session.agentDraftDescriptionLong ?? null,
      agentDraftConceptualKeywords: projectKeywords(session.agentDraftConceptualKeywords),
      agentDraftFormalContribution:
        session.agentDraftFormalContributionAssessment ?? null,
    },
  }
}

export function buildTier5SessionsResponse(options: {
  artworkSlug: string
  sessions: Tier5SessionSource[]
  baseUrl: string
}) {
  const { artworkSlug, sessions, baseUrl } = options

  const projected = sessions
    .filter((session) => sessionMatchesArtworkSlug(session, artworkSlug))
    .map((session) => projectTier5Session(session))
    .filter((session): session is NonNullable<typeof session> => session !== null)

  return {
    '@context': CORPUS_CONTEXT,
    '@type': 'DataFeed',
    ...buildScopeDepthEnvelope('sessions'),
    'art-official:tierMap': buildTierMap(baseUrl),
    'art-official:artworkSlug': artworkSlug,
    'art-official:artworkUrl': `${baseUrl}/${artworkSlug}`,
    'art-official:recordUrl': `${baseUrl}/api/corpus/${artworkSlug}`,
    'art-official:coverage': { sessionCount: projected.length },
    sessions: projected,
  }
}

/** Event-keyed Tier 5 list — same artistRecord / DialogueSelfAudit split as artwork sessions. */
export function buildTier5EventSessionsResponse(options: {
  eventSlug: string
  sessions: Tier5SessionSource[]
  baseUrl: string
}) {
  const { eventSlug, sessions, baseUrl } = options

  const projected = sessions
    .filter((session) => sessionMatchesEventSlug(session, eventSlug))
    .map((session) => projectTier5Session(session))
    .filter((session): session is NonNullable<typeof session> => session !== null)

  return {
    '@context': CORPUS_CONTEXT,
    '@type': 'DataFeed',
    ...buildScopeDepthEnvelope('sessions'),
    'art-official:tierMap': buildTierMap(baseUrl),
    'art-official:eventSlug': eventSlug,
    'art-official:eventUrl': `${baseUrl}/events/${eventSlug}`,
    'art-official:recordUrl': `${baseUrl}/api/corpus/${eventSlug}?type=event`,
    'art-official:coverage': { sessionCount: projected.length },
    sessions: projected,
  }
}

export type ProjectedTier5Session = NonNullable<ReturnType<typeof projectTier5Session>>

/** Shared select for Tier 5 session projection (artwork-keyed or session-keyed). */
export const TIER5_SESSION_SELECT = {
  sessionId: true,
  sessionType: true,
  status: true,
  createdAt: true,
  completedAt: true,
  primaryArtwork: true,
  artworkRecord: true,
  mentionedArtworks: true,
  eventRecord: true,
  messages: true,
  firstImpression: true,
  secondDescription: true,
  fieldUpdateTimeline: true,
  sessionNotes: true,
  weakPhases: true,
  blindDescriptionUseful: true,
  formalContributionAccuracy: true,
  dialogueRefinementFlag: true,
  refinementNotes: true,
  agentDraftDescriptionShort: true,
  agentDraftDescriptionLong: true,
  agentDraftConceptualKeywords: true,
  agentDraftFormalContributionAssessment: true,
  agentModel: true,
} as const

export function sessionTier5ApiPath(sessionId: string): string {
  return `/api/corpus/sessions/${encodeURIComponent(sessionId)}?tier=5`
}

/**
 * Session-keyed Tier 5 response — works with or without primaryArtwork
 * (event-enrichment, artist-statement, biography, etc.).
 */
export function buildTier5SessionByIdResponse(options: {
  session: Tier5SessionSource
  baseUrl: string
}) {
  const { session, baseUrl } = options
  const projected = projectTier5Session(session)
  if (!projected) return null

  return {
    '@type': 'art-official:Session',
    'art-official:tier': 5,
    url: `${baseUrl}${sessionTier5ApiPath(projected.sessionId)}`,
    sessionId: projected.sessionId,
    sessionType: projected.sessionType,
    createdAt: projected.createdAt,
    completedAt: projected.completedAt,
    primaryArtwork: projected.primaryArtwork,
    mentionedArtworks: projected.mentionedArtworks,
    eventRecord: projected.eventRecord,
    artistRecord: projected.artistRecord,
    'art-official:DialogueSelfAudit': projected['art-official:DialogueSelfAudit'],
    sameAs: `${baseUrl}/sessions/${projected.sessionId}`,
  }
}

/**
 * Page-embedded JSON-LD for `/sessions/[sessionId]`.
 * Same streams as Tier 5; artwork refs are absolute URLs; `sameAs` points at the session API.
 */
export function buildSessionJsonLd(
  session: Tier5SessionSource,
  baseUrl: string,
): Record<string, unknown> | null {
  const projected = projectTier5Session(session)
  if (!projected) return null

  const primaryUrl = projected.primaryArtwork
    ? `${baseUrl}/${projected.primaryArtwork}`
    : null

  return {
    '@context': CORPUS_CONTEXT,
    '@type': 'art-official:Session',
    '@id': `${baseUrl}/sessions/${projected.sessionId}`,
    sessionType: projected.sessionType,
    completedAt: projected.completedAt,
    primaryArtwork: primaryUrl,
    mentionedArtworks: projected.mentionedArtworks.map((slug) => `${baseUrl}/${slug}`),
    eventRecord: projected.eventRecord
      ? `${baseUrl}/events/${projected.eventRecord}`
      : null,
    artistRecord: projected.artistRecord,
    'art-official:DialogueSelfAudit': projected['art-official:DialogueSelfAudit'],
    sameAs: `${baseUrl}${sessionTier5ApiPath(projected.sessionId)}`,
  }
}
