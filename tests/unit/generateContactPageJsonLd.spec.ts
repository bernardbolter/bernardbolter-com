import { describe, expect, it } from 'vitest'

import type { Artist } from '@/payload-types'
import { generateContactPageJsonLd } from '@/utilities/generateContactPageJsonLd'

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

describe('generateContactPageJsonLd', () => {
  it('builds a ContactPage with nested Person', () => {
    const jsonLd = generateContactPageJsonLd(minimalArtist(), {
      baseUrl: 'https://bernardbolter.com',
    })

    expect(jsonLd).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'Contact — Bernard Bolter',
      url: 'https://bernardbolter.com/contact',
      about: {
        '@type': 'Person',
        name: 'Bernard Bolter',
        url: 'https://bernardbolter.com',
      },
    })
  })

  it('omits empty identifier and sameAs arrays', () => {
    const jsonLd = generateContactPageJsonLd(minimalArtist(), {
      baseUrl: 'https://bernardbolter.com',
    })

    expect(jsonLd.about).not.toHaveProperty('identifier')
    expect(jsonLd.about).not.toHaveProperty('sameAs')
  })

  it('includes populated identifiers and sameAs', () => {
    const jsonLd = generateContactPageJsonLd(
      minimalArtist({
        ulanUri: 'https://example.com/ulan',
        wikidataUri: 'https://www.wikidata.org/wiki/Q1',
        socialChannels: {
          instagram: 'https://instagram.com/bernardbolter',
        },
      }),
      { baseUrl: 'https://bernardbolter.com' },
    )

    expect(jsonLd.about).toMatchObject({
      identifier: [
        { '@type': 'PropertyValue', propertyID: 'ULAN', value: 'https://example.com/ulan' },
        { '@type': 'PropertyValue', propertyID: 'Wikidata', value: 'https://www.wikidata.org/wiki/Q1' },
      ],
      sameAs: ['https://instagram.com/bernardbolter'],
    })
  })

  it('includes contactPoint email from impressum only', () => {
    const jsonLd = generateContactPageJsonLd(
      minimalArtist({
        impressum: { publicEmail: 'studio@example.com' },
        whatsappNumber: '49123456789',
      }),
      { baseUrl: 'https://bernardbolter.com' },
    )

    expect(jsonLd.about).toMatchObject({
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'general enquiries',
        email: 'studio@example.com',
      },
    })
    expect(JSON.stringify(jsonLd)).not.toContain('49123456789')
    expect(jsonLd.about).not.toHaveProperty('telephone')
  })

  it('includes workLocation only for public non-residence locations', () => {
    const jsonLd = generateContactPageJsonLd(
      minimalArtist({
        locations: [
          {
            id: 'berlin',
            city: 'Berlin',
            country: 'Germany',
            type: 'studio',
            showOnContactPage: true,
            buildingName: 'CANK, 3rd floor',
            streetAddress: 'Charlottenburgerstr. 8a',
            postalCode: '14169',
          },
          {
            id: 'home',
            city: 'Berlin',
            country: 'Germany',
            type: 'residence',
            showOnContactPage: true,
            streetAddress: 'Secret Home',
          },
          {
            id: 'hidden',
            city: 'Paris',
            country: 'France',
            type: 'studio',
            showOnContactPage: false,
          },
        ],
      }),
      { baseUrl: 'https://bernardbolter.com' },
    )

    const workLocation = (jsonLd.about as { workLocation?: Record<string, unknown>[] }).workLocation
    expect(workLocation).toHaveLength(1)
    expect(workLocation?.[0]).toMatchObject({
      '@type': 'Place',
      name: 'CANK, 3rd floor',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Charlottenburgerstr. 8a',
        postalCode: '14169',
        addressLocality: 'Berlin',
        addressCountry: 'DE',
      },
    })
  })

  it('never includes contactStatus or map image fields', () => {
    const jsonLd = generateContactPageJsonLd(
      minimalArtist({
        contactStatus: 'available',
        contactStatusNote: 'Open to enquiries',
        locations: [
          {
            id: 'berlin',
            city: 'Berlin',
            country: 'Germany',
            type: 'studio',
            showOnContactPage: true,
            mapImage: { id: 1, url: '/maps/berlin.jpg', alt: 'Map', updatedAt: '', createdAt: '' },
          },
        ],
      }),
      { baseUrl: 'https://bernardbolter.com' },
    )

    expect(JSON.stringify(jsonLd)).not.toContain('available')
    expect(JSON.stringify(jsonLd)).not.toContain('/maps/berlin.jpg')
  })
})
