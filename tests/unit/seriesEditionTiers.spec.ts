import { describe, expect, it } from 'vitest'

import {
  findSeriesEditionTier,
  seriesEditionTierKeys,
  slugifySeriesTierKey,
} from '@/lib/artwork/seriesEditionTiers'
import type { Artwork, Series } from '@/payload-types'

function seriesWithTiers(): Series {
  return {
    id: 1,
    slug: 'digital-city-series',
    name: 'Digital City Series',
    status: 'published',
    editionTiers: [
      {
        tierKey: 'collectors-print',
        tierName: 'Collectors print',
        tierOrder: 2,
        editionSize: 6,
        apCount: 2,
        substrate: 'Aluminum dibond',
        widthCm: 80,
        heightCm: 120,
      },
    ],
    updatedAt: '',
    createdAt: '',
  }
}

describe('slugifySeriesTierKey', () => {
  it('slugifies display names', () => {
    expect(slugifySeriesTierKey("Collector's print")).toBe('collectors-print')
    expect(slugifySeriesTierKey('Full size')).toBe('full-size')
  })
})

describe('seriesEditionTierKeys', () => {
  it('returns sorted tier keys', () => {
    expect(
      seriesEditionTierKeys({
        editionTiers: [
          { tierKey: 'small-print', tierName: 'Small', tierOrder: 3, editionSize: 200 },
          { tierKey: 'monumental', tierName: 'Monumental', tierOrder: 1, editionSize: 3 },
        ],
      } as Series),
    ).toEqual(['monumental', 'small-print'])
  })
})

describe('findSeriesEditionTier', () => {
  it('resolves embedded tier spec from populated series', () => {
    const artwork = {
      series: seriesWithTiers(),
    } as Artwork

    expect(findSeriesEditionTier(artwork, 'collectors-print')?.tierName).toBe('Collectors print')
    expect(findSeriesEditionTier(artwork, 'missing')).toBeNull()
  })
})
