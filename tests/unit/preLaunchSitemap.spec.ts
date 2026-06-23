import { describe, expect, it, vi, afterEach } from 'vitest'

import { mapArtistToInfoData } from '@/helpers/mapArtistInfo'
import { isPublicSitemapSlug } from '@/lib/payload/sitemapRoutes'
import type { Artist } from '@/payload-types'

describe('isPublicSitemapSlug', () => {
  it('excludes fixture and double-underscore slugs from the sitemap', () => {
    expect(isPublicSitemapSlug('basel-switzerland')).toBe(true)
    expect(isPublicSitemapSlug('__fixture-basel-dcs')).toBe(false)
    expect(isPublicSitemapSlug('__draft-work')).toBe(false)
  })
})

describe('robots production gate', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('allows AI crawlers on production', async () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://bernardbolter.com')
    const { default: robots } = await import('@/app/(frontend)/robots')
    const rules = robots()

    expect(rules.sitemap).toBe('https://bernardbolter.com/sitemap.xml')
    expect(rules.rules).toEqual(
      expect.arrayContaining([
        { userAgent: 'GPTBot', allow: '/' },
        { userAgent: 'anthropic-ai', allow: '/' },
      ]),
    )
  })

  it('disallows all crawlers on preview and local dev', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    const { default: robots } = await import('@/app/(frontend)/robots')
    const rules = robots()

    expect(rules).toEqual({
      rules: { userAgent: '*', disallow: '/' },
    })
  })
})

describe('mapArtistToInfoData', () => {
  it('deduplicates duplicate work cities in the info panel', () => {
    const artist = {
      name: 'Bernard Bolter',
      workCity1: 'Berlin',
      workCity2: 'Berlin',
      locations: [{ city: 'Berlin', current: true, primary: true }],
    } as Artist

    expect(mapArtistToInfoData(artist)).toMatchObject({
      workCity1: 'Berlin',
      workCity2: undefined,
    })
  })

  it('keeps two distinct work cities', () => {
    const artist = {
      name: 'Bernard Bolter',
      workCity1: 'Berlin',
      workCity2: 'San Francisco',
    } as Artist

    expect(mapArtistToInfoData(artist)).toMatchObject({
      workCity1: 'Berlin',
      workCity2: 'San Francisco',
    })
  })
})
