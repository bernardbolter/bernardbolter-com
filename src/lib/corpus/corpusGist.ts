import { preferredVisionAnalysis } from '@/lib/artwork/visionPage'
import { TIER1_GIST_MAX_CHARS } from '@/lib/corpus/constants'
import { truncateAtBoundary } from '@/lib/corpus/truncateAtBoundary'
import type { Artwork } from '@/payload-types'

/** One-sentence-ish gist from preferred vision analysis — Tier 1 triage only. */
export function corpusGistFromArtwork(artwork: Artwork): string | null {
  const preferred = preferredVisionAnalysis(artwork)
  if (!preferred?.text) return null

  const text = preferred.text.replace(/\s+/g, ' ').trim()
  if (!text) return null

  const sentenceMatch = text.match(/^(.+?[.!?])(\s|$)/)
  const sentence = sentenceMatch?.[1]?.trim() || text
  return truncateAtBoundary(sentence, TIER1_GIST_MAX_CHARS)
}
