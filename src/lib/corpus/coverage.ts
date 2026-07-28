import { preferredVisionAnalysis } from '@/lib/artwork/visionPage'
import type { Artwork } from '@/payload-types'

export type CorpusCoverage = {
  matched: number
  withArtistIntent: number
  withVisionAnalysis: number
  withSessions: number
  reasoningComplete: number
}

/** Coverage for the matched set (not the whole corpus). */
export function computeCoverage(
  artworks: Artwork[],
  sessionCountBySlug: Map<string, number>,
): CorpusCoverage {
  let withArtistIntent = 0
  let withVisionAnalysis = 0
  let withSessions = 0
  let reasoningComplete = 0

  for (const artwork of artworks) {
    if (artwork.intent?.trim() || artwork.descriptionShort?.trim()) withArtistIntent += 1
    if (preferredVisionAnalysis(artwork)) withVisionAnalysis += 1
    if ((sessionCountBySlug.get(artwork.slug) ?? 0) > 0) withSessions += 1
    if (artwork.reasoningStatus === 'complete') reasoningComplete += 1
  }

  return {
    matched: artworks.length,
    withArtistIntent,
    withVisionAnalysis,
    withSessions,
    reasoningComplete,
  }
}
