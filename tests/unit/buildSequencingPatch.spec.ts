import { describe, expect, it } from 'vitest'

import { buildSequencingPatchesFromTimeline } from '@/lib/artOfficial/buildSequencingPatch'

describe('buildSequencingPatchesFromTimeline', () => {
  it('groups staged fields by artworkSlug', () => {
    const patches = buildSequencingPatchesFromTimeline([
      {
        targetCollection: 'artworks',
        field: 'sortIndex',
        value: 15,
        artworkSlug: 'work-a',
      },
      {
        targetCollection: 'artworks',
        field: 'dateKnown',
        value: '2019-01-01',
        artworkSlug: 'work-a',
      },
      {
        targetCollection: 'artworks',
        field: 'sortIndex',
        value: 25,
        artworkSlug: 'work-b',
      },
    ])

    expect(patches.get('work-a')).toEqual({
      sortIndex: 15,
      dateKnown: '2019-01-01',
    })
    expect(patches.get('work-b')).toEqual({ sortIndex: 25 })
  })
})
