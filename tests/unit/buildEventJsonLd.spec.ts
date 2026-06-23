import { describe, expect, it } from 'vitest'

import { buildEventJsonLd } from '@/lib/jsonld/event'
import { schemaOrgEventType } from '@/lib/jsonld/eventSchemaType'
import type { Artwork, Artist, Event, Person } from '@/payload-types'

function basePerson(overrides: Partial<Person> = {}): Person {
  return {
    id: 2,
    name: 'Jürgen Blümlein',
    instagram: '@juergenbluemlein',
    updatedAt: '2020-01-01T00:00:00.000Z',
    createdAt: '2020-01-01T00:00:00.000Z',
    ...overrides,
  } as Person
}

function baseEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 1,
    title: 'Megacities',
    slug: 'megacities-2020',
    eventType: 'solo-exhibition',
    startDate: '2020-11-26T00:00:00.000Z',
    endDate: '2020-12-13T00:00:00.000Z',
    venueName: 'Circylar Gallery',
    venueCity: 'Berlin',
    venueCountry: 'Germany',
    venueAddress: 'Schwartzkopffstraße 2',
    venueUrl: 'http://circylar.com/',
    venueLatLng: { lat: 52.5343456, lng: 13.3795639 },
    conceptualKeywords: [{ keyword: 'Overview Effect' }, { keyword: 'satellite collage' }],
    sameAs: [{ uri: 'http://circylar.com/megacities-satellite-collages-by-bernard-john-bolter-iv/' }],
    status: 'published',
    hasPage: true,
    updatedAt: '2020-01-01T00:00:00.000Z',
    createdAt: '2020-01-01T00:00:00.000Z',
    ...overrides,
  } as Event
}

describe('schemaOrgEventType', () => {
  it('maps exhibitions to ExhibitionEvent', () => {
    expect(schemaOrgEventType('solo-exhibition')).toBe('ExhibitionEvent')
    expect(schemaOrgEventType('group-exhibition')).toBe('ExhibitionEvent')
  })
})

describe('buildEventJsonLd', () => {
  const baseUrl = 'https://bernardbolter.com'

  it('builds ExhibitionEvent with date-only fields and bio performer', () => {
    const jsonLd = buildEventJsonLd(
      baseEvent({
        descriptionLong: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                children: [{ type: 'text', text: 'Satellite collages in Berlin.' }],
              },
            ],
          },
        },
      }),
      { id: 1, name: 'Bernard Bolter' } as Artist,
      { baseUrl },
    )

    expect(jsonLd['@type']).toBe('ExhibitionEvent')
    expect(jsonLd['@id']).toBe(`${baseUrl}/events/megacities-2020`)
    expect(jsonLd.startDate).toBe('2020-11-26')
    expect(jsonLd.endDate).toBe('2020-12-13')
    expect(jsonLd.description).toBe('Satellite collages in Berlin.')
    expect(jsonLd.performer).toEqual({
      '@type': 'Person',
      '@id': `${baseUrl}/bio#person`,
      name: 'Bernard Bolter',
      url: baseUrl,
    })
  })

  it('includes geo, organizer, about, keywords, and sameAs', () => {
    const jsonLd = buildEventJsonLd(baseEvent({ organiser: basePerson() }), null, { baseUrl })
    const location = jsonLd.location as Record<string, unknown>
    const address = location.address as Record<string, unknown>

    expect(location.geo).toEqual({
      '@type': 'GeoCoordinates',
      latitude: 52.5343456,
      longitude: 13.3795639,
    })
    expect(location.url).toBe('http://circylar.com/')
    expect(address.addressCountry).toBe('DE')
    expect(jsonLd.organizer).toMatchObject({
      '@type': 'Person',
      name: 'Jürgen Blümlein',
    })
    expect(jsonLd.about).toEqual([
      { '@type': 'Thing', name: 'Overview Effect' },
      { '@type': 'Thing', name: 'satellite collage' },
    ])
    expect(jsonLd.keywords).toBe('Overview Effect, satellite collage')
    expect(jsonLd.sameAs).toContain(
      'http://circylar.com/megacities-satellite-collages-by-bernard-john-bolter-iv/',
    )
  })

  it('includes workFeatured and installation image URLs', () => {
    const jsonLd = buildEventJsonLd(
      baseEvent({
        artworks: [
          {
            id: 10,
            slug: 'deutsche-stadt',
            title: 'Deutsche Stadt',
          } as Artwork,
        ],
        installationImages: [
          {
            image: {
              id: 1,
              url: 'https://cdn.example.com/install.jpg',
            },
          },
        ],
      }),
      { id: 1, name: 'Bernard Bolter' } as Artist,
      { baseUrl },
    )

    expect(jsonLd.workFeatured).toEqual([
      {
        '@type': 'VisualArtwork',
        '@id': `${baseUrl}/deutsche-stadt`,
        name: 'Deutsche Stadt',
        creator: {
          '@type': 'Person',
          '@id': `${baseUrl}/bio#person`,
        },
      },
    ])
    expect(jsonLd.image).toEqual(['https://cdn.example.com/install.jpg'])
  })

  it('adds curator as contributor only when different from organiser', () => {
    const organiser = basePerson({ id: 2, name: 'Jürgen Blümlein' })
    const curator = basePerson({ id: 3, name: 'Guest Curator' })

    const withContributor = buildEventJsonLd(
      baseEvent({ organiser, curator }),
      null,
      { baseUrl },
    )
    const withoutContributor = buildEventJsonLd(
      baseEvent({ organiser, curator: organiser }),
      null,
      { baseUrl },
    )

    expect(withContributor.contributor).toMatchObject({ name: 'Guest Curator' })
    expect(withoutContributor.contributor).toBeUndefined()
  })
})
