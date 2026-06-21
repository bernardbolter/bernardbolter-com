import { plainToLexical } from './plainToLexical'
import { normalizeConceptualKeywords } from './buildArtworkPatch'

const RICH_TEXT_PATHS = new Set(['descriptionLong'])

export type EventTimelineEntry = {
  targetCollection?: string
  field?: string
  value?: unknown
  confidence?: string
  source?: string
  timestamp?: string
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

function normalizeSameAs(value: unknown): Array<{ uri: string }> | undefined {
  if (!Array.isArray(value)) return undefined
  const out: Array<{ uri: string }> = []
  for (const item of value) {
    if (typeof item === 'string') {
      const uri = item.trim()
      if (uri) out.push({ uri })
      continue
    }
    if (item && typeof item === 'object' && 'uri' in item) {
      const uri = String((item as { uri: unknown }).uri ?? '').trim()
      if (uri) out.push({ uri })
    }
  }
  return out.length ? out : undefined
}

export function buildEventPatchFromTimeline(
  timeline: EventTimelineEntry[],
): Record<string, unknown> {
  const patch: Record<string, unknown> = {}

  for (const entry of timeline) {
    if (entry.targetCollection !== 'events') continue
    const field = entry.field
    if (!field) continue

    let value = entry.value
    if (RICH_TEXT_PATHS.has(field) && typeof value === 'string') {
      value = plainToLexical(value)
    }
    if (field === 'sameAs' || field.endsWith('.sameAs')) {
      const normalized = normalizeSameAs(value)
      if (normalized) value = normalized
    }
    if (field === 'conceptualKeywords') {
      const normalized = normalizeConceptualKeywords(value)
      if (normalized) value = normalized
    }

    setPath(patch, field, value)
  }

  return patch
}

export function buildEventFieldConfidenceMap(
  timeline: EventTimelineEntry[],
): Record<string, unknown> {
  const map: Record<string, unknown> = {}

  for (const entry of timeline) {
    if (entry.targetCollection !== 'events' || !entry.field) continue
    const source = entry.source ?? 'phase-b-sonnet'
    const confidence = entry.confidence === 'confirmed' ? 'high' : 'medium'
    map[entry.field] = {
      source:
        source === 'conversation' ? 'phase-b-sonnet'
        : source === 'phase-a-haiku' ? 'phase-a-haiku'
        : source === 'intake' ? 'intake'
        : source,
      confidence,
      generatedAt: entry.timestamp ?? new Date().toISOString(),
      modelVersion:
        source === 'phase-a-haiku' ? 'claude-haiku-4-5'
        : 'claude-sonnet-4-6',
      confirmed: entry.confidence === 'confirmed',
    }
  }

  return map
}

export type SessionEventDrafts = {
  agentDraftDescriptionShort?: string | null
  agentDraftDescriptionLong?: string | null
  agentDraftConceptualKeywords?: Array<{ keyword?: string | null } | string> | null
}

export function buildEventDraftPatchFromSession(
  session: SessionEventDrafts,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {}

  const short = session.agentDraftDescriptionShort?.trim()
  if (short) patch.descriptionShort = short

  const long = session.agentDraftDescriptionLong?.trim()
  if (long) patch.descriptionLong = plainToLexical(long)

  const keywords = normalizeConceptualKeywords(session.agentDraftConceptualKeywords)
  if (keywords) patch.conceptualKeywords = keywords

  return patch
}
