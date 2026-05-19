import { plainToLexical } from './plainToLexical'

/**
 * Materialise an `artworks` patch from a session timeline.
 *
 * Each timeline entry of the form `{ targetCollection: 'artworks', field, value }`
 * is nested into the patch using `field` as a dotted Payload path
 * (e.g. `ach.overlay.overlayColors` → `{ ach: { overlay: { overlayColors: ... } } }`).
 *
 * For known rich-text fields the value is converted from plain text via
 * `plainToLexical` so the agent can pass simple prose strings.
 */
const RICH_TEXT_PATHS = new Set<string>([
  // Base artwork
  'description',
  'descriptionLong',
  'provenanceNotes',
  // ACH tab (handoff-ach-schema-extension.md Part 2)
  'ach.mapAndTour.tourStopCopy',
  'ach.location.wikipediaExcerpt',
  'ach.location.conceptCopy',
  'ach.ar.historyTranscript',
  'ach.ar.freestyleTranscript',
])

export type ArtworkTimelineEntry = {
  targetCollection?: string
  field?: string
  value?: unknown
}

function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const segments = path.split('.').filter(Boolean)
  if (segments.length === 0) return

  let cursor: Record<string, unknown> = obj
  for (let i = 0; i < segments.length - 1; i += 1) {
    const key = segments[i]
    const next = cursor[key]
    if (next == null || typeof next !== 'object' || Array.isArray(next)) {
      cursor[key] = {}
    }
    cursor = cursor[key] as Record<string, unknown>
  }
  cursor[segments[segments.length - 1]] = value
}

function isPlainTextString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

/** Payload array rows: `{ keyword: string }`. Agents often send plain strings. */
export function normalizeConceptualKeywords(
  value: unknown,
): Array<{ keyword: string }> | undefined {
  if (!Array.isArray(value)) return undefined

  const out: Array<{ keyword: string }> = []
  for (const item of value) {
    if (typeof item === 'string') {
      const keyword = item.trim()
      if (keyword) out.push({ keyword })
      continue
    }
    if (item && typeof item === 'object' && 'keyword' in item) {
      const keyword = String((item as { keyword: unknown }).keyword ?? '').trim()
      if (keyword) out.push({ keyword })
    }
  }
  return out.length > 0 ? out : undefined
}

export type SessionArtworkDrafts = {
  agentDraftDescriptionShort?: string | null
  agentDraftDescriptionLong?: string | null
  agentDraftConceptualKeywords?: Array<{ keyword?: string | null } | string> | null
  agentDraftFormalContributionAssessment?: string | null
}

/** Confirmation-step drafts stored on the session (not the timeline). */
export function buildArtworkDraftPatchFromSession(
  session: SessionArtworkDrafts,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {}

  const short = session.agentDraftDescriptionShort?.trim()
  if (short) patch.descriptionShort = short

  const long = session.agentDraftDescriptionLong?.trim()
  if (long) patch.descriptionLong = plainToLexical(long)

  const formal = session.agentDraftFormalContributionAssessment?.trim()
  if (formal) patch.formalContributionAssessment = formal

  const keywords = normalizeConceptualKeywords(session.agentDraftConceptualKeywords)
  if (keywords) patch.conceptualKeywords = keywords

  return patch
}

/** Final pass before Payload create/update — normalizes known fragile shapes. */
export function sanitizeArtworkCommitPatch(
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...patch }
  if ('conceptualKeywords' in out) {
    const keywords = normalizeConceptualKeywords(out.conceptualKeywords)
    if (keywords) out.conceptualKeywords = keywords
    else delete out.conceptualKeywords
  }
  return out
}

export function buildArtworkPatchFromTimeline(
  timeline: unknown,
): Record<string, unknown> {
  if (!Array.isArray(timeline)) return {}
  const patch: Record<string, unknown> = {}

  for (const raw of timeline) {
    if (!raw || typeof raw !== 'object') continue
    const entry = raw as ArtworkTimelineEntry
    if (entry.targetCollection !== 'artworks' || !entry.field) continue
    const field = String(entry.field).trim()
    if (!field) continue

    let value: unknown = entry.value
    if (RICH_TEXT_PATHS.has(field) && isPlainTextString(value)) {
      value = plainToLexical(value.trim())
    }
    if (field === 'conceptualKeywords' || field.endsWith('.conceptualKeywords')) {
      value = normalizeConceptualKeywords(value)
    }
    if (value !== undefined) {
      setPath(patch, field, value)
    }
  }

  return patch
}

/**
 * Deep merge `source` into `target`. Plain objects are merged recursively; everything
 * else (including arrays) replaces wholesale. Used to overlay the server-built timeline
 * patch onto any client-provided patch so server data wins.
 */
export function mergeArtworkPatches(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...target }
  for (const [key, value] of Object.entries(source)) {
    const existing = out[key]
    const bothPlainObjects =
      existing != null &&
      typeof existing === 'object' &&
      !Array.isArray(existing) &&
      value != null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    out[key] = bothPlainObjects
      ? mergeArtworkPatches(
          existing as Record<string, unknown>,
          value as Record<string, unknown>,
        )
      : value
  }
  return out
}
