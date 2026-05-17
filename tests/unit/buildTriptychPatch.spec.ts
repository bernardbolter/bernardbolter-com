import { describe, expect, it } from 'vitest'

import { buildTriptychPatchFromTimeline } from '@/lib/artOfficial/buildTriptychPatch'

describe('buildTriptychPatchFromTimeline', () => {
  it('builds flat patch from triptychs timeline entries', () => {
    const patch = buildTriptychPatchFromTimeline([
      {
        targetCollection: 'triptychs',
        field: 'intent',
        value: 'Three technologies, one place.',
      },
      {
        targetCollection: 'artworks',
        field: 'title',
        value: 'Ignored',
      },
    ])
    expect(patch.intent).toBe('Three technologies, one place.')
    expect(patch.title).toBeUndefined()
  })
})
