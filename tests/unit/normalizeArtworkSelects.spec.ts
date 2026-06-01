import { describe, expect, it } from 'vitest'

import {
  ARTWORK_CONDITION_VALUES,
  ARTWORK_MEDIUM_VALUES,
  normalizeArtworkSelectFields,
  normalizeSelectValue,
} from '@/lib/artOfficial/normalizeArtworkSelects'

describe('normalizeSelectValue', () => {
  it('maps display labels to Payload values', () => {
    expect(
      normalizeSelectValue(
        'Acrylic photo transfer on canvas',
        ARTWORK_MEDIUM_VALUES,
        { 'acrylic photo transfer on canvas': 'acrylic-photo-transfer-on-canvas' },
      ),
    ).toBe('acrylic-photo-transfer-on-canvas')
    expect(
      normalizeSelectValue('Excellent', ARTWORK_CONDITION_VALUES, {
        excellent: 'excellent',
      }),
    ).toBe('excellent')
  })
})

describe('normalizeArtworkSelectFields', () => {
  it('normalizes medium and condition from agent prose', () => {
    const out = normalizeArtworkSelectFields({
      medium: 'Acrylic photo transfer on canvas',
      condition: 'Excellent',
    })
    expect(out.medium).toBe('acrylic-photo-transfer-on-canvas')
    expect(out.condition).toBe('excellent')
    expect(out.measurementType).toEqual(['physical'])
  })

  it('drops invalid condition and defaults medium for ACH', () => {
    const out = normalizeArtworkSelectFields({
      seriesSlug: 'a-colorful-history',
      condition: 'mint',
    })
    expect(out.condition).toBeUndefined()
    expect(out.medium).toBe('acrylic-photo-transfer-on-canvas')
  })

  it('maps aluminum mount support and DCS medium aliases', () => {
    const out = normalizeArtworkSelectFields(
      {
        support: 'aluminum-mount',
        medium: 'digital composite',
      },
      { seriesSlug: 'digital-city-series' },
    )
    expect(out.support).toBe('board')
    expect(out.medium).toBe('digital')
    expect(out.measurementType).toEqual(['digital'])
  })

  it('defaults DCS series to digital medium when medium is missing', () => {
    const out = normalizeArtworkSelectFields({}, { seriesSlug: 'digital-city-series' })
    expect(out.medium).toBe('digital')
    expect(out.measurementType).toEqual(['digital'])
  })

  it('defaults Megacities series to photo-collage and digital measurement', () => {
    const out = normalizeArtworkSelectFields({}, { seriesSlug: 'megacities' })
    expect(out.medium).toBe('photo-collage')
    expect(out.measurementType).toEqual(['digital'])
  })

  it('normalizes availabilityStatus aliases from agent staging', () => {
    expect(
      normalizeArtworkSelectFields({ availabilityStatus: 'for-sale' }).availabilityStatus,
    ).toBe('available')
    expect(
      normalizeArtworkSelectFields({ availabilityStatus: 'sold' }).availabilityStatus,
    ).toBe('sold')
    const dropped = normalizeArtworkSelectFields({ availabilityStatus: 'unknown' })
    expect(dropped.availabilityStatus).toBeUndefined()
    const invalid = normalizeArtworkSelectFields({ availabilityStatus: 'mint condition' })
    expect(invalid.availabilityStatus).toBeUndefined()
  })
})
