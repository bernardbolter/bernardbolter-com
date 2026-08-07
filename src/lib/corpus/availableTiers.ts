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

/** Same rule as sitemap vision pages — ≥1 analysis with non-empty text. */
export function artworkHasVisionTier(artwork: Pick<Artwork, 'visionAnalyses'>): boolean {
  return (artwork.visionAnalyses ?? []).some((row) => Boolean(row?.text?.trim()))
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

  const tiers: Record<string, boolean> = {
    '1': true,
    '2': hasSurveyDepth,
    '4': true,
    '5': sessionCount > 0,
  }

  if (artworkHasVisionTier(artwork)) {
    tiers['3'] = true
  }

  return tiers
}
