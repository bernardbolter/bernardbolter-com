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
    const { getRobotsConfig, robotsConfigToText } = await import('@/lib/seo/robotsConfig')
    const rules = getRobotsConfig()

    expect(rules.sitemap).toBe('https://bernardbolter.com/sitemap.xml')
    expect(rules.rules).toEqual(
      expect.arrayContaining([
        { userAgent: 'GPTBot', allow: '/' },
        { userAgent: 'anthropic-ai', allow: '/' },
        { userAgent: 'ClaudeBot', allow: '/' },
      ]),
    )

    const text = robotsConfigToText(rules)
    expect(text).toContain('Sitemap: https://bernardbolter.com/sitemap.xml')
    expect(text).toContain('https://bernardbolter.com/api/corpus/index')
  })

  it('allows AI crawlers on self-hosted production without VERCEL_ENV', async () => {
    vi.stubEnv('VERCEL_ENV', '')
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://bernardbolter.com')
    const { getRobotsConfig } = await import('@/lib/seo/robotsConfig')
    const rules = getRobotsConfig()

    expect(rules.sitemap).toBe('https://bernardbolter.com/sitemap.xml')
  })

  it('disallows all crawlers on preview and local dev', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    const { getRobotsConfig } = await import('@/lib/seo/robotsConfig')
    const rules = getRobotsConfig()

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
