import { plainToLexical } from './plainToLexical'

const RICH_TEXT_PATHS = new Set(['descriptionLong'])

export type EventTimelineEntry = {
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

    setPath(patch, field, value)
  }

  return patch
}
