/** Heuristic 0–100 completeness for entity-resolution / merge workflows. */
export function computeEventCompletenessScore(data: Record<string, unknown>): number {
  let filled = 0
  const keys = [
    'title',
    'slug',
    'eventType',
    'startDate',
    'venueName',
    'venueCity',
    'descriptionShort',
    'artworks',
  ] as const
  const total = keys.length

  for (const k of keys) {
    const v = data[k]
    if (v == null || v === '') continue
    if (k === 'artworks' && Array.isArray(v) && v.length === 0) continue
    filled += 1
  }

  return Math.round((filled / total) * 100)
}
