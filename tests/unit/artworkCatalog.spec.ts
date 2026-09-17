import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  artworkHasDisplayImage,
  getPrimaryMediaDimensions,
  getSizeTier,
  resolveSeriesSlug,
} from '@/helpers/artworkCatalog'
import type { Artwork } from '@/payload-types'

describe('artworkCatalog', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })
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

  it('detects unpopulated primaryImage id with a slug', () => {
    vi.stubEnv('NEXT_PUBLIC_IMAGE_DOMAIN', 'https://cdn.example.com')
    expect(
      artworkHasDisplayImage({
        slug: 'basel-switzerland',
        primaryImage: 42,
        posterImage: null,
      }),
    ).toBe(true)
  })

  it('defaults sizeTier to lg', () => {
    expect(getSizeTier({ sizeTier: null })).toBe('lg')
    expect(getSizeTier({ sizeTier: 'sm' })).toBe('sm')
    expect(getSizeTier({ sizeTier: 'xs' })).toBe('xs')
  })

  it('uses widthPx/heightPx when media is an unpopulated id', () => {
    expect(
      getPrimaryMediaDimensions({
        primaryImage: 42,
        posterImage: null,
        widthPx: 1600,
        heightPx: 900,
      }),
    ).toEqual({ width: 1600, height: 900 })
  })

  it('falls back to orientation when pixel size is missing', () => {
    expect(
      getPrimaryMediaDimensions({
        primaryImage: 42,
        posterImage: null,
        orientation: 'landscape',
      }),
    ).toEqual({ width: 4, height: 3 })
    expect(
      getPrimaryMediaDimensions({
        primaryImage: 42,
        posterImage: null,
        orientation: 'portrait',
      }),
    ).toEqual({ width: 3, height: 4 })
  })
})
