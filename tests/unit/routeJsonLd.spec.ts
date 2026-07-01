import { describe, expect, it, vi } from 'vitest'

import { resolveRouteJsonLd } from '@/lib/seo/routeJsonLd'

vi.mock('@/lib/payload/person', () => ({
  getPerson: vi.fn(async () => ({ name: 'Bernard Bolter', bioShort: 'Archive.' })),
}))

vi.mock('@/lib/payload/bioPage', () => ({
  getBioPageArtist: vi.fn(async () => ({ name: 'Bernard Bolter', bioShort: 'Bio.' })),
}))

vi.mock('@/lib/payload/artworkPage', () => ({
  getArtworkForPage: vi.fn(async (slug: string) =>
    slug === 'basel-switzerland'
      ? { id: '1', title: 'Basel', slug, status: 'published', yearCreated: 2007 }
      : null,
  ),
}))

vi.mock('@/lib/payload/siteDocuments', () => ({
  getArtistRecord: vi.fn(async () => ({ name: 'Bernard Bolter' })),
}))

describe('resolveRouteJsonLd', () => {
  it('returns homepage WebSite JSON-LD', async () => {
    const jsonLd = await resolveRouteJsonLd('/')
    expect(jsonLd?.['@type']).toEqual(['WebSite', 'CollectionPage'])
  })

  it('returns bio Person JSON-LD', async () => {
    const jsonLd = await resolveRouteJsonLd('/bio')
    expect(jsonLd?.['@type']).toBe('ProfilePage')
    expect(jsonLd?.mainEntity).toEqual(
      expect.objectContaining({
        '@type': 'Person',
        name: 'Bernard Bolter',
      }),
    )
  })

  it('returns artwork VisualArtwork JSON-LD', async () => {
    const jsonLd = await resolveRouteJsonLd('/basel-switzerland')
    expect(jsonLd?.['@type']).toBe('VisualArtwork')
    expect(jsonLd?.['@id']).toBe('https://bernardbolter.com/basel-switzerland')
  })

  it('returns null for reserved slugs', async () => {
    await expect(resolveRouteJsonLd('/contact')).resolves.toBeNull()
  })
})
