/**
 * Derived reasoningStatus — computed from evidence, never written for public use.
 *
 * complete  = completed primary session with messages.length > 0 AND a why-field
 * partial   = session+messages but no why, OR why but no such session
 * stub      = neither
 *
 * A completed session with zero messages is not cataloguing evidence (ghost shell).
 */

export type ReasoningStatusValue = 'stub' | 'partial' | 'complete'

/** Report-only split of public `partial` — not a stored enum value. */
export type ReasoningPartialKind = 'session-but-no-why' | 'why-but-no-session'

export type SessionEvidenceKind =
  | 'live-timeline'
  | 'envelope-transcript'
  | 'ghost-shell'
  | 'no-primary-session'

export type WhyFieldSource = {
  intent?: string | null
  formalContributionAssessment?: string | null
  descriptionShort?: string | null
  workContext?: string | null
}

export type SessionEvidence = {
  sessionId: string
  primaryArtworkId: number | null
  primarySlug: string | null
  messageCount: number
  timelineCount: number
  createdAt?: string | null
  completedAt?: string | null
}

export type DerivedReasoningStatus = {
  status: ReasoningStatusValue
  partialKind: ReasoningPartialKind | null
  hasWhy: boolean
  hasCompletedSessionWithMessages: boolean
  bestSession: SessionEvidence | null
  evidenceKind: SessionEvidenceKind
}

function trimText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function artworkHasWhy(artwork: WhyFieldSource): boolean {
  return Boolean(
    trimText(artwork.intent) ||
      trimText(artwork.formalContributionAssessment) ||
      trimText(artwork.descriptionShort) ||
      trimText(artwork.workContext),
  )
}

export function sessionMessageCount(messages: unknown): number {
  return Array.isArray(messages) ? messages.length : 0
}

export function sessionTimelineCount(timeline: unknown): number {
  return Array.isArray(timeline) ? timeline.length : 0
}

export function indexSessionEvidence(sessions: SessionEvidence[]): {
  byArtworkId: Map<number, SessionEvidence[]>
  bySlug: Map<string, SessionEvidence[]>
} {
  const byArtworkId = new Map<number, SessionEvidence[]>()
  const bySlug = new Map<string, SessionEvidence[]>()
  for (const session of sessions) {
    if (session.primaryArtworkId != null) {
      const list = byArtworkId.get(session.primaryArtworkId) ?? []
      list.push(session)
      byArtworkId.set(session.primaryArtworkId, list)
    }
    if (session.primarySlug) {
      const list = bySlug.get(session.primarySlug) ?? []
      list.push(session)
      bySlug.set(session.primarySlug, list)
    }
  }
  return { byArtworkId, bySlug }
}

export function primarySessionsForArtwork(
  artwork: { id: number; slug: string },
  index: ReturnType<typeof indexSessionEvidence>,
): SessionEvidence[] {
  const byId = index.byArtworkId.get(artwork.id) ?? []
  const seen = new Set(byId.map((s) => s.sessionId))
  const bySlug = (index.bySlug.get(artwork.slug) ?? []).filter((s) => !seen.has(s.sessionId))
  return [...byId, ...bySlug]
}

function classifyEvidence(
  primarySessions: SessionEvidence[],
  withMessages: SessionEvidence[],
  bestWithMessages: SessionEvidence | null,
): SessionEvidenceKind {
  if (bestWithMessages) {
    return bestWithMessages.timelineCount > 0 ? 'live-timeline' : 'envelope-transcript'
  }
  if (primarySessions.some((s) => s.messageCount === 0)) return 'ghost-shell'
  return 'no-primary-session'
}

/**
 * Derive public reasoningStatus from why-fields + completed primary sessions.
 * Pass only sessions whose primaryArtwork/artworkRecord is this work.
 */
export function deriveReasoningStatus(
  artwork: WhyFieldSource,
  primarySessions: SessionEvidence[],
): DerivedReasoningStatus {
  const hasWhy = artworkHasWhy(artwork)
  const withMessages = primarySessions.filter((s) => s.messageCount > 0)
  const hasCompletedSessionWithMessages = withMessages.length > 0
  const bestWithMessages =
    [...withMessages].sort((a, b) => b.messageCount - a.messageCount)[0] ?? null
  const bestSession =
    bestWithMessages ??
    [...primarySessions].sort((a, b) => b.messageCount - a.messageCount)[0] ??
    null

  const evidenceKind = classifyEvidence(primarySessions, withMessages, bestWithMessages)

  if (hasCompletedSessionWithMessages && hasWhy) {
    return {
      status: 'complete',
      partialKind: null,
      hasWhy,
      hasCompletedSessionWithMessages,
      bestSession: bestWithMessages,
      evidenceKind,
    }
  }
  if (hasCompletedSessionWithMessages) {
    return {
      status: 'partial',
      partialKind: 'session-but-no-why',
      hasWhy,
      hasCompletedSessionWithMessages,
      bestSession: bestWithMessages,
      evidenceKind,
    }
  }
  if (hasWhy) {
    return {
      status: 'partial',
      partialKind: 'why-but-no-session',
      hasWhy,
      hasCompletedSessionWithMessages,
      bestSession,
      evidenceKind,
    }
  }
  return {
    status: 'stub',
    partialKind: null,
    hasWhy,
    hasCompletedSessionWithMessages,
    bestSession,
    evidenceKind,
  }
}

/** Overlay derived status onto an artwork document for public/read consumers. */
export function withDerivedReasoningStatus<T extends WhyFieldSource & { reasoningStatus?: string | null }>(
  artwork: T,
  primarySessions: SessionEvidence[],
): T & { reasoningStatus: ReasoningStatusValue } {
  const derived = deriveReasoningStatus(artwork, primarySessions)
  return { ...artwork, reasoningStatus: derived.status }
}
