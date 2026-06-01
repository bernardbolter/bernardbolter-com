import { describe, expect, it } from 'vitest'

import { hasPrimaryImageStaged } from '@/lib/artOfficial/hasPrimaryImageStaged'

describe('hasPrimaryImageStaged', () => {
  it('detects primaryImage on timeline', () => {
    expect(
      hasPrimaryImageStaged(
        [{ targetCollection: 'artworks', field: 'primaryImage' }],
        [],
      ),
    ).toBe(true)
  })

  it('detects primary in stagedMedia', () => {
    expect(
      hasPrimaryImageStaged([], [{ slotId: 'primary', kind: 'image', mediaId: 42 }]),
    ).toBe(true)
  })

  it('returns false when nothing staged', () => {
    expect(hasPrimaryImageStaged([], [])).toBe(false)
  })
})
