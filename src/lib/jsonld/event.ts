import type { Artist, Event } from '@/payload-types'

import { artistAsSchemaPerson } from '@/lib/jsonld/artistPerson'
import { getSiteBaseUrl } from '@/lib/jsonld/site'

export type BuildEventJsonLdOptions = {
  baseUrl?: string
}

/**
 * schema.org Event (exhibition, talk, screening, etc.) for CV / event pages.
 */
export function buildEventJsonLd(
  event: Event,
  artist: Artist | null | undefined,
  options: BuildEventJsonLdOptions = {},
): Record<string, unknown> {
  const baseUrl = options.baseUrl ?? getSiteBaseUrl()
  const url = `${baseUrl}/events/${event.slug}`
  const performer = artistAsSchemaPerson(artist)

  const location =
    event.isOnline && event.onlineEventUrl ?
      {
        '@type': 'VirtualLocation',
        url: event.onlineEventUrl,
      }
    : event.venueName || event.venueCity || event.venueCountry ?
      {
        '@type': 'Place',
        name: event.venueName ?? [event.venueCity, event.venueCountry].filter(Boolean).join(', '),
        address: {
          '@type': 'PostalAddress',
          ...(event.venueCity ? { addressLocality: event.venueCity } : {}),
          ...(event.venueCountry ? { addressCountry: event.venueCountry } : {}),
        },
        ...(event.venueTgnUri ? { sameAs: event.venueTgnUri } : {}),
      }
    : undefined

  const doc: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': `${url}#event`,
    name: event.title,
    url,
    startDate: event.startDate,
    ...(event.endDate ? { endDate: event.endDate } : {}),
    eventAttendanceMode: event.isOnline ?
      'https://schema.org/OnlineEventAttendanceMode'
    : 'https://schema.org/OfflineEventAttendanceMode',
    ...(location ? { location } : {}),
    performer: [performer],
    ...(event.organiser ?
      {
        organizer: {
          '@type': 'Organization',
          name: event.organiser,
        },
      }
    : {}),
    ...(event.descriptionShort ? { description: event.descriptionShort } : {}),
  }

  return JSON.parse(JSON.stringify(doc)) as Record<string, unknown>
}

export const generateEventJsonLd = buildEventJsonLd
