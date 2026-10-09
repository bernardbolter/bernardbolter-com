import { describe, expect, it } from 'vitest'

import { AVAILABLE_STATUS_COLOR, getSeriesColor, SERIES_COLOR_MAP } from '@/helpers/seriesColor'

describe('getSeriesColor', () => {
  it('returns megacities as a clear red away from DCS orange', () => {
    expect(getSeriesColor('megacities')).toBe('#E8453C')
    expect(SERIES_COLOR_MAP.megacities).toBe('#E8453C')
  })

  it('is case-insensitive', () => {
    expect(getSeriesColor('MEGACITIES')).toBe('#E8453C')
  })

  it('fills previously grey published series', () => {
    expect(getSeriesColor('drawings')).toBe('#8A93A0')
    expect(getSeriesColor('performances')).toBe('#C0714E')
    expect(getSeriesColor('watercolors')).toBe('#9FC5D8')
    expect(getSeriesColor('mediums-of-perception')).toBe('#6B8F9E')
    expect(getSeriesColor('gates-of-perception')).toBe('#B08968')
    expect(getSeriesColor('mediums-of-war')).toBe('#7A6B4F')
  })

  it('falls back to gray for unknown slugs', () => {
    expect(getSeriesColor('unknown-series')).toBe('#999999')
  })

  it('keeps available-status gold separate from series colours', () => {
    expect(AVAILABLE_STATUS_COLOR).toBe('#d4af37')
  })
})
