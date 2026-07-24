import type { Artwork, Session } from '@/payload-types'

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
  const primary =
    artworkSlug(session.primaryArtwork) ?? artworkSlug(session.artworkRecord)
  if (primary === artworkSlugQuery) return true
  return (session.mentionedArtworks ?? []).some(
    (entry) => artworkSlug(entry) === artworkSlugQuery,
  )
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
 * `artistRecord` (reasoning trail) and `artism:DialogueSelfAudit` (process integrity)
 * as clearly separated, distinctly-namespaced nodes.
 */
export function projectTier5Session(session: Tier5SessionSource) {
  const sessionId = session.sessionId
  if (!sessionId) return null
  if (session.status !== 'completed') return null

  const primary =
    artworkSlug(session.primaryArtwork) ?? artworkSlug(session.artworkRecord)
  const mentioned = (session.mentionedArtworks ?? [])
    .map((entry) => artworkSlug(entry))
    .filter((slug): slug is string => Boolean(slug))

  return {
    sessionId,
    sessionType: session.sessionType,
    createdAt: session.createdAt ?? null,
    completedAt: session.completedAt ?? null,
    primaryArtwork: primary,
    mentionedArtworks: mentioned,
    artistRecord: {
      firstImpression: session.firstImpression ?? null,
      secondDescription: session.secondDescription ?? null,
      messages: projectMessages(session.messages),
      fieldUpdateTimeline: Array.isArray(session.fieldUpdateTimeline)
        ? session.fieldUpdateTimeline
        : session.fieldUpdateTimeline ?? null,
    },
    'artism:DialogueSelfAudit': {
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
    '@type': 'DataFeed',
    'artism:tier': 5,
    artworkSlug,
    url: `${baseUrl}/api/corpus/${encodeURIComponent(artworkSlug)}?tier=5`,
    'artism:totalSessions': projected.length,
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
    '@type': 'artism:Session',
    'artism:tier': 5,
    url: `${baseUrl}${sessionTier5ApiPath(projected.sessionId)}`,
    sessionId: projected.sessionId,
    sessionType: projected.sessionType,
    createdAt: projected.createdAt,
    completedAt: projected.completedAt,
    primaryArtwork: projected.primaryArtwork,
    mentionedArtworks: projected.mentionedArtworks,
    artistRecord: projected.artistRecord,
    'artism:DialogueSelfAudit': projected['artism:DialogueSelfAudit'],
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
    '@context': 'https://schema.org',
    '@type': 'artism:Session',
    '@id': `${baseUrl}/sessions/${projected.sessionId}`,
    sessionType: projected.sessionType,
    completedAt: projected.completedAt,
    primaryArtwork: primaryUrl,
    mentionedArtworks: projected.mentionedArtworks.map((slug) => `${baseUrl}/${slug}`),
    artistRecord: projected.artistRecord,
    'artism:DialogueSelfAudit': projected['artism:DialogueSelfAudit'],
    sameAs: `${baseUrl}${sessionTier5ApiPath(projected.sessionId)}`,
  }
}
