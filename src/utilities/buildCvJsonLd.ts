import type { Artist, Event } from '@/payload-types'

import { sectionForEvent } from '@/lib/cv/buildCvSections'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import { schemaOrgEventType } from '@/lib/jsonld/eventSchemaType'
import { countryNameToIsoCode } from '@/utilities/countryNameToIsoCode'

const BIO_PERSON_ID = '/bio#person'

export type BuildCvJsonLdOptions = {
  baseUrl?: string
}

function institutionName(event: Event): string {
  return (event.venueName ?? event.institution ?? '').trim()
}

function buildAlumniOf(events: Event[]): Record<string, unknown>[] {
  return events.flatMap((event) => {
    if (sectionForEvent(event) !== 'education') return []

    const name = institutionName(event)
    if (!name) return []

    const addressLocality = event.venueCity?.trim()
    const addressCountry = countryNameToIsoCode(event.venueCountry)

    const address =
      addressLocality || addressCountry ?
        {
          '@type': 'PostalAddress',
          ...(addressLocality ? { addressLocality } : {}),
          ...(addressCountry ? { addressCountry } : {}),
        }
      : undefined

    const wikidata = event.venueWikidataUri?.trim()

    return [
      {
        '@type': 'EducationalOrganization',
        name,
        ...(wikidata ? { sameAs: wikidata } : {}),
        ...(address ? { address } : {}),
      },
    ]
  })
}

function inlinePerformerEvent(event: Event, baseUrl: string): Record<string, unknown> {
  const name = (event.cvDisplayTitle ?? event.title).trim()
  const year =
    event.yearStart != null && !Number.isNaN(Number(event.yearStart)) ?
      String(event.yearStart)
    : String(new Date(event.startDate).getFullYear())

  const venueName = event.venueName?.trim()
  const addressLocality = event.venueCity?.trim()
  const addressCountry = countryNameToIsoCode(event.venueCountry)

  const location =
    venueName || addressLocality || addressCountry ?
      {
        '@type': 'Place',
        ...(venueName ? { name: venueName } : {}),
        ...(addressLocality || addressCountry ?
          {
            address: {
              '@type': 'PostalAddress',
              ...(addressLocality ? { addressLocality } : {}),
              ...(addressCountry ? { addressCountry } : {}),
            },
          }
        : {}),
      }
    : undefined

  return {
    '@type': schemaOrgEventType(event.eventType),
    name,
    startDate: year,
    ...(location ? { location } : {}),
  }
}

function buildPerformerIn(events: Event[], baseUrl: string): Record<string, unknown>[] {
  return events
    .filter((event) => sectionForEvent(event) !== 'education')
    .map((event) => {
      if (event.hasPage && event.slug?.trim()) {
        return { '@id': `${baseUrl}/events/${event.slug.trim()}` }
      }
      return inlinePerformerEvent(event, baseUrl)
    })
}

export function buildCvJsonLd(
  events: Event[],
  artist: Artist | null | undefined,
  options: BuildCvJsonLdOptions = {},
): Record<string, unknown> {
  const baseUrl = options.baseUrl ?? getSiteBaseUrl()
  const artistName = artist?.name?.trim() || 'Bernard Bolter'

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Curriculum Vitae — ${artistName}`,
    url: `${baseUrl}/cv`,
    about: {
      '@type': 'Person',
      '@id': `${baseUrl}${BIO_PERSON_ID}`,
      name: artistName,
      alumniOf: buildAlumniOf(events),
      performerIn: buildPerformerIn(events, baseUrl),
    },
  }
}
