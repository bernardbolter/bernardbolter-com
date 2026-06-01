import type { ArtworkTimelineEntry } from './buildArtworkPatch'

export type SequencingTimelineEntry = ArtworkTimelineEntry & {
  artworkSlug?: string
}

/** Group staged sequencing fields by artwork slug (or `_session` for implicit target). */
export function buildSequencingPatchesFromTimeline(
  timeline: unknown,
): Map<string, Record<string, unknown>> {
  const patches = new Map<string, Record<string, unknown>>()
  if (!Array.isArray(timeline)) return patches

  for (const raw of timeline) {
    if (!raw || typeof raw !== 'object') continue
    const entry = raw as SequencingTimelineEntry
    if (entry.targetCollection !== 'artworks' || !entry.field) continue

    const key = entry.artworkSlug?.trim() || '_session'
    const patch = patches.get(key) ?? {}
    patch[String(entry.field)] = entry.value
    patches.set(key, patch)
  }

  return patches
}
