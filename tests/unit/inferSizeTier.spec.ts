import { describe, expect, it } from 'vitest'

import { inferSizeTierFromDimensions, normalizeSizeTier } from '@/lib/artOfficial/inferSizeTier'

describe('inferSizeTierFromDimensions', () => {
  it('maps 48 inch square to lg', () => {
    expect(
      inferSizeTierFromDimensions({
        widthWhole: 48,
        heightWhole: 48,
        dimensionUnit: 'in',
      }),
    ).toBe('lg')
  })

  it('maps very small cm work to xs', () => {
    expect(
      inferSizeTierFromDimensions({
        widthWhole: 10,
        heightWhole: 12,
        dimensionUnit: 'cm',
      }),
    ).toBe('xs')
  })

  it('maps small cm work to sm', () => {
    expect(
      inferSizeTierFromDimensions({
        widthWhole: 20,
        heightWhole: 25,
        dimensionUnit: 'cm',
      }),
    ).toBe('sm')
  })

  it('returns null without dimensions', () => {
    expect(inferSizeTierFromDimensions({})).toBeNull()
  })
})

describe('normalizeSizeTier', () => {
  it('accepts valid tier values', () => {
    expect(normalizeSizeTier('LG')).toBe('lg')
    expect(normalizeSizeTier('nope')).toBeUndefined()
  })
})
