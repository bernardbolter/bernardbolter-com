import { plainToLexical } from './plainToLexical'

const RICH_TEXT_FIELDS = new Set(['description', 'descriptionLong'])

export type TriptychTimelineEntry = {
  targetCollection?: string
  field?: string
  value?: unknown
}

/**
 * Materialise a `triptychs` patch from session timeline entries (corpus + core text only).
 * Commerce fields are never staged via Art/Official.
 */
export function buildTriptychPatchFromTimeline(timeline: unknown): Record<string, unknown> {
  if (!Array.isArray(timeline)) return {}
  const patch: Record<string, unknown> = {}

  for (const raw of timeline) {
    if (!raw || typeof raw !== 'object') continue
    const entry = raw as TriptychTimelineEntry
    if (entry.targetCollection !== 'triptychs' || !entry.field) continue

    const field = String(entry.field).trim()
    if (!field) continue

    let value: unknown = entry.value
    if (RICH_TEXT_FIELDS.has(field) && typeof value === 'string' && value.trim()) {
      value = plainToLexical(value.trim())
    }

    patch[field] = value
  }

  return patch
}
