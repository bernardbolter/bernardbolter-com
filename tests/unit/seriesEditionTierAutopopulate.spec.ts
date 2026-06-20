import { describe, expect, it } from 'vitest'

import {
  buildAutopopulatedSeriesEditionTiers,
  resolveDcsEffectiveEditionTiers,
  SERIES_EDITION_TIER_AUTOPOPULATE_SLUGS,
  shouldAutopopulateSeriesEditionTiers,
} from '@/lib/artwork/seriesEditionTierAutopopulate'

describe('SERIES_EDITION_TIER_AUTOPOPULATE_SLUGS', () => {
  it('includes DCS and Megacities only', () => {
    expect(SERIES_EDITION_TIER_AUTOPOPULATE_SLUGS).toEqual([
      'digital-city-series',
      'megacities',
    ])
  })
})

describe('shouldAutopopulateSeriesEditionTiers', () => {
  it('returns true for DCS with empty editionTiers', () => {
    expect(
      shouldAutopopulateSeriesEditionTiers({
        seriesSlug: 'digital-city-series',
        editionTiers: [],
      }),
    ).toBe(true)
  })

  it('returns true for Megacities with empty editions', () => {
    expect(
      shouldAutopopulateSeriesEditionTiers({
        seriesSlug: 'megacities',
        editionTiers: [],
      }),
    ).toBe(true)
  })

  it('returns false when editionTiers already has entries', () => {
    expect(
      shouldAutopopulateSeriesEditionTiers({
        seriesSlug: 'digital-city-series',
        editionTiers: [{ seriesEditionTier: 1 }],
      }),
    ).toBe(false)
  })

  it('returns false for non-autopopulate series', () => {
    expect(
      shouldAutopopulateSeriesEditionTiers({
        seriesSlug: 'gates-of-perception',
        editionTiers: [],
      }),
    ).toBe(false)
  })
})

describe('resolveDcsEffectiveEditionTiers', () => {
  it('prefers incoming data when editionTiers is explicitly set', () => {
    expect(
      resolveDcsEffectiveEditionTiers(
        { dcs: { editionTiers: [] } },
        { dcs: { editionTiers: [{ seriesEditionTier: 9 }] } },
      ),
    ).toEqual([])
  })

  it('falls back to previous doc when not in incoming data', () => {
    expect(
      resolveDcsEffectiveEditionTiers(
        {},
        { dcs: { editionTiers: [{ seriesEditionTier: 2 }] } },
      ),
    ).toEqual([{ seriesEditionTier: 2 }])
  })

  it('returns undefined when neither side has editionTiers', () => {
    expect(resolveDcsEffectiveEditionTiers({}, {})).toBeUndefined()
  })
})

describe('buildAutopopulatedSeriesEditionTiers', () => {
  it('maps series tier ids to relation-only entries', () => {
    expect(buildAutopopulatedSeriesEditionTiers([1, 2, 3])).toEqual([
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

describe('editionTierMegacitiesRowIdentityValidate', () => {
  it('rejects blank Megacities edition rows', async () => {
    const { editionTierMegacitiesRowIdentityValidate } = await import(
      '@/collections/artworks/editionTierOwnershipFields'
    )
    expect(editionTierMegacitiesRowIdentityValidate([{}], {} as never)).toBe(
      'Edition 1: link a series edition tier or set tier and editionSize.',
    )
  })
})
