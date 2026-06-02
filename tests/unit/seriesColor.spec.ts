import { describe, expect, it } from 'vitest'

import { getSeriesColor, SERIES_COLOR_MAP } from '@/helpers/seriesColor'

describe('getSeriesColor', () => {
  it('returns megacities accent', () => {
    expect(getSeriesColor('megacities')).toBe('#FC7753')
    expect(SERIES_COLOR_MAP.megacities).toBe('#FC7753')
  })

  it('is case-insensitive', () => {
    expect(getSeriesColor('MEGACITIES')).toBe('#FC7753')
  })

  it('falls back to gray for unknown slugs', () => {
    expect(getSeriesColor('unknown-series')).toBe('#999999')
  })
})
