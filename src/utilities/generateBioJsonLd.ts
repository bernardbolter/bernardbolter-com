import { getPopulatedSocialChannels } from '@/lib/contact/socialChannels'
import { getBioCurrentCities } from '@/lib/bio/bioHeader'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import { normalizeBioPhotos } from '@/helpers/bioPhotos'
import type { Artist } from '@/payload-types'

const ARTISM_CONTEXT = {
  '@vocab': 'https://schema.org/',
  artism: 'https://artism.org/schema/',
} as const

export type GenerateBioJsonLdOptions = {
  baseUrl?: string
}

function buildPersonIdentifiers(artist: Artist): Record<string, unknown>[] {
  const identifiers: Record<string, unknown>[] = []

  const ulan = artist.ulanUri?.trim()
  if (ulan) {
    identifiers.push({
      '@type': 'PropertyValue',
      propertyID: 'ULAN',
      value: ulan,
    })
  }

  const wikidata = artist.wikidataUri?.trim()
  if (wikidata) {
    identifiers.push({
      '@type': 'PropertyValue',
      propertyID: 'Wikidata',
      value: wikidata,
    })
  }

  return identifiers
}

function buildHomeLocations(artist: Artist): Record<string, unknown>[] {
  return getBioCurrentCities(artist).map((city) => ({
    '@type': 'Place',
    name: city,
  }))
}

function buildAlumniOf(artist: Artist): Record<string, unknown>[] {
  return (artist.education ?? [])
    .filter((entry) => entry?.institution?.trim() && entry.cvVisible !== false)
    .map((entry) => ({
      '@type': 'EducationalOrganization',
      name: entry.institution.trim(),
    }))
}

function buildBioImageUrls(artist: Artist, baseUrl: string): string[] {
  return normalizeBioPhotos(artist.bioPhotos)
    .map((photo) => {
      if (photo.url.startsWith('http')) return photo.url
      return `${baseUrl}${photo.url.startsWith('/') ? '' : '/'}${photo.url}`
    })
    .filter(Boolean)
}

function buildSameAs(artist: Artist, baseUrl: string): string[] {
  const values = new Set<string>()

  const wikidata = artist.wikidataUri?.trim()
  if (wikidata) values.add(wikidata)

  const website = artist.website?.trim() || artist.canonicalDomain?.trim()
  if (website) {
    values.add(website.startsWith('http') ? website : `https://${website}`)
  }

  for (const channel of getPopulatedSocialChannels(artist)) {
    values.add(channel.url)
  }

  return [...values]
}

/** ProfilePage JSON-LD for /bio — Person is the primary entity. */
export function generateBioJsonLd(
  artist: Artist,
  options: GenerateBioJsonLdOptions = {},
): Record<string, unknown> {
  const base = options.baseUrl ?? getSiteBaseUrl()
  const identifiers = buildPersonIdentifiers(artist)
  const homeLocation = buildHomeLocations(artist)
  const alumniOf = buildAlumniOf(artist)
  const images = buildBioImageUrls(artist, base)
  const sameAs = buildSameAs(artist, base)
  const birthCity = artist.birthCity?.trim()
  const description = artist.bioShort?.trim()

  const person: Record<string, unknown> = {
    '@type': 'Person',
    name: artist.name,
    jobTitle: 'Visual Artist',
    memberOf: {
      '@type': 'Organization',
      name: 'ArtCollision',
    },
  }

  if (artist.birthYear) person.birthDate = String(artist.birthYear)
  if (birthCity) {
    person.birthPlace = {
      '@type': 'Place',
      name: birthCity,
    }
  }
  if (homeLocation.length) person.homeLocation = homeLocation
  if (identifiers.length) person.identifier = identifiers
  if (description) person.description = description
  if (alumniOf.length) person.alumniOf = alumniOf
  if (images.length) person.image = images
  if (sameAs.length) person.sameAs = sameAs

  return {
    '@context': ARTISM_CONTEXT,
    '@type': 'ProfilePage',
    url: `${base}/bio`,
    mainEntity: person,
  }
}
