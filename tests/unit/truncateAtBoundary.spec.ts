import { describe, expect, it } from 'vitest'

import { truncateAtBoundary } from '@/lib/corpus/truncateAtBoundary'

describe('truncateAtBoundary', () => {
  it('returns short text unchanged', () => {
    expect(truncateAtBoundary('Short gist.', 200)).toBe('Short gist.')
  })

  it('prefers a complete sentence when it falls past half the limit', () => {
    const text =
      'First sentence ends here after enough characters. Second sentence continues with more words about the painting surface and colour.'
    // First sentence is ~48 chars; with max 80, lastSentenceEnd > 40 → keep the sentence.
    expect(truncateAtBoundary(text, 80)).toBe(
      'First sentence ends here after enough characters.',
    )
  })

  it('falls back to a word boundary with ellipsis when no good sentence end', () => {
    const text =
      'Compositional towers and the pictorial architecture dominate rather than support the figure in space'
    const result = truncateAtBoundary(text, 40)
    expect(result).toBe('Compositional towers and the pictorial…')
  })

  it('does not cut mid-word when falling back', () => {
    const text = 'abcdefghijklmnopqrstuvwxyz and then more words after that long token'
    const result = truncateAtBoundary(text, 20)
    // No space in the first 20 chars → hard slice + ellipsis (unavoidable)
    expect(result.endsWith('…')).toBe(true)
    expect(result.length).toBeLessThanOrEqual(21)
  })
})
