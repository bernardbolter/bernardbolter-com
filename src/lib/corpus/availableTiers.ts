import type { Artwork } from '@/payload-types'

function hasTags(artwork: Artwork): boolean {
  const tagGroups = [
    artwork.movementTags,
    artwork.styleTags,
    artwork.subjectTags,
    artwork.genreTags,
    artwork.periodTags,
  ]
  if (tagGroups.some((group) => Array.isArray(group) && group.length > 0)) return true
  return (artwork.conceptualKeywords ?? []).some((row) => Boolean(row?.keyword?.trim()))
}

/**
 * Field-presence tiers — not reasoningStatus.
 * Absent key `"3"` means no such rung; `"5": false` means empty for this work.
 */
export function computeAvailableTiers(
  artwork: Artwork,
  sessionCount: number,
): Record<string, boolean> {
  const hasSurveyDepth = Boolean(
    artwork.descriptionShort?.trim() ||
      artwork.intent?.trim() ||
      (artwork.dominantColors ?? []).some((row) => Boolean(row?.hex?.trim())) ||
      hasTags(artwork),
  )

  return {
    '1': true,
    '2': hasSurveyDepth,
    '4': true,
    '5': sessionCount > 0,
  }
}
