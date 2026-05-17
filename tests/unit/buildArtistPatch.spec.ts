import { describe, expect, it } from 'vitest'

import { buildArtistPatchFromTimeline } from '@/lib/artOfficial/buildArtistPatch'

describe('buildArtistPatchFromTimeline', () => {
  it('converts biography rich text fields to lexical', () => {
    const patch = buildArtistPatchFromTimeline(
      [
        {
          targetCollection: 'artists',
          field: 'bioFull',
          value: 'Full biography prose.',
        },
        {
          targetCollection: 'artists',
          field: 'bioShort',
          value: 'One line bio.',
        },
      ],
      'biography',
    )

    expect(patch.bioShort).toBe('One line bio.')
    expect(patch.bioFull).toMatchObject({
      root: { type: 'root', children: expect.any(Array) },
    })
  })
})
