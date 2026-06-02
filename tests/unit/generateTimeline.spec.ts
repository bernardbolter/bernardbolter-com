import { describe, expect, it } from 'vitest'

import {
  generateTimeline,
  getArtworkDate,
  getArtworkDisplayLabel,
  getArtworkSortKey,
} from '@/helpers/timeline'
import type { Artwork } from '@/payload-types'

function artwork(overrides: Partial<Artwork> & { id: number }): Artwork {
  const { id, title, slug, ...rest } = overrides
  return {
    id,
    title: title ?? `Work ${id}`,
    slug: slug ?? `work-${id}`,
    creator: 1,
    series: 1,
    updatedAt: '2020-01-01T00:00:00.000Z',
    createdAt: '2020-01-01T00:00:00.000Z',
    ...rest,
  } as Artwork
}

const baseConfig = {
  sorting: 'latest' as const,
  artworkContainerWidth: 200,
  artworkContainerHeight: 200,
  desktopSideWidth: 50,
  viewportWidth: 800,
  viewportHeight: 600,
}

describe('getArtworkDate', () => {
  it('prefers timelineDate over yearCreated', () => {
    const d = getArtworkDate({
      timelineDate: '2019-06-15T00:00:00.000Z',
      yearCreated: 2005,
    })
    expect(d.getFullYear()).toBe(2019)
    expect(d.getMonth()).toBe(5)
  })

  it('uses yearCreated when timelineDate is absent', () => {
    const d = getArtworkDate({ yearCreated: 1998 })
    expect(d.getFullYear()).toBe(1998)
    expect(d.getMonth()).toBe(0)
  })
})

describe('getArtworkSortKey', () => {
  it('prefers sortIndex over dates', () => {
    expect(
      getArtworkSortKey({
        sortIndex: 42,
        timelineDate: '2010-01-01',
        yearCreated: 2000,
      }),
    ).toBe(42)
  })
})

describe('getArtworkDisplayLabel', () => {
  it('never exposes timelineDate', () => {
    expect(
      getArtworkDisplayLabel({
        dateDisplay: 'Summer 2019',
        yearCreated: 2019,
      }),
    ).toBe('Summer 2019')
  })
})

describe('generateTimeline', () => {
  it('orders latest by sortIndex then timelineDate', () => {
    const a = artwork({
      id: 1,
      sortIndex: 10,
      timelineDate: '2015-01-01',
      yearCreated: 2015,
    })
    const b = artwork({
      id: 2,
      sortIndex: 20,
      timelineDate: '2018-01-01',
      yearCreated: 2018,
    })

    const { artworksArray } = generateTimeline({
      ...baseConfig,
      artworks: [a, b],
    })

    expect(artworksArray.map((w) => w.id)).toEqual([2, 1])
  })

  it('orders oldest by ascending sort key', () => {
    const a = artwork({ id: 1, yearCreated: 1990 })
    const b = artwork({ id: 2, yearCreated: 2005 })

    const { artworksArray } = generateTimeline({
      ...baseConfig,
      sorting: 'oldest',
      artworks: [b, a],
    })

    expect(artworksArray.map((w) => w.id)).toEqual([1, 2])
  })

  it('returns empty arrays when there are no artworks', () => {
    const result = generateTimeline({
      ...baseConfig,
      artworks: [],
    })
    expect(result.artworksArray).toEqual([])
    expect(result.timeSpanInfo).toBeNull()
  })
})
