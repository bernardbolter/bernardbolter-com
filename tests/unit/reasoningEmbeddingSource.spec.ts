import { describe, expect, it } from 'vitest'

import { resolveReasoningEmbeddingSource } from '@/lib/artwork/reasoningEmbeddingSource'
import type { Artwork } from '@/payload-types'

function artwork(
  partial: Partial<Pick<Artwork, 'formalContributionAssessment' | 'visionAnalyses'>>,
): Pick<Artwork, 'formalContributionAssessment' | 'visionAnalyses'> {
  return {
    formalContributionAssessment: partial.formalContributionAssessment ?? null,
    visionAnalyses: partial.visionAnalyses ?? [],
  }
}

describe('resolveReasoningEmbeddingSource', () => {
  it('prefers formalContributionAssessment when present', () => {
    const result = resolveReasoningEmbeddingSource(
      artwork({
        formalContributionAssessment:
          'This work contributes a vertical city language that later recurs across Towers.',
        visionAnalyses: [
          {
            id: '1',
            text: 'A tall figure stands against a dense urban grid of windows and façades.',
            model: 'claude-sonnet-4-6',
            date: '2026-07-01',
          },
        ],
      }),
    )

    expect(result?.sourceType).toBe('formal-contribution-assessment')
    expect(result?.sourceText).toContain('vertical city language')
  })

  it('falls back to preferred vision analysis when formal text is absent', () => {
    const result = resolveReasoningEmbeddingSource(
      artwork({
        formalContributionAssessment: null,
        visionAnalyses: [
          {
            id: '1',
            text: 'Low-quality moondream description of a building silhouette.',
            model: 'moondream-station',
            date: '2026-06-01',
          },
          {
            id: '2',
            text: 'Preferred Claude analysis describing architectural compression and figure posture.',
            model: 'claude-sonnet-4-6',
            date: '2026-07-01',
          },
        ],
      }),
    )

    expect(result?.sourceType).toBe('vision-analysis-preferred')
    expect(result?.sourceText).toContain('architectural compression')
  })

  it('skips trivial formal text and uses vision instead', () => {
    const result = resolveReasoningEmbeddingSource(
      artwork({
        formalContributionAssessment: 'too short',
        visionAnalyses: [
          {
            id: '1',
            text: 'A sufficiently long preferred vision analysis for embedding generation purposes.',
            model: 'gpt-4o',
            date: '2026-07-01',
          },
        ],
      }),
    )

    expect(result?.sourceType).toBe('vision-analysis-preferred')
  })

  it('returns null when neither source is usable', () => {
    const result = resolveReasoningEmbeddingSource(
      artwork({
        formalContributionAssessment: 'x',
        visionAnalyses: [{ id: '1', text: 'short', model: 'gpt-4o', date: '2026-07-01' }],
      }),
    )
    expect(result).toBeNull()
  })
})
