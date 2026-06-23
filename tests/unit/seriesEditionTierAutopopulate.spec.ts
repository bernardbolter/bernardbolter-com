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
        editionTiers: [{ seriesTierKey: 'monumental' }],
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
        { dcs: { editionTiers: [{ seriesTierKey: 'monumental' }] } },
      ),
    ).toEqual([])
  })

  it('falls back to previous doc when not in incoming data', () => {
    expect(
      resolveDcsEffectiveEditionTiers(
        {},
        { dcs: { editionTiers: [{ seriesTierKey: 'collectors-print' }] } },
      ),
    ).toEqual([{ seriesTierKey: 'collectors-print' }])
  })

  it('returns undefined when neither side has editionTiers', () => {
    expect(resolveDcsEffectiveEditionTiers({}, {})).toBeUndefined()
  })
})

describe('buildAutopopulatedSeriesEditionTiers', () => {
  it('maps series tier keys to key-only entries', () => {
    expect(buildAutopopulatedSeriesEditionTiers(['monumental', 'small-print'])).toEqual([
      { seriesTierKey: 'monumental' },
      { seriesTierKey: 'small-print' },
    ])
  })
})

describe('editionTierRowIdentityValidate', () => {
  it('rejects rows with neither key nor fallback fields', async () => {
    const { editionTierRowIdentityValidate } = await import(
      '@/collections/artworks/editionTierOwnershipFields'
    )
    expect(editionTierRowIdentityValidate([{}], {} as never)).toBe(
      'Edition tier 1: set seriesTierKey or provide tierName and totalEditionSize.',
    )
  })

  it('accepts key-only rows', async () => {
    const { editionTierRowIdentityValidate } = await import(
      '@/collections/artworks/editionTierOwnershipFields'
    )
    expect(editionTierRowIdentityValidate([{ seriesTierKey: 'monumental' }], {} as never)).toBe(
      true,
    )
  })
})

describe('editionTierMegacitiesRowIdentityValidate', () => {
  it('rejects blank Megacities edition rows', async () => {
    const { editionTierMegacitiesRowIdentityValidate } = await import(
      '@/collections/artworks/editionTierOwnershipFields'
    )
    expect(editionTierMegacitiesRowIdentityValidate([{}], {} as never)).toBe(
      'Edition 1: set seriesTierKey or provide tier and editionSize.',
    )
  })
})
