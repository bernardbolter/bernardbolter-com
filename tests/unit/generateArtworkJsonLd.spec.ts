import { describe, expect, it } from 'vitest'

import { generateArtworkJsonLd } from '@/utilities/generateArtworkJsonLd'
import type { Artwork } from '@/payload-types'

function minimalArtwork(overrides: Partial<Artwork> = {}): Artwork {
  return {
    id: 1,
    title: 'Gates III',
    slug: 'gates-iii',
    yearCreated: 2019,
    status: 'published',
    medium: 'acrylic-on-canvas',
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as Artwork
}

describe('generateArtworkJsonLd', () => {
  it('includes artism context and clip embedding endpoint', () => {
    const jsonLd = generateArtworkJsonLd(minimalArtwork(), null, {
      baseUrl: 'https://bernardbolter.com',
    })

    expect(jsonLd['@context']).toMatchObject({
      '@vocab': 'https://schema.org/',
      artism: 'https://artism.org/schema/',
    })
    expect(jsonLd['artism:clipEmbeddingEndpoint']).toBe(
      'https://bernardbolter.com/gates-iii/embedding',
    )
  })

  it('emits catalogue number as PropertyValue identifier', () => {
    const jsonLd = generateArtworkJsonLd(
      minimalArtwork({ catalogueNumber: 'BB-ACH-2019-003' }),
      null,
      { baseUrl: 'https://bernardbolter.com' },
    )

    expect(jsonLd.identifier).toEqual({
      '@type': 'PropertyValue',
      propertyID: 'CatalogueNumber',
      value: 'BB-ACH-2019-003',
    })
  })

  it('emits DefinedTerm artMedium when mediumAatUri is set', () => {
    const jsonLd = generateArtworkJsonLd(
      minimalArtwork({
        mediumAatUri: 'http://vocab.getty.edu/aat/300014666',
      }),
      null,
      { baseUrl: 'https://bernardbolter.com' },
    )

    expect(jsonLd.artMedium).toMatchObject({
      '@type': 'DefinedTerm',
      inDefinedTermSet: 'http://vocab.getty.edu/aat/',
      sameAs: 'http://vocab.getty.edu/aat/300014666',
    })
  })
})
