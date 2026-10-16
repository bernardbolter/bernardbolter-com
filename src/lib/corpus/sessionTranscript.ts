/**
 * Public HTML transcript projection for Art/Official sessions.
 * Render-layer only: skip empty-content messages; do not alter Tier 5 JSON.
 */

export type SessionTranscriptTurn = {
  role: 'user' | 'assistant'
  content: string
  /**
   * Field *names* written after this artist turn (from the following assistant
   * `update_field` toolUses). Never values — privacy.
   */
  fieldsWritten?: string[]
}

/**
 * Fallback preview length when no upload beat is found in the public turns.
 * Round number — not protocol-derived.
 */
export const SESSION_TRANSCRIPT_FALLBACK_VISIBLE_COUNT = 24

/** @deprecated Use resolveTranscriptPreviewCount — kept for call-site defaults. */
export const SESSION_TRANSCRIPT_VISIBLE_COUNT = SESSION_TRANSCRIPT_FALLBACK_VISIBLE_COUNT

const UPLOAD_TURN_RE = /I have uploaded|\[image upload/i

function isRenderableRole(role: unknown): role is 'user' | 'assistant' {
  return role === 'user' || role === 'assistant'
}

function fieldNamesFromToolUses(toolUses: unknown): string[] {
  if (!Array.isArray(toolUses)) return []
  const names: string[] = []
  const seen = new Set<string>()
  for (const tool of toolUses) {
    if (!tool || typeof tool !== 'object') continue
    const record = tool as Record<string, unknown>
    if (record.name !== 'update_field') continue
    const input = record.input
    if (!input || typeof input !== 'object') continue
    const field = (input as Record<string, unknown>).field
    if (typeof field !== 'string') continue
    const name = field.trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    names.push(name)
  }
  return names
}

/**
 * Project session.messages for SSR HTML.
 * Skips empty-string content only — typos, kickoff text, and non-empty rows stay.
 * Attaches field-name markers from assistant `update_field` toolUses onto the
 * preceding artist turn (names only, never values).
 */
export function messagesForPublicTranscript(messages: unknown): SessionTranscriptTurn[] {
  if (!Array.isArray(messages)) return []

  const out: SessionTranscriptTurn[] = []
  let lastUserIndex = -1

  for (const entry of messages) {
    if (!entry || typeof entry !== 'object') continue
    const record = entry as Record<string, unknown>
    if (!isRenderableRole(record.role)) continue

    if (record.role === 'assistant') {
      const fields = fieldNamesFromToolUses(record.toolUses)
      if (fields.length > 0 && lastUserIndex >= 0) {
        const prior = out[lastUserIndex]!
        const merged = [...(prior.fieldsWritten ?? [])]
        const seen = new Set(merged)
        for (const name of fields) {
          if (seen.has(name)) continue
          seen.add(name)
          merged.push(name)
        }
        out[lastUserIndex] = { ...prior, fieldsWritten: merged }
      }
    }

    if (typeof record.content !== 'string') continue
    // Exact empty string — image-upload artifacts. Do not trim; whitespace-only stays.
    if (record.content === '') continue

    out.push({ role: record.role, content: record.content })
    if (record.role === 'user') lastUserIndex = out.length - 1
  }
  return out
}

export function sessionTranscriptRoleLabel(role: SessionTranscriptTurn['role']): string {
  return role === 'user' ? 'Artist' : 'Art/Official'
}

/**
 * Preview cut for progressive disclosure.
 * Prefers the end of the pre-upload beat (upload turn + first agent acknowledgment).
 * When no upload signal exists, falls back to a round 24.
 * Full transcript always remains in the HTML via `<details>`.
 */
export function resolveTranscriptPreviewCount(turns: SessionTranscriptTurn[]): number {
  if (turns.length === 0) return 0

  const uploadIdx = turns.findIndex(
    (turn) => turn.role === 'user' && UPLOAD_TURN_RE.test(turn.content),
  )
  if (uploadIdx >= 0) {
    let end = uploadIdx
    const next = turns[uploadIdx + 1]
    if (next?.role === 'assistant') end = uploadIdx + 1
    return Math.min(end + 1, turns.length)
  }

  return Math.min(SESSION_TRANSCRIPT_FALLBACK_VISIBLE_COUNT, turns.length)
}

/** Max named fields shown before “and N more”. */
export const FIELD_WRITE_VISIBLE_COUNT = 4

/**
 * Nested schema paths collapse to their parent
 * (`megacities.series.compositeNumber` → `series`).
 */
export function collapseFieldPath(field: string): string {
  const parts = field
    .trim()
    .split('.')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]!
  return parts[parts.length - 2]!
}

/** Field names for display — collapse paths, de-dupe, light humanize. */
export function normalizeFieldsWritten(fields: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of fields) {
    const collapsed = collapseFieldPath(raw)
    if (!collapsed) continue
    const display = collapsed
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()
    if (!display || seen.has(display)) continue
    seen.add(display)
    out.push(display)
  }
  return out
}

function joinFieldNames(names: string[]): string {
  if (names.length === 1) return names[0]!
  if (names.length === 2) return `${names[0]}, ${names[1]}`
  const head = names.slice(0, -1).join(', ')
  return `${head}, ${names[names.length - 1]}`
}

export type FieldsWrittenDisplay = {
  /** Summary line shown by default (capped). */
  summary: string
  /** Full name list when expandable. */
  allNames: string[]
  hiddenCount: number
}

export function prepareFieldsWrittenDisplay(fields: string[]): FieldsWrittenDisplay | null {
  const names = normalizeFieldsWritten(fields)
  if (names.length === 0) return null

  if (names.length <= FIELD_WRITE_VISIBLE_COUNT) {
    return {
      summary: `wrote ${joinFieldNames(names)}`,
      allNames: names,
      hiddenCount: 0,
    }
  }

  const visible = names.slice(0, FIELD_WRITE_VISIBLE_COUNT)
  const hiddenCount = names.length - FIELD_WRITE_VISIBLE_COUNT
  return {
    summary: `wrote ${joinFieldNames(visible)} and ${hiddenCount} more`,
    allNames: names,
    hiddenCount,
  }
}

/** Quiet annotation under an artist turn. Names only — never values. */
export function formatFieldsWrittenLine(fields: string[]): string | null {
  return prepareFieldsWrittenDisplay(fields)?.summary ?? null
}
