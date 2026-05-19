type TimelineEntry = {
  targetCollection?: string
  field?: string
  value?: unknown
}

/** Latest staged `primaryImage` media id from the session timeline. */
export function primaryImageMediaIdFromTimeline(timeline: TimelineEntry[]): number | null {
  const entries = timeline.filter(
    (e) => e.targetCollection === 'artworks' && e.field === 'primaryImage',
  )
  if (!entries.length) return null

  const value = entries[entries.length - 1]?.value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value)
  return null
}
