import type { StagedMediaAttachment } from './stagedMedia'

type TimelineEntry = {
  targetCollection?: string
  field?: string
}

/** Whether this session already has a primary image staged (timeline or stagedMedia). */
export function hasPrimaryImageStaged(
  timeline: TimelineEntry[],
  stagedMedia?: unknown,
): boolean {
  if (
    timeline.some(
      (e) => e.targetCollection === 'artworks' && e.field === 'primaryImage',
    )
  ) {
    return true
  }

  if (!Array.isArray(stagedMedia)) return false

  return stagedMedia.some(
    (row) =>
      row &&
      typeof row === 'object' &&
      (row as StagedMediaAttachment).slotId === 'primary' &&
      (row as StagedMediaAttachment).kind !== 'skipped' &&
      (row as StagedMediaAttachment).mediaId != null,
  )
}
