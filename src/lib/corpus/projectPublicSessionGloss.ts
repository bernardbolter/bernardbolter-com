import type { Session } from '@/payload-types'

/**
 * Project a Session for public HTML gloss surfaces (/sessions index, bio entries,
 * statement throughlines). Keeps field *names* for counts; drops timeline values
 * and conflict prior/new payloads (studio addresses, etc.).
 * Private streams (firstImpression, sessionNotes, agentDraft*, messages) must never
 * be selected into these objects — see Tier 5 API for those.
 */
export function projectPublicSessionGloss(session: Session): Session {
  const timeline = Array.isArray(session.fieldUpdateTimeline)
    ? session.fieldUpdateTimeline.map((row) => {
        if (!row || typeof row !== 'object') return row
        const field = 'field' in row ? (row as { field?: string | null }).field : null
        return { field: field ?? null }
      })
    : session.fieldUpdateTimeline

  const conflicts = Array.isArray(session.priorFieldConflicts)
    ? session.priorFieldConflicts.map((row) => {
        if (!row || typeof row !== 'object') return {}
        const field = 'field' in row ? (row as { field?: string | null }).field : null
        return { field: field ?? null }
      })
    : session.priorFieldConflicts

  return {
    ...session,
    fieldUpdateTimeline: timeline,
    priorFieldConflicts: conflicts as Session['priorFieldConflicts'],
  }
}
