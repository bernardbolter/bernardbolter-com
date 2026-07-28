import { preferredVisionAnalysis } from '@/lib/artwork/visionPage'
import { TIER1_GIST_MAX_CHARS } from '@/lib/corpus/constants'
import { truncateAtBoundary } from '@/lib/corpus/truncateAtBoundary'
import type { Artwork } from '@/payload-types'

export type ResolvedGist = {
  text: string | null
  source: string | null
}

function firstSentence(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  const sentenceMatch = normalized.match(/^(.+?[.!?])(\s|$)/)
  return sentenceMatch?.[1]?.trim() || normalized
}

/**
 * Gist with provenance. Prefer artist-authored prose over vision analysis.
 * Truncate steps 1 and 3 at boundaries; never truncate intentLine (step 2).
 */
export function resolveGist(artwork: Artwork): ResolvedGist {
  const descriptionShort = artwork.descriptionShort?.replace(/\s+/g, ' ').trim()
  if (descriptionShort) {
    const sentence = firstSentence(descriptionShort)
    const text = truncateAtBoundary(sentence, TIER1_GIST_MAX_CHARS)
    if (text) return { text, source: 'artist:descriptionShort' }
  }

  const intentLine = artwork.intent?.replace(/\s+/g, ' ').trim()
  if (intentLine && intentLine.length <= TIER1_GIST_MAX_CHARS) {
    return { text: intentLine, source: 'artist:intentLine' }
  }

  const preferred = preferredVisionAnalysis(artwork)
  if (preferred?.text) {
    const sentence = firstSentence(preferred.text)
    const text = truncateAtBoundary(sentence, TIER1_GIST_MAX_CHARS)
    if (text) {
      return { text, source: `vision:${preferred.model}` }
    }
  }

  return { text: null, source: null }
}

/** @deprecated Prefer resolveGist — kept for HTML corpus page callers. */
export function corpusGistFromArtwork(artwork: Artwork): string | null {
  return resolveGist(artwork).text
}
