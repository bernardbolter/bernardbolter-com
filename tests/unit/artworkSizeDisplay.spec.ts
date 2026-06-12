import { describe, expect, it } from 'vitest'

import {
  calculateArtworkDisplaySize,
  getSizeFactor,
  normalizeSizeTier,
  resolveArtworkOrientation,
  resolveOrientationFromDimensions,
  sizeTierLabel,
  SIZE_TIER_LABELS,
} from '@/utilities/artworkSizeDisplay'

describe('artworkSizeDisplay', () => {
  it('maps size tiers to human-readable labels', () => {
    expect(SIZE_TIER_LABELS).toEqual({
      xs: 'Extra small',
      sm: 'Small',
      md: 'Medium',
      lg: 'Large',
      xl: 'Large-scale',
    })
    expect(sizeTierLabel('md')).toBe('Medium')
    expect(sizeTierLabel(null)).toBe('Large')
  })

  it('normalizes invalid size tiers to lg', () => {
    expect(normalizeSizeTier('invalid')).toBe('lg')
    expect(normalizeSizeTier('xl')).toBe('xl')
  })

  it('resolves orientation from media dimensions', () => {
    expect(resolveOrientationFromDimensions(1200, 800)).toBe('landscape')
    expect(resolveOrientationFromDimensions(800, 1200)).toBe('portrait')
    expect(resolveOrientationFromDimensions(1000, 1000)).toBe('square')
  })

  it('prefers stored artwork orientation when present', () => {
    expect(
      resolveArtworkOrientation({ orientation: 'portrait' }, 1600, 900),
    ).toBe('portrait')
  })

  it('uses square factors for square orientation', () => {
    expect(getSizeFactor('lg', 'square', false)).toBe(0.8)
    expect(getSizeFactor('lg', 'landscape', false)).toBe(0.85)
    expect(getSizeFactor('lg', 'landscape', true)).toBe(0.9)
  })

  it('renders xs smaller than sm using the same factor pattern', () => {
    expect(getSizeFactor('xs', 'landscape', false)).toBeLessThan(getSizeFactor('sm', 'landscape', false))
    expect(getSizeFactor('xs', 'square', false)).toBeLessThan(getSizeFactor('sm', 'square', false))
    expect(getSizeFactor('xs', 'landscape', true)).toBeLessThan(getSizeFactor('sm', 'landscape', true))
    expect(getSizeFactor('xs', 'landscape', false)).toBe(0.55)
    expect(getSizeFactor('sm', 'landscape', false)).toBe(0.65)
  })

  it('scales landscape artwork within container using size tier', () => {
    const result = calculateArtworkDisplaySize({
      imageWidth: 1600,
      imageHeight: 900,
      containerWidth: 1000,
      containerHeight: 800,
      sizeTier: 'lg',
    })

    expect(result.displayWidth).toBeLessThanOrEqual(1000)
    expect(result.displayHeight).toBeLessThanOrEqual(800)
    expect(result.displayWidth / result.displayHeight).toBeCloseTo(1600 / 900, 2)
  })

  it('uses min container dimension for square orientation', () => {
    const result = calculateArtworkDisplaySize({
      imageWidth: 1000,
      imageHeight: 1000,
      containerWidth: 1000,
      containerHeight: 600,
      sizeTier: 'md',
      orientation: 'square',
    })

    expect(result.displayWidth).toBe(result.displayHeight)
    expect(result.displayWidth).toBeLessThanOrEqual(600)
  })

  it('matches legacy hook output for portrait md grid cell', () => {
    const result = calculateArtworkDisplaySize({
      imageWidth: 900,
      imageHeight: 1200,
      containerWidth: 320,
      containerHeight: 400,
      sizeTier: 'md',
      useImageFactors: true,
    })

    expect(result).toEqual({ displayWidth: 255, displayHeight: 340 })
  })

  it('returns at least 1px when container is zero', () => {
    const result = calculateArtworkDisplaySize({
      imageWidth: 0,
      imageHeight: 0,
      containerWidth: 0,
      containerHeight: 0,
      sizeTier: 'sm',
    })

    expect(result.displayWidth).toBeGreaterThanOrEqual(1)
    expect(result.displayHeight).toBeGreaterThanOrEqual(1)
  })
})
