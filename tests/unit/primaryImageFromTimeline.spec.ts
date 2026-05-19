import { describe, expect, it } from 'vitest'

import { primaryImageMediaIdFromTimeline } from '@/lib/artOfficial/primaryImageFromTimeline'

describe('primaryImageMediaIdFromTimeline', () => {
  it('returns the latest primaryImage media id', () => {
    expect(
      primaryImageMediaIdFromTimeline([
        { targetCollection: 'artworks', field: 'title', value: 'Test' },
        { targetCollection: 'artworks', field: 'primaryImage', value: 10 },
        { targetCollection: 'artworks', field: 'primaryImage', value: 42 },
      ]),
    ).toBe(42)
  })

  it('returns null when primaryImage is missing', () => {
    expect(
      primaryImageMediaIdFromTimeline([
        { targetCollection: 'artworks', field: 'title', value: 'Test' },
      ]),
    ).toBeNull()
  })
})
