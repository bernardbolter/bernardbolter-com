import { describe, expect, it } from 'vitest'

import { artworkPublicRevalidatePaths } from '@/lib/cache/artworkPublicRevalidatePaths'

describe('artworkPublicRevalidatePaths', () => {
  it('includes corpus index and per-slug corpus APIs', () => {
    const paths = artworkPublicRevalidatePaths('centraal-station-boats')
    expect(paths).toEqual(
      expect.arrayContaining([
        '/api/corpus',
        '/api/corpus/index',
        '/api/corpus/centraal-station-boats',
        '/api/corpus/centraal-station-boats?tier=5',
        '/centraal-station-boats',
        '/centraal-station-boats/vision',
        '/centraal-station-boats/record',
      ]),
    )
  })
})
