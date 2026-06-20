import { describe, expect, it } from 'vitest'

import { buildWidthHeightDimensionsDisplay, toCm } from '@/lib/dimensions/physicalDimensions'

describe('physicalDimensions', () => {
  it('converts imperial whole inches to cm', () => {
    expect(toCm('in', 48, null)).toBe(121.92)
    expect(toCm('in', 24, null)).toBe(60.96)
  })

  it('keeps metric cm values as-is', () => {
    expect(toCm('cm', 30, null)).toBe(30)
  })

  it('builds a width × height display string', () => {
    expect(
      buildWidthHeightDimensionsDisplay(
        { widthWhole: 48, heightWhole: 48 },
        'in',
      ),
    ).toBe('48 × 48 in')
  })
})
