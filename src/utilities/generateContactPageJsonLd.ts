import { getContactPagePublicLocations } from '@/lib/contact/contactStudioLocations'
import { getPopulatedSocialChannels } from '@/lib/contact/socialChannels'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import type { Artist } from '@/payload-types'

import { countryNameToIsoCode } from './countryNameToIsoCode'

export type GenerateContactPageJsonLdOptions = {
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

function buildWorkLocations(artist: Artist): Record<string, unknown>[] {
  return getContactPagePublicLocations(artist).map((location) => {
    const buildingName = location.buildingName?.trim()
    const streetAddress = location.streetAddress?.trim()
    const postalCode = location.postalCode?.trim()
    const countryIso = countryNameToIsoCode(location.country)

    const address: Record<string, unknown> = {
      '@type': 'PostalAddress',
      addressLocality: location.city,
    }

    if (streetAddress) address.streetAddress = streetAddress
    if (postalCode) address.postalCode = postalCode
    if (countryIso) address.addressCountry = countryIso

    return {
      '@type': 'Place',
      name: buildingName || location.city,
      address,
    }
  })
}

/** ContactPage JSON-LD for /contact — generated from Artist singleton fields. */
export function generateContactPageJsonLd(
  artist: Artist,
  options: GenerateContactPageJsonLdOptions = {},
): Record<string, unknown> {
  const base = options.baseUrl ?? getSiteBaseUrl()
  const identifiers = buildPersonIdentifiers(artist)
  const sameAs = getPopulatedSocialChannels(artist).map((channel) => channel.url)
  const workLocation = buildWorkLocations(artist)
  const publicEmail = artist.impressum?.publicEmail?.trim()

  const about: Record<string, unknown> = {
    '@type': 'Person',
    name: artist.name,
    url: base,
    ...(identifiers.length ? { identifier: identifiers } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  }

  if (publicEmail) {
    about.contactPoint = {
      '@type': 'ContactPoint',
      contactType: 'general enquiries',
      email: publicEmail,
    }
  }

  if (workLocation.length) {
    about.workLocation = workLocation
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: `Contact — ${artist.name}`,
    url: `${base}/contact`,
    about,
  }
}
