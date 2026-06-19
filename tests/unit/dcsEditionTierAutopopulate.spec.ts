import { describe, expect, it } from 'vitest'

import {
  buildAutopopulatedDcsEditionTiers,
  resolveEffectiveEditionTiers,
  shouldAutopopulateDcsEditionTiers,
} from '@/lib/artwork/dcsEditionTierAutopopulate'

describe('shouldAutopopulateDcsEditionTiers', () => {
  it('returns true for DCS with empty editionTiers', () => {
    expect(
      shouldAutopopulateDcsEditionTiers({
        seriesSlug: 'digital-city-series',
        editionTiers: [],
      }),
    ).toBe(true)
  })

  it('returns true when editionTiers is undefined', () => {
    expect(
      shouldAutopopulateDcsEditionTiers({
        seriesSlug: 'digital-city-series',
        editionTiers: undefined,
      }),
    ).toBe(true)
  })

  it('returns false when editionTiers already has entries', () => {
    expect(
      shouldAutopopulateDcsEditionTiers({
        seriesSlug: 'digital-city-series',
        editionTiers: [{ seriesEditionTier: 1 }],
      }),
    ).toBe(false)
  })

  it('returns false for non-DCS series', () => {
    expect(
      shouldAutopopulateDcsEditionTiers({
        seriesSlug: 'gates-of-perception',
        editionTiers: [],
      }),
    ).toBe(false)
  })
})

describe('resolveEffectiveEditionTiers', () => {
  it('prefers incoming data when editionTiers is explicitly set', () => {
    expect(
      resolveEffectiveEditionTiers(
        { dcs: { editionTiers: [] } },
        { dcs: { editionTiers: [{ seriesEditionTier: 9 }] } },
      ),
    ).toEqual([])
  })

  it('falls back to previous doc when not in incoming data', () => {
    expect(
      resolveEffectiveEditionTiers(
        {},
        { dcs: { editionTiers: [{ seriesEditionTier: 2 }] } },
      ),
    ).toEqual([{ seriesEditionTier: 2 }])
  })

  it('returns undefined when neither side has editionTiers', () => {
    expect(resolveEffectiveEditionTiers({}, {})).toBeUndefined()
  })
})

describe('buildAutopopulatedDcsEditionTiers', () => {
  it('maps series tier ids to relation-only entries', () => {
    expect(buildAutopopulatedDcsEditionTiers([1, 2, 3])).toEqual([
      { seriesEditionTier: 1 },
      { seriesEditionTier: 2 },
      { seriesEditionTier: 3 },
    ])
  })
})

describe('editionTierRowIdentityValidate', () => {
  it('rejects rows with neither relation nor fallback fields', async () => {
    const { editionTierRowIdentityValidate } = await import(
      '@/collections/artworks/editionTierOwnershipFields'
    )
    expect(editionTierRowIdentityValidate([{}], {} as never)).toBe(
      'Edition tier 1: link a series edition tier or set tierName and totalEditionSize.',
    )
  })

  it('accepts relation-only rows', async () => {
    const { editionTierRowIdentityValidate } = await import(
      '@/collections/artworks/editionTierOwnershipFields'
    )
    expect(editionTierRowIdentityValidate([{ seriesEditionTier: 2 }], {} as never)).toBe(true)
  })
})
