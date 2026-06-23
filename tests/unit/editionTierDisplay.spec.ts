import { describe, expect, it } from 'vitest'

import {
  buildEditionTierSpecLine,
  formatEditionTierDimensions,
  formatEditionSizeLabel,
  humanizeEditionVocabularyValue,
} from '@/lib/artwork/editionTierDisplay'

describe('editionTierDisplay', () => {
  it('formats dimensions from whole numbers and unit', () => {
    expect(
      formatEditionTierDimensions({
        dimensionUnit: 'cm',
        widthWhole: 80,
        heightWhole: 120,
      }),
    ).toBe('80 × 120 cm')
  })

  it('formats dimensions in inches with fractions', () => {
    expect(
      formatEditionTierDimensions({
        dimensionUnit: 'in',
        widthWhole: 24,
        widthFraction: '3/16',
        heightWhole: 36,
        heightFraction: '1/2',
      }),
    ).toBe('24 3/16 × 36 1/2 in')
  })

  it('falls back to legacy widthCm/heightCm', () => {
    expect(
      formatEditionTierDimensions({
        widthCm: 150,
        heightCm: 200,
      }),
    ).toBe('150 × 200 cm')
  })

  it('builds a full spec line with edition size, dimensions, technique, and substrate', () => {
    expect(
      buildEditionTierSpecLine({
        editionSize: 6,
        apCount: 2,
        dimensionUnit: 'cm',
        widthWhole: 80,
        heightWhole: 120,
        printTechnique: 'pigment-print',
        substrate: 'aluminum-mount',
      }),
    ).toBe(
      'Edition of 6 + 2 AP · 80 × 120 cm · Pigment print · on Aluminum mount',
    )
  })

  it('humanizes unknown slug values for display', () => {
    expect(humanizeEditionVocabularyValue('hahnemuhle-photo-rag')).toBe('Hahnemuhle Photo Rag')
  })

  it('omits edition size when zero', () => {
    expect(formatEditionSizeLabel(0, 0)).toBeNull()
  })
})
