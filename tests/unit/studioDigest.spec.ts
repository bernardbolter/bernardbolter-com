import { describe, expect, it } from 'vitest'

import { countBy, episodeBucketLabel } from '@/lib/studio/digest'
import { buildFieldNoteWhere } from '@/lib/studio/fieldNotes'
import { groupEpisodesBySeries } from '@/lib/studio/episodes'

describe('studio digest helpers', () => {
  it('countBy tallies string values', () => {
    expect(countBy(['a', 'b', 'a'])).toEqual({ a: 2, b: 1 })
  })

  it('episodeBucketLabel humanizes status', () => {
    expect(episodeBucketLabel('in-progress')).toBe('in progress')
  })
})

describe('buildFieldNoteWhere', () => {
  it('combines filters with and', () => {
    const where = buildFieldNoteWhere({ mediaType: 'text', untagged: true })
    expect(where).toEqual({
      and: [
        { mediaType: { equals: 'text' } },
        {
          and: [{ relatedArtwork: { exists: false } }, { relatedEpisode: { exists: false } }],
        },
      ],
    })
  })

  it('filters lines with in operator', () => {
    const where = buildFieldNoteWhere({ lineId: 5 })
    expect(where).toEqual({ and: [{ lines: { in: [5] } }] })
  })
})

describe('groupEpisodesBySeries', () => {
  it('groups episodes under known series keys', () => {
    const groups = groupEpisodesBySeries([
      { id: 1, series: 'rap-critic', title: 'A' } as never,
      { id: 2, series: 'studio-series', title: 'B' } as never,
      { id: 3, series: 'rap-critic', title: 'C' } as never,
    ])
    const rap = groups.find((g) => g.series === 'rap-critic')
    expect(rap?.episodes).toHaveLength(2)
    expect(groups.map((g) => g.series)).toEqual(['rap-critic', 'studio-series'])
  })
})
