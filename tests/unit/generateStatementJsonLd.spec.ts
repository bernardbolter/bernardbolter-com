import { describe, expect, it } from 'vitest'

import type { Artist, Artwork, Event } from '@/payload-types'
import { isVideoArtwork } from '@/lib/jsonld/artworkMention'
import { normalizeStatementRelatedWorks } from '@/helpers/statementRelatedWorks'
import { generateStatementJsonLd } from '@/utilities/generateStatementJsonLd'

function minimalArtist(overrides: Partial<Artist> = {}): Artist {
  return {
    id: 1,
    name: 'Bernard Bolter',
    slug: 'bernard-bolter',
    ulanUri: 'http://vocab.getty.edu/ulan/500123456',
    wikidataUri: 'https://www.wikidata.org/entity/Q123456',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as Artist
}

function minimalArtwork(overrides: Partial<Artwork> = {}): Artwork {
  return {
    id: 10,
    title: 'SFMOMA Part I',
    slug: 'sfmoma-part-i',
    yearCreated: 1996,
    measurementType: ['time-based'],
    medium: 'video',
    creator: 1,
    series: 1,
    status: 'published',
    recordOrigin: 'artist-catalogued',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as Artwork
}

describe('isVideoArtwork', () => {
  it('detects time-based video works', () => {
    expect(isVideoArtwork(minimalArtwork())).toBe(true)
    expect(isVideoArtwork(minimalArtwork({ measurementType: ['physical'], medium: 'oil' }))).toBe(
      false,
    )
  })
})

describe('normalizeStatementRelatedWorks', () => {
  it('normalizes populated artwork relationships', () => {
    const items = normalizeStatementRelatedWorks([
      {
        id: 'rw-1',
        note: 'Part I',
        artwork: {
          ...minimalArtwork(),
          posterImage: {
            id: 99,
            url: '/media/poster.jpg',
            width: 800,
            height: 600,
            updatedAt: '2026-01-01T00:00:00.000Z',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        },
      },
    ])

    expect(items).toHaveLength(1)
    expect(items[0]?.note).toBe('Part I')
    expect(items[0]?.artwork.slug).toBe('sfmoma-part-i')
    expect(items[0]?.artwork.posterImage?.url).toBe('/media/poster.jpg')
  })
})

describe('generateStatementJsonLd', () => {
  it('emits CreativeWork with author, text, mentions, and about event', () => {
    const artwork = minimalArtwork()
    const event: Event = {
      id: 5,
      title: 'Unauthorized installation, SFMOMA exterior',
      slug: 'unauthorized-installation-sfmoma-exterior',
      eventType: 'other',
      eventTypeCustom: 'Unauthorized installation',
      status: 'published',
      startDate: '1996-01-01',
      yearStart: 1996,
      venueName: 'San Francisco Museum of Modern Art',
      venueCity: 'San Francisco',
      venueCountry: 'United States',
      venueWikidataUri: 'https://www.wikidata.org/entity/QSFMOMA',
      descriptionShort: 'A sculptural work referencing the SFMOMA building.',
      artworks: [artwork],
      updatedAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
    }

    const artist = minimalArtist({
      statementShort: 'Short abstract.',
      statementLastRevised: '2026-06-20',
      statementFull: {
        root: {
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Full statement text for machines.' }],
            },
          ],
        },
      },
      statementRelatedWorks: [{ id: 'rw-1', artwork }],
    })

    const jsonLd = generateStatementJsonLd(artist, {
      baseUrl: 'https://bernardbolter.com',
      aboutEvent: event,
    })

    expect(jsonLd['@type']).toBe('CreativeWork')
    expect(jsonLd.text).toBe('Full statement text for machines.')
    expect(jsonLd.abstract).toBe('Short abstract.')
    expect(jsonLd.dateModified).toBe('2026-06-20')

    const author = jsonLd.author as Record<string, unknown>
    expect(author['@type']).toBe('Person')
    expect(author.name).toBe('Bernard Bolter')
    expect(author.url).toBe('https://bernardbolter.com/bio')

    const mentions = jsonLd.mentions as Record<string, unknown>[]
    expect(mentions).toHaveLength(1)
    expect(mentions[0]?.['@type']).toBe('VideoObject')
    expect(mentions[0]?.url).toBe('https://bernardbolter.com/sfmoma-part-i')

    const about = jsonLd.about as Record<string, unknown>
    expect(about['@type']).toBe('Event')
    expect(about.startDate).toBe('1996')
    const workFeatured = about.workFeatured as Record<string, unknown>[]
    expect(workFeatured).toHaveLength(1)
    expect(workFeatured[0]?.name).toBe('SFMOMA Part I')
  })
})
