import { describe, expect, it } from 'vitest'

import {
  buildEditionVocabularyOptions,
  isAllowedEditionVocabularyValue,
  vocabularyValueFromLabel,
} from '@/lib/artwork/editionTierVocabulary'

describe('editionTierVocabulary', () => {
  it('includes builtin and custom options with Other last', () => {
    const options = buildEditionVocabularyOptions('substrate', [
      { value: 'hahnemuhle-photo-rag', label: 'Hahnemühle Photo Rag' },
    ])

    expect(options.map((option) => option.value)).toEqual([
      'paper',
      'aluminum-mount',
      'canvas',
      'oil-on-canvas',
      'hahnemuhle-photo-rag',
      'other',
    ])
  })

  it('allows builtin and custom stored values', () => {
    expect(isAllowedEditionVocabularyValue('printTechnique', 'giclee')).toBe(true)
    expect(isAllowedEditionVocabularyValue('printTechnique', 'risograph', ['risograph'])).toBe(true)
    expect(isAllowedEditionVocabularyValue('printTechnique', 'other')).toBe(false)
  })

  it('slugifies custom labels without colliding with builtins', () => {
    expect(vocabularyValueFromLabel('Hahnemühle Photo Rag', 'substrate')).toBe(
      'hahnem-hle-photo-rag',
    )
    expect(vocabularyValueFromLabel('Paper', 'substrate')).toBe('custom-paper')
  })
})
