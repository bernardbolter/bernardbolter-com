import { describe, expect, it } from 'vitest'

import { artworkPublicRevalidatePaths } from '@/lib/cache/artworkPublicRevalidatePaths'

describe('artworkPublicRevalidatePaths', () => {
  it('covers HTML artwork paths without owning corpus API URLs', () => {
    const paths = artworkPublicRevalidatePaths('centraal-station-boats')
    expect(paths).toEqual(
      expect.arrayContaining([
        '/',
        '/corpus',
        '/sessions',
        '/centraal-station-boats',
        '/centraal-station-boats/vision',
        '/centraal-station-boats/record',
      ]),
    )
    expect(paths.some((path) => path.startsWith('/api/corpus'))).toBe(false)
  })
})
