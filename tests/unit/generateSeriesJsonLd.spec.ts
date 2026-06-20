import { describe, expect, it } from 'vitest'

import type { Artist, Series } from '@/payload-types'
import { generateSeriesJsonLd } from '@/utilities/generateSeriesJsonLd'

function minimalArtist(overrides: Partial<Artist> = {}): Artist {
  return {
    id: 1,
    name: 'Bernard Bolter',
    slug: 'bernard-bolter',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as Artist
}

function minimalSeries(overrides: Partial<Series> = {}): Series {
  return {
    id: 1,
    name: 'Megacities',
    slug: 'megacities',
    status: 'published',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as Series
}

describe('generateSeriesJsonLd', () => {
  it('builds a CollectionPage with nested Collection', () => {
    const jsonLd = generateSeriesJsonLd(
      minimalSeries({
        yearStart: 2018,
        description: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                version: 1,
                children: [{ type: 'text', text: 'Composite city collages.', version: 1 }],
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
          },
        },
      }),
      minimalArtist(),
      { baseUrl: 'https://bernardbolter.com' },
    )

    expect(jsonLd).toMatchObject({
      '@context': {
        '@vocab': 'https://schema.org/',
        artism: 'https://artism.org/schema/',
      },
      '@type': 'CollectionPage',
      name: 'Megacities',
      url: 'https://bernardbolter.com/series/megacities',
      mainEntity: {
        '@type': 'Collection',
        name: 'Megacities',
        description: 'Composite city collages.',
        startDate: '2018',
        creator: {
          '@type': 'Person',
          name: 'Bernard Bolter',
        },
      },
    })
  })

  it('omits endDate for ongoing series', () => {
    const jsonLd = generateSeriesJsonLd(minimalSeries({ yearStart: 2010 }), minimalArtist(), {
      baseUrl: 'https://bernardbolter.com',
    })

    expect(jsonLd.mainEntity).toHaveProperty('startDate', '2010')
    expect(jsonLd.mainEntity).not.toHaveProperty('endDate')
  })

  it('omits empty identifier entries', () => {
    const jsonLd = generateSeriesJsonLd(minimalSeries(), minimalArtist(), {
      baseUrl: 'https://bernardbolter.com',
    })

    expect(jsonLd.mainEntity).toMatchObject({
      creator: {
        '@type': 'Person',
        name: 'Bernard Bolter',
      },
    })
    expect((jsonLd.mainEntity as Record<string, unknown>).creator).not.toHaveProperty('identifier')
  })

  it('includes populated creator identifiers', () => {
    const jsonLd = generateSeriesJsonLd(
      minimalSeries(),
      minimalArtist({
        ulanUri: 'http://vocab.getty.edu/ulan/500123',
        wikidataUri: 'https://www.wikidata.org/wiki/Q1',
      }),
      { baseUrl: 'https://bernardbolter.com' },
    )

    expect(jsonLd.mainEntity).toMatchObject({
      creator: {
        identifier: [
          { '@type': 'PropertyValue', propertyID: 'ULAN', value: 'http://vocab.getty.edu/ulan/500123' },
          { '@type': 'PropertyValue', propertyID: 'Wikidata', value: 'https://www.wikidata.org/wiki/Q1' },
        ],
      },
    })
  })
})

describe('getSeriesLinkHref', () => {
  it('returns the internal series route', async () => {
    const { getSeriesLinkHref } = await import('@/utilities/getSeriesLinkHref')
    expect(getSeriesLinkHref('megacities')).toBe('/series/megacities')
  })
})
