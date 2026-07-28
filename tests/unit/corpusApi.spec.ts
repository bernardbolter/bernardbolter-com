import { describe, expect, it } from 'vitest'

import {
  buildCorpusIndexResponse,
  buildCorpusJsonLdResponse,
} from '@/lib/corpus/buildCorpusResponse'
import { resolveGist } from '@/lib/corpus/corpusGist'
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
  it('returns JSON-LD triage entries with urlTemplates and no bare camelCase keys', () => {
    const response = buildCorpusIndexResponse({
      artworks: [artwork()],
      totalArtworks: 1,
      seriesList: [series],
      baseUrl,
    })

    expect(response['@type']).toBe('DataFeed')
    expect(response['artism:totalArtworks']).toBe(1)
    expect(response['artism:totalMatched']).toBe(1)
    expect(response['artism:scope']).toBe('corpus')
    expect(response['artism:depth']).toBe('gist')
    expect(response['artism:tier']).toBe(1)
    expect(response).not.toHaveProperty('artism:feedRole')
    expect(response['artism:urlTemplates']).toEqual({
      page: `${baseUrl}/{slug}`,
      record: `${baseUrl}/api/corpus/{slug}`,
      visionPage: `${baseUrl}/{slug}/vision`,
      sessions: `${baseUrl}/api/corpus/{slug}/sessions`,
      sessionsPage: `${baseUrl}/sessions?artwork={slug}`,
    })
    expect(response['artism:tierMap']).toHaveProperty('1')
    expect(response['artism:tierMap']).not.toHaveProperty('3')
    expect(response['artism:coverage']).toMatchObject({ matched: 1 })

    const about = response.about as Array<Record<string, unknown>>
    expect(about[0]).toMatchObject({
      '@type': 'CreativeWorkSeries',
      '@id': `${baseUrl}/series/digital-city-series#series`,
      name: 'Digital City Series',
    })

    const entry = (response.dataFeedElement as Array<Record<string, unknown>>)[0]!
    expect(entry).toMatchObject({
      '@type': 'VisualArtwork',
      '@id': `${baseUrl}/basel-switzerland`,
      name: 'Basel Switzerland',
      dateCreated: '2007',
      'artism:slug': 'basel-switzerland',
      'artism:reasoningStatus': 'complete',
      isPartOf: { '@id': `${baseUrl}/series/digital-city-series#series` },
    })
    expect(entry).toHaveProperty('identifier')
    expect(entry).toHaveProperty('artism:availableTiers')
    expect(entry).not.toHaveProperty('title')
    expect(entry).not.toHaveProperty('slug')
    expect(entry).not.toHaveProperty('hasEditions')
    expect(entry).not.toHaveProperty('visionUrl')
    expect(entry).not.toHaveProperty('recordUrl')
    expect(entry).not.toHaveProperty('sessionsUrl')
    expect(entry).not.toHaveProperty('descriptionShort')
    expect(entry).not.toHaveProperty('intentLine')
  })

  it('includes series filter in the index URL when provided', () => {
    const response = buildCorpusIndexResponse({
      artworks: [artwork()],
      totalArtworks: 10,
      baseUrl,
      filters: { series: 'digital-city-series' },
    })

    expect(response.url).toBe(`${baseUrl}/api/corpus/index?series=digital-city-series`)
    expect(response['artism:totalArtworks']).toBe(10)
    expect(response['artism:totalMatched']).toBe(1)
    expect(response['artism:scope']).toBe('subset')
    expect(response['artism:depth']).toBe('gist')
    expect(response['artism:tier']).toBe(1)
  })

  it('emits survey depth fields without truncating intentLine', () => {
    const longIntent =
      'A deliberately long artist intent statement that must remain whole at survey depth even when longer than two hundred characters for triage gist purposes and must never end mid-thought with an ellipsis.'
    const response = buildCorpusIndexResponse({
      artworks: [
        artwork({
          descriptionShort: 'Short artist description.',
          intent: longIntent,
          dominantColors: [{ hex: '#87CEDC' }, { hex: '#2B2B2B' }],
          conceptualKeywords: [{ keyword: 'city' }, { keyword: 'memory' }],
        }),
      ],
      totalArtworks: 1,
      baseUrl,
      depth: 'survey',
    })

    expect(response['artism:tier']).toBe(2)
    expect(response['artism:scope']).toBe('subset')
    expect(response['artism:depth']).toBe('survey')
    expect(response).not.toHaveProperty('artism:urlTemplates')
    const entry = (response.dataFeedElement as Array<Record<string, unknown>>)[0]!
    expect(entry.description).toBe('Short artist description.')
    expect(entry['artism:intentLine']).toBe(longIntent)
    expect(String(entry['artism:intentLine'])).not.toMatch(/…$/)
    expect(entry['artism:dominantColors']).toEqual(['#87CEDC', '#2B2B2B'])
    expect(entry.keywords).toBe('city, memory')
    expect(entry['artism:recordUrl']).toBe(`${baseUrl}/api/corpus/basel-switzerland`)
    expect(entry['artism:sessionsUrl']).toBe(
      `${baseUrl}/api/corpus/basel-switzerland/sessions`,
    )
  })

  it('paginates and returns empty page when out of range', () => {
    const response = buildCorpusIndexResponse({
      artworks: [artwork(), artwork({ id: 11, slug: 'other-work', title: 'Other' })],
      totalArtworks: 2,
      baseUrl,
      page: 99,
      perPage: 50,
    })

    expect(response['artism:page']).toBe(99)
    expect(response['artism:totalMatched']).toBe(2)
    expect(response.dataFeedElement).toEqual([])
    expect(response['artism:nextPage']).toBeNull()
  })
})

describe('resolveGist', () => {
  it('prefers descriptionShort over vision analysis', () => {
    const result = resolveGist(
      artwork({
        descriptionShort: 'Artist-authored short description. Second sentence.',
        visionAnalyses: [
          {
            text: 'The composition is a grid of windows.',
            model: 'claude-sonnet-4-6',
            date: '2026-01-01',
          },
        ],
      }),
    )
    expect(result).toEqual({
      text: 'Artist-authored short description.',
      source: 'artist:descriptionShort',
    })
  })

  it('uses intent when short enough and no descriptionShort', () => {
    const result = resolveGist(artwork({ intent: 'Intent as gist.' }))
    expect(result).toEqual({
      text: 'Intent as gist.',
      source: 'artist:intentLine',
    })
  })
})

describe('buildCorpusJsonLdResponse', () => {
  it('aggregates artwork JSON-LD and author metadata with pagination', () => {
    const response = buildCorpusJsonLdResponse({
      artworks: [artwork()],
      totalArtworks: 1,
      seriesList: [series],
      artist,
      baseUrl,
    })

    expect(response['@type']).toBe('DataFeed')
    expect(response.url).toBe(`${baseUrl}/api/corpus`)
    expect(response['artism:corpusVersion']).toBe('1.0')
    expect(response['artism:scope']).toBe('corpus')
    expect(response['artism:depth']).toBe('record')
    expect(response['artism:feedRole']).toBe('bulk-export')
    expect(response).not.toHaveProperty('artism:tier')
    expect(response['artism:tierMap']).toHaveProperty('4')
    expect(response['artism:page']).toBe(1)
    expect(response['artism:perPage']).toBe(25)
    expect(response.author).toMatchObject({
      '@type': 'Person',
      name: 'Bernard Bolter',
      '@id': `${baseUrl}/bio#person`,
    })

    const entries = response.dataFeedElement as Array<Record<string, unknown>>
    expect(entries).toHaveLength(1)
    expect(entries[0]?.['@type']).toBe('VisualArtwork')
    expect(entries[0]?.name).toBe('Basel Switzerland')
    expect(entries[0]?.['artism:scope']).toBe('work')
    expect(entries[0]?.['artism:depth']).toBe('record')
    expect(entries[0]?.['artism:tier']).toBe(4)
    expect(entries[0]?.isPartOf).toMatchObject({
      '@type': 'CreativeWorkSeries',
      '@id': `${baseUrl}/series/digital-city-series#series`,
    })
    expect(entries[0]).not.toHaveProperty('@context')
  })

  it('does not emit private edition fields in feed elements', () => {
    const response = buildCorpusJsonLdResponse({
      artworks: [
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
        } as unknown as Partial<Artwork>),
      ],
      totalArtworks: 1,
      seriesList: [series],
      artist,
      baseUrl,
    })

    const entries = response.dataFeedElement as Array<Record<string, unknown>>
    expect(editionJsonLdHasPrivateFields(entries[0])).toBe(false)
    expect(JSON.stringify(entries[0])).not.toContain('Secret Owner')
    expect(JSON.stringify(entries[0])).not.toContain('ownerPrivate')
    expect(JSON.stringify(entries[0])).not.toContain('vendureProductId')
  })
})
