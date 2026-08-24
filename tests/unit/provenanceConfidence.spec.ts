import { describe, expect, it } from 'vitest'

import {
  normalizeProvenanceConfidenceLayer,
  normalizeProvenanceConfidenceLevel,
} from '@/lib/artwork/provenanceConfidence'

describe('normalizeProvenanceConfidenceLevel', () => {
  it('keeps the four-level enum and maps session vocabulary', () => {
    expect(normalizeProvenanceConfidenceLevel('documented-fact')).toBe('documented-fact')
    expect(normalizeProvenanceConfidenceLevel('high')).toBe('documented-fact')
    expect(normalizeProvenanceConfidenceLevel('confirmed')).toBe('documented-fact')
    expect(normalizeProvenanceConfidenceLevel('medium')).toBe('credible-inference')
    expect(normalizeProvenanceConfidenceLevel('inferred')).toBe('credible-inference')
    expect(normalizeProvenanceConfidenceLevel('low')).toBe('speculation')
    expect(normalizeProvenanceConfidenceLevel('nope')).toBeNull()
  })

  it('rewrites confidenceLevel on layer rows', () => {
    expect(
      normalizeProvenanceConfidenceLayer([
        { claim: 'A', confidenceLevel: 'confirmed' },
        { claim: 'B', confidenceLevel: 'inferred' },
      ]),
    ).toEqual([
      { claim: 'A', confidenceLevel: 'documented-fact' },
      { claim: 'B', confidenceLevel: 'credible-inference' },
    ])
  })
})
