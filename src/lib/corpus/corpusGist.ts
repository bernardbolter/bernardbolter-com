import { latestVisionAnalysis } from '@/lib/artwork/visionPage'
import type { Artwork } from '@/payload-types'

/** One-sentence-ish gist from latest vision analysis — Tier 1 triage only. */
export function corpusGistFromArtwork(artwork: Artwork): string | null {
  const latest = latestVisionAnalysis(artwork)
  if (!latest?.text) return null

  const text = latest.text.replace(/\s+/g, ' ').trim()
  if (!text) return null

  const sentenceMatch = text.match(/^(.+?[.!?])(\s|$)/)
  const sentence = sentenceMatch?.[1]?.trim() || text
  if (sentence.length <= 220) return sentence
  return `${sentence.slice(0, 217).trim()}…`
}
