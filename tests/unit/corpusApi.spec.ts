import { describe, expect, it } from 'vitest'

import {
  buildCorpusIndexResponse,
  buildCorpusJsonLdResponse,
} from '@/lib/corpus/buildCorpusResponse'
import { editionJsonLdHasPrivateFields } from '@/lib/jsonld/artworkExtensions'
import type { Artwork, Artist, Series } from '@/payload-types'

const baseUrl = 'https://bernardbolter.com'

const series: Series = {
  id: 1,
  name: 'Digital City Series',
  slug: 'digital-city-series',
  status: 'published',
  yearStart: 2007,
  updatedAt: '2024-01-01T00:00:00.000Z',
  createdAt: '2024-01-01T00:00:00.000Z',
}

const artist: Artist = {
  id: 1,
  name: 'Bernard Bolter',
  slug: 'bernard-bolter',
  ulanUri: 'http://vocab.getty.edu/ulan/500000000',
  wikidataUri: 'https://www.wikidata.org/entity/Q123',
  updatedAt: '2024-01-01T00:00:00.000Z',
  createdAt: '2024-01-01T00:00:00.000Z',
}

function artwork(overrides: Partial<Artwork> = {}): Artwork {
  return {
    id: 10,
    title: 'Basel Switzerland',
    slug: 'basel-switzerland',
    status: 'published',
    yearCreated: 2007,
    medium: 'photo-collage',
    catalogueNumber: 'BB-DCS-2007-002',
    reasoningStatus: 'complete',
    hasEditions: 'limited',
    series,
    updatedAt: '2025-06-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as Artwork
}

describe('buildCorpusIndexResponse', () => {
  it('returns a lightweight index entry per artwork', () => {
    const response = buildCorpusIndexResponse([artwork()], baseUrl)

    expect(response['@type']).toBe('DataFeed')
    expect(response['artism:totalArtworks']).toBe(1)
    expect(response['artism:tier']).toBe(1)
    expect(response.url).toBe(`${baseUrl}/api/corpus/index`)
    expect(response.dataFeedElement).toEqual([
      {
        slug: 'basel-switzerland',
        title: 'Basel Switzerland',
        catalogueNumber: 'BB-DCS-2007-002',
        year: 2007,
        series: 'digital-city-series',
        seriesName: 'Digital City Series',
        medium: 'Photo collage',
        reasoningStatus: 'complete',
        hasEditions: 'limited',
        gist: null,
        url: `${baseUrl}/basel-switzerland`,
        visionUrl: `${baseUrl}/basel-switzerland/vision`,
        recordUrl: `${baseUrl}/basel-switzerland/record`,
        sessionsUrl: `${baseUrl}/sessions?artwork=basel-switzerland`,
      },
    ])
    const entry = (response.dataFeedElement as Array<Record<string, unknown>>)[0]
    expect(entry).not.toHaveProperty('descriptionShort')
    expect(entry).not.toHaveProperty('intentLine')
  })

  it('includes series filter in the index URL when provided', () => {
    const response = buildCorpusIndexResponse([artwork()], baseUrl, {
      series: 'digital-city-series',
    })

    expect(response.url).toBe(
      `${baseUrl}/api/corpus/index?series=digital-city-series`,
    )
  })
})

describe('buildCorpusJsonLdResponse', () => {
  it('aggregates artwork JSON-LD and author metadata', () => {
    const response = buildCorpusJsonLdResponse([artwork()], [series], artist, baseUrl)

    expect(response['@type']).toBe('DataFeed')
    expect(response.url).toBe(`${baseUrl}/api/corpus`)
    expect(response['artism:corpusVersion']).toBe('1.0')
    expect(response.author).toMatchObject({
      '@type': 'Person',
      name: 'Bernard Bolter',
      '@id': `${baseUrl}/bio#person`,
    })

    const entries = response.dataFeedElement as Array<Record<string, unknown>>
    expect(entries).toHaveLength(1)
    expect(entries[0]?.['@type']).toBe('VisualArtwork')
    expect(entries[0]?.name).toBe('Basel Switzerland')
    expect(entries[0]).not.toHaveProperty('@context')
  })

  it('does not emit private edition fields in feed elements', () => {
    const response = buildCorpusJsonLdResponse(
      [
        artwork({
          hasEditions: 'limited',
          ownershipRegistry: [
            {
              tierLabel: 'Collectors Print',
              tierOrder: 1,
              editionSize: 10,
              copies: [
                {
                  copyNumber: 1,
                  claimStatus: 'claimed-confirmed',
                  ownerPrivate: 'Secret Owner',
                },
              ],
            },
          ],
        }),
      ],
      [series],
      artist,
      baseUrl,
    )

    const entries = response.dataFeedElement as Array<Record<string, unknown>>
    expect(editionJsonLdHasPrivateFields(entries[0])).toBe(false)
    expect(JSON.stringify(entries[0])).not.toContain('Secret Owner')
    expect(JSON.stringify(entries[0])).not.toContain('ownerPrivate')
    expect(JSON.stringify(entries[0])).not.toContain('vendureProductId')
  })
})
