import { plainToLexical } from './plainToLexical'

export type ArtistPatchMode = 'biography' | 'artist-statement'

const BIOGRAPHY_FIELDS = ['bioFull', 'bioMedium', 'bioShort'] as const
const STATEMENT_FIELDS = ['statementFull', 'statementMedium', 'statementShort'] as const

const RICH_TEXT_FIELDS = new Set([
  'bioFull',
  'bioMedium',
  'statementFull',
  'statementMedium',
])

export type TimelineLike = {
  targetCollection?: string
  field?: string
  value?: unknown
}

export function buildArtistPatchFromTimeline(
  timeline: unknown,
  mode: ArtistPatchMode,
): Record<string, unknown> {
  if (!Array.isArray(timeline)) return {}
  const allowed =
    mode === 'biography' ? BIOGRAPHY_FIELDS : STATEMENT_FIELDS
  const allowedSet = new Set<string>(allowed)
  const patch: Record<string, unknown> = {}

  for (const raw of timeline) {
    if (!raw || typeof raw !== 'object') continue
    const entry = raw as TimelineLike
    if (entry.targetCollection !== 'artists' || !entry.field) continue
    if (!allowedSet.has(entry.field)) continue

    const text =
      typeof entry.value === 'string'
        ? entry.value
        : entry.value != null
          ? JSON.stringify(entry.value)
          : ''
    if (!text.trim()) continue

    patch[entry.field] = RICH_TEXT_FIELDS.has(entry.field)
      ? plainToLexical(text.trim())
      : text.trim()
  }

  return patch
}
