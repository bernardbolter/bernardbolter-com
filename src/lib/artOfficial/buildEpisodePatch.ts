export function buildEpisodePatchFromTimeline(
  timeline: unknown,
): Record<string, unknown> {
  if (!Array.isArray(timeline)) return {}
  const patch: Record<string, unknown> = {}
  for (const entry of timeline) {
    if (!entry || typeof entry !== 'object') continue
    const row = entry as Record<string, unknown>
    if (row.targetCollection !== 'episodes') continue
    if (typeof row.field === 'string') {
      patch[row.field] = row.value
    }
  }
  return patch
}
