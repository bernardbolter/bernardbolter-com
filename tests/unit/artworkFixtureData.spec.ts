import { describe, expect, it } from 'vitest'

import {
  ARTWORK_FIXTURE_SLUG,
  buildArtworkFixtureData,
} from '@/seed/artworkFixtureData'

describe('artworkFixtureData', () => {
  it('builds a draft fixture with expected identity fields', () => {
    const data = buildArtworkFixtureData({
      seriesId: 1,
      creatorId: 2,
      tagIds: {
        'Post-internet': 10,
        Contemporary: 11,
        Abstraction: 12,
        Photography: 13,
        Collage: 14,
        Memory: 15,
        Erasure: 16,
        Archive: 17,
        Painting: 18,
      },
      artHistoricalReferenceIds: [20, 21],
    })

    expect(data.slug).toBe(ARTWORK_FIXTURE_SLUG)
    expect(data.status).toBe('draft')
    expect(data.catalogueNumber).toBe('BB-ACH-2019-003')
    expect(data.medium).toBe('acrylic-photo-transfer-on-canvas')
    expect(data.formalContributionAssessment).toContain('conditional legibility')
    expect(data.editions).toHaveLength(3)
    expect(data.reasoningStatus).toBe('complete')
    expect(data.creator).toBe(2)
    expect(data.artHistoricalReferences).toEqual([20, 21])
    expect(data.provenanceConfidenceLayer).toHaveLength(2)
    expect(data.ownershipHistory).toHaveLength(1)
    expect(data.arEnabled).toBe(true)
  })
})
