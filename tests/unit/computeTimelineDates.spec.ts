import { describe, expect, it } from 'vitest'

import {
  computeMidpointSortIndex,
  computeTimelineDates,
} from '@/lib/artOfficial/computeTimelineDates'
import type { DatedWork } from '@/lib/artOfficial/sequencing/types'

function work(
  id: string,
  sortIndex: number,
  yearCreated: number,
  overrides: Partial<DatedWork> = {},
): DatedWork {
  return {
    id,
    sortIndex,
    dateKnown: null,
    datePrecision: 'unknown',
    yearCreated,
    ...overrides,
  }
}

describe('computeMidpointSortIndex', () => {
  it('returns midpoint between neighbours', () => {
    expect(computeMidpointSortIndex(10, 20)).toBe(15)
  })

  it('inserts after lower neighbour only', () => {
    expect(computeMidpointSortIndex(10, null)).toBe(10.5)
  })

  it('inserts before upper neighbour only', () => {
    expect(computeMidpointSortIndex(null, 20)).toBe(19.5)
  })
})

describe('computeTimelineDates', () => {
  it('interpolates between two anchors', () => {
    const works = [
      work('a', 0, 2010, {
        dateKnown: new Date('2010-01-01'),
        datePrecision: 'year',
      }),
      work('b', 10, 2015),
      work('c', 20, 2020, {
        dateKnown: new Date('2020-01-01'),
        datePrecision: 'year',
      }),
    ]
    const dates = computeTimelineDates(works)
    const mid = dates.get('b')!
    expect(mid.getTime()).toBeGreaterThan(dates.get('a')!.getTime())
    expect(mid.getTime()).toBeLessThan(dates.get('c')!.getTime())
  })

  it('is monotonic by sortIndex when anchors exist', () => {
    const works = [
      work('a', 0, 2000, {
        dateKnown: new Date('2000-06-01'),
        datePrecision: 'year',
      }),
      work('b', 5, 2005),
      work('c', 10, 2010, {
        dateKnown: new Date('2010-06-01'),
        datePrecision: 'year',
      }),
      work('d', 15, 2015),
    ]
    const dates = computeTimelineDates(works)
    const ordered = works
      .map((w) => dates.get(w.id)!.getTime())
      .sort((x, y) => x - y)
    expect(ordered).toEqual(works.map((w) => dates.get(w.id)!.getTime()))
  })

  it('falls back to year spread when no anchors', () => {
    const works = [work('a', 0, 2010), work('b', 10, 2010)]
    const dates = computeTimelineDates(works)
    expect(dates.get('a')!.getUTCFullYear()).toBe(2010)
    expect(dates.get('b')!.getUTCFullYear()).toBe(2010)
    expect(dates.get('a')!.getTime()).not.toBe(dates.get('b')!.getTime())
  })
})
