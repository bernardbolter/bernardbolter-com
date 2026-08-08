/**
 * Public HTML transcript projection for Art/Official sessions.
 * Render-layer only: skip empty-content messages; do not alter Tier 5 JSON.
 */

export type SessionTranscriptTurn = {
  role: 'user' | 'assistant'
  content: string
}

/** Default-visible message count (~8 exchanges) before progressive disclosure. */
export const SESSION_TRANSCRIPT_VISIBLE_COUNT = 16

function isRenderableRole(role: unknown): role is 'user' | 'assistant' {
  return role === 'user' || role === 'assistant'
}

/**
 * Project session.messages for SSR HTML.
 * Skips empty-string content only — typos, kickoff text, and non-empty rows stay.
 */
export function messagesForPublicTranscript(messages: unknown): SessionTranscriptTurn[] {
  if (!Array.isArray(messages)) return []

  const out: SessionTranscriptTurn[] = []
  for (const entry of messages) {
    if (!entry || typeof entry !== 'object') continue
    const record = entry as Record<string, unknown>
    if (!isRenderableRole(record.role)) continue
    if (typeof record.content !== 'string') continue
    // Exact empty string — image-upload artifacts. Do not trim; whitespace-only stays.
    if (record.content === '') continue
    out.push({ role: record.role, content: record.content })
  }
  return out
}

export function sessionTranscriptRoleLabel(role: SessionTranscriptTurn['role']): string {
  return role === 'user' ? 'Artist' : 'Art/Official'
}
