import { describe, expect, it } from 'vitest'

import type { Artist } from '@/payload-types'
import {
  formatBioBirthLine,
  formatBioLivesAndWorksLine,
  getBioCurrentCities,
} from '@/lib/bio/bioHeader'
import { generateBioJsonLd } from '@/utilities/generateBioJsonLd'

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

describe('bioHeader', () => {
  it('orders current cities with primary first', () => {
    const cities = getBioCurrentCities(
      minimalArtist({
        locations: [
          { city: 'San Francisco', country: 'USA', type: 'residence', current: true, id: '1' },
          { city: 'Berlin', country: 'Germany', type: 'studio', current: true, primary: true, id: '2' },
        ],
      }),
    )

    expect(cities).toEqual(['Berlin', 'San Francisco'])
  })

  it('formats birth and lives-and-works lines', () => {
    const artist = minimalArtist({
      birthCity: 'San Francisco',
      birthYear: 1974,
      locations: [
        { city: 'Berlin', country: 'Germany', type: 'studio', current: true, primary: true, id: '1' },
        { city: 'San Francisco', country: 'USA', type: 'residence', current: true, id: '2' },
      ],
    })

    expect(formatBioBirthLine(artist)).toBe('b. San Francisco, 1974')
    expect(formatBioLivesAndWorksLine(artist)).toBe('Lives and works Berlin and San Francisco')
  })
})

describe('generateBioJsonLd', () => {
  it('builds a ProfilePage with Person mainEntity', () => {
    const jsonLd = generateBioJsonLd(
      minimalArtist({
        birthCity: 'San Francisco',
        birthYear: 1974,
        bioShort: 'Mixed media and digital artist.',
        locations: [
          { city: 'Berlin', country: 'Germany', type: 'studio', current: true, primary: true, id: '1' },
        ],
        education: [{ institution: 'Gerrit Rietveld Academie', cvVisible: true, id: '1' }],
      }),
      { baseUrl: 'https://bernardbolter.com' },
    )

    expect(jsonLd).toMatchObject({
      '@context': {
        '@vocab': 'https://schema.org/',
        artism: 'https://artism.org/schema/',
      },
      '@type': 'ProfilePage',
      url: 'https://bernardbolter.com/bio',
      mainEntity: {
        '@type': 'Person',
        name: 'Bernard Bolter',
        birthDate: '1974',
        birthPlace: { '@type': 'Place', name: 'San Francisco' },
        homeLocation: [{ '@type': 'Place', name: 'Berlin' }],
        description: 'Mixed media and digital artist.',
        alumniOf: [{ '@type': 'EducationalOrganization', name: 'Gerrit Rietveld Academie' }],
        memberOf: { '@type': 'Organization', name: 'ArtCollision' },
      },
    })
  })

  it('omits empty identifier entries', () => {
    const jsonLd = generateBioJsonLd(minimalArtist(), { baseUrl: 'https://bernardbolter.com' })
    expect(jsonLd.mainEntity).not.toHaveProperty('identifier')
  })
})
