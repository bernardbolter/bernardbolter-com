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
    setPath(patch, field, value)
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
