import { describe, expect, it } from 'vitest'

import { getGridItemContainerSize } from '@/helpers/getGridItemContainerSize'

describe('getGridItemContainerSize', () => {
  it('returns fallback when width is undefined', () => {
    expect(getGridItemContainerSize(undefined)).toEqual({ width: 300, height: 300, gap: 5 })
  })

  it('uses 1 column below 550px', () => {
    const { width, gap } = getGridItemContainerSize(400)
    expect(gap).toBe(5)
    expect(width).toBe(400 - 2 * gap)
  })

  it('uses 3 columns at 768px (m breakpoint)', () => {
    const at767 = getGridItemContainerSize(767)
    const at768 = getGridItemContainerSize(768)
    expect(at767.gap).toBe(7)
    expect(at768.gap).toBe(9)
    expect(at768.width).toBeLessThan(at767.width)
  })

  it('caps grid width at 1500px', () => {
    const wide = getGridItemContainerSize(2000)
    const capped = getGridItemContainerSize(1500)
    expect(wide).toEqual(capped)
  })
})
