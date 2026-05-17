import { describe, expect, it } from 'vitest'

import { buildPracticeKnowledgePatches } from '@/lib/artOfficial/buildPracticeKnowledgePatches'

describe('buildPracticeKnowledgePatches', () => {
  it('builds lexical patches from staged timeline rows', () => {
    const patches = buildPracticeKnowledgePatches([
      {
        targetCollection: 'practice-knowledge',
        field: 'series',
        value: 'First paragraph.\n\nSecond paragraph.',
      },
      {
        targetCollection: 'practice-knowledge',
        field: 'visual-vocabulary',
        value: 'Muted palette and line.',
      },
    ])

    expect(patches).toHaveLength(2)
    expect(patches[0]?.slug).toBe('series')
    expect(patches[0]?.content.root.children).toHaveLength(2)
  })

  it('ignores non practice-knowledge rows', () => {
    const patches = buildPracticeKnowledgePatches([
      { targetCollection: 'artists', field: 'bioShort', value: 'Bio' },
    ])
    expect(patches).toHaveLength(0)
  })
})
