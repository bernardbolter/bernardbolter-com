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
})
