import { describe, expect, it } from 'vitest'

import {
  artworkHasDisplayImage,
  getSizeTier,
  resolveSeriesSlug,
} from '@/helpers/artworkCatalog'
import type { Artwork } from '@/payload-types'

describe('artworkCatalog', () => {
  it('resolves seriesSlug from relation', () => {
    const slug = resolveSeriesSlug({
      seriesSlug: null,
      series: { id: 1, slug: 'megacities' } as Artwork['series'],
    })
    expect(slug).toBe('megacities')
  })

  it('detects primaryImage url', () => {
    expect(
      artworkHasDisplayImage({
        primaryImage: { id: 1, url: '/media/a.jpg' } as Artwork['primaryImage'],
        posterImage: null,
      }),
    ).toBe(true)
  })

  it('defaults sizeTier to lg', () => {
    expect(getSizeTier({ sizeTier: null })).toBe('lg')
    expect(getSizeTier({ sizeTier: 'sm' })).toBe('sm')
  })
})
