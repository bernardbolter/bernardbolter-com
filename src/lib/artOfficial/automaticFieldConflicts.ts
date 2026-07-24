/**
 * Automatic-field conflict detection (sessions-audit-cursor-spec Part 3a).
 * Only image-analysis / knowledge-base sourced fields — never conversation.
 */
import type { Artwork } from '@/payload-types'

export const AUTOMATIC_CONFLICT_FIELDS = new Set([
  'dominantColors',
  'paintedFieldColors',
  'compositionalNotes',
  'movementTags',
  'styleTags',
  'subjectTags',
  'genreTags',
  'periodTags',
  'ach.overlay.overlayColors',
  'ach.overlay.overlayRects',
  'orientation',
])

export type AutomaticSource = 'image-analysis' | 'knowledge-base'

export type PriorFieldConflictRow = {
  field: string
  priorValue?: unknown
  priorSessionRef?: number | null
  newValue?: unknown
  resolution?: 'kept-prior' | 'replaced' | 'merged' | 'unresolved' | null
  id?: string | null
}

function normalizeComparable(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const out: string[] = []
  for (const entry of value) {
    if (typeof entry === 'string') {
      out.push(entry.trim().toLowerCase())
      continue
    }
    if (entry && typeof entry === 'object' && 'hex' in entry) {
      const hex = (entry as { hex?: unknown }).hex
      if (typeof hex === 'string') out.push(hex.trim().toLowerCase())
    }
  }
  return out
}

/** True when newValue is materially different from committed (not a tag-list superset). */
export function isMateriallyDifferent(committed: unknown, proposed: unknown): boolean {
  if (committed == null || committed === '') return false
  if (proposed == null) return true

  const committedTags = asStringArray(committed)
  const proposedTags = asStringArray(proposed)
  if (committedTags && proposedTags) {
    const committedSet = new Set(committedTags.filter(Boolean))
    if (committedSet.size === 0) return false
    const proposedSet = new Set(proposedTags.filter(Boolean))
    // Superset or equal → not a conflict
    for (const tag of committedSet) {
      if (!proposedSet.has(tag)) return true
    }
    return false
  }

  return normalizeComparable(committed) !== normalizeComparable(proposed)
}

export function readCommittedArtworkField(
  artwork: Artwork | null | undefined,
  field: string,
): unknown {
  if (!artwork) return undefined
  if (field === 'ach.overlay.overlayColors') {
    return artwork.ach?.overlay?.overlayColors
  }
  if (field === 'ach.overlay.overlayRects') {
    return artwork.ach?.overlay?.overlayRects
  }
  return (artwork as unknown as Record<string, unknown>)[field]
}

export function isAutomaticConflictField(field: string): boolean {
  return AUTOMATIC_CONFLICT_FIELDS.has(field)
}

export function shouldCheckAutomaticConflict(
  field: string,
  source: string | undefined,
): boolean {
  if (!isAutomaticConflictField(field)) return false
  return source === 'image-analysis' || source === 'knowledge-base'
}

export function mergePriorFieldConflicts(
  existing: PriorFieldConflictRow[] | null | undefined,
  next: PriorFieldConflictRow,
): PriorFieldConflictRow[] {
  const list = Array.isArray(existing) ? [...existing] : []
  const idx = list.findIndex((row) => row.field === next.field)
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...next }
    return list
  }
  list.push(next)
  return list
}

export function formatConflictQuestion(conflicts: PriorFieldConflictRow[]): string {
  if (conflicts.length === 0) return ''
  const lines = conflicts.map((c) => {
    const prior = normalizeComparable(c.priorValue)
    const next = normalizeComparable(c.newValue)
    return `- ${c.field}: already set to ${prior.slice(0, 120)} from a prior session. Fresh analysis suggests ${next.slice(0, 120)}.`
  })
  return [
    `${conflicts.length} automatic field(s) already have committed values that differ from this session's analysis.`,
    'Ask the artist once (batch): Keep the original, replace it, or merge?',
    ...lines,
    'Do not silently stage the new automatic values. Only write after the artist chooses.',
  ].join('\n')
}

export function fieldsCoveredFromTimeline(
  timeline: Array<{ field?: string | null }> | null | undefined,
): Array<{ field: string }> {
  if (!Array.isArray(timeline)) return []
  const seen = new Set<string>()
  const out: Array<{ field: string }> = []
  for (const entry of timeline) {
    const field = typeof entry.field === 'string' ? entry.field.trim() : ''
    if (!field || seen.has(field)) continue
    seen.add(field)
    out.push({ field })
  }
  return out
}

export type StruggleType =
  | 'commit-error'
  | 'description-upload-mismatch'
  | 'blank-turn-density'
  | 'unresolved-lookup-failure'
  | 'other'

export type SessionStruggleFlag = {
  hasStruggle?: boolean | null
  struggleTypes?: StruggleType[] | null
  note?: string | null
}

export function mergeStruggleFlag(
  existing: SessionStruggleFlag | null | undefined,
  type: StruggleType,
  note?: string,
): SessionStruggleFlag {
  const types = new Set(existing?.struggleTypes ?? [])
  types.add(type)
  return {
    hasStruggle: true,
    struggleTypes: [...types],
    note: note?.trim()
      ? [existing?.note, note].filter(Boolean).join('\n')
      : existing?.note ?? null,
  }
}
