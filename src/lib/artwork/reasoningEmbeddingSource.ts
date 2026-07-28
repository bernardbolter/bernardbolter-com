import { preferredVisionAnalysis } from '@/lib/artwork/visionPage'
import type { Artwork } from '@/payload-types'

/** Minimum non-trivial text length before we attempt an embedding. */
export const REASONING_EMBEDDING_MIN_CHARS = 40

export type ReasoningEmbeddingSourceType =
  | 'formal-contribution-assessment'
  | 'vision-analysis-preferred'

export type ReasoningEmbeddingSource = {
  sourceType: ReasoningEmbeddingSourceType
  sourceText: string
}

function normalizeSourceText(value: string | null | undefined): string | null {
  const text = value?.replace(/\s+/g, ' ').trim() ?? ''
  if (text.length < REASONING_EMBEDDING_MIN_CHARS) return null
  return text
}

/**
 * Deterministic source precedence for reasoning-text embeddings:
 * 1. formalContributionAssessment when present/non-trivial
 * 2. preferredVisionAnalysis text (quality-biased; matches Tier-1 gist)
 * 3. otherwise skip
 */
export function resolveReasoningEmbeddingSource(
  artwork: Pick<Artwork, 'formalContributionAssessment' | 'visionAnalyses'>,
): ReasoningEmbeddingSource | null {
  const formal = normalizeSourceText(artwork.formalContributionAssessment)
  if (formal) {
    return {
      sourceType: 'formal-contribution-assessment',
      sourceText: formal,
    }
  }

  const preferred = preferredVisionAnalysis(artwork as Artwork)
  const vision = normalizeSourceText(preferred?.text)
  if (vision) {
    return {
      sourceType: 'vision-analysis-preferred',
      sourceText: vision,
    }
  }

  return null
}
