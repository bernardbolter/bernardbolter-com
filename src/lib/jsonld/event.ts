import type { Artist, Artwork, Event, Media } from '@/payload-types'

import { lexicalToPlain } from '@/lib/artOfficial/lexicalToPlain'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import { countryNameToIsoCode } from '@/utilities/countryNameToIsoCode'
import { personToJsonLd, resolvePopulatedPerson } from '@/utilities/personToJsonLd'

import { schemaOrgEventType } from './eventSchemaType'

export type BuildEventJsonLdOptions = {
  baseUrl?: string
}

const BIO_PERSON_ID = '/bio#person'

function isoDateOnly(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed.toISOString().slice(0, 10)
}

function firstAddressLine(value: string | null | undefined): string | undefined {
  const line = value?.split('\n').map((part) => part.trim()).find(Boolean)
  return line || undefined
}

function mediaAbsoluteUrl(media: number | Media | null | undefined): string | null {
  if (!media || typeof media === 'number') return null
  return media.url?.trim() || null
}

function eventPerformer(
  artist: Artist | null | undefined,
  baseUrl: string,
): Record<string, unknown> {
  return {
    '@type': 'Person',
    '@id': `${baseUrl}${BIO_PERSON_ID}`,
    name: artist?.name?.trim() || 'Bernard Bolter',
    url: baseUrl,
  }
}

function eventSameAsUris(event: Event): string[] {
  const uris = [
    ...(event.sameAs?.map((row) => row.uri?.trim()).filter((uri): uri is string => Boolean(uri)) ??
      []),
    ...(event.jsonldSameAs
      ?.map((row) => row.uri?.trim())
      .filter((uri): uri is string => Boolean(uri)) ?? []),
  ]
  return [...new Set(uris)]
}

function eventConceptualKeywords(event: Event): string[] {
  return (
    event.conceptualKeywords
      ?.map((row) => row.keyword?.trim())
      .filter((keyword): keyword is string => Boolean(keyword)) ?? []
  )
}

function eventWorkFeatured(
  event: Event,
  baseUrl: string,
  performerId: string,
): Record<string, unknown>[] {
  if (!Array.isArray(event.artworks) || event.artworks.length === 0) return []

  return event.artworks.flatMap((artwork) => {
    if (!artwork || typeof artwork === 'number') return []
    const slug = (artwork as Artwork).slug?.trim()
    const title = (artwork as Artwork).title?.trim()
    if (!slug || !title) return []
    return [
      {
        '@type': 'VisualArtwork',
        '@id': `${baseUrl}/${slug}`,
        name: title,
        creator: {
          '@type': 'Person',
          '@id': performerId,
        },
      },
    ]
  })
}

function eventInstallationImageUrls(event: Event): string[] {
  return (
    event.installationImages
      ?.map((row) => mediaAbsoluteUrl(row.image))
      .filter((url): url is string => Boolean(url)) ?? []
  )
}

function curatorContributor(event: Event): Record<string, unknown> | null {
  const organiser = resolvePopulatedPerson(event.organiser)
  const curator = resolvePopulatedPerson(event.curator)
  if (!curator) return null
  if (organiser && organiser.id === curator.id) return null
  return personToJsonLd(curator)
}

/**
 * schema.org Event / ExhibitionEvent JSON-LD for public event pages.
 */
export function buildEventJsonLd(
  event: Event,
  artist: Artist | null | undefined,
  options: BuildEventJsonLdOptions = {},
): Record<string, unknown> {
  const baseUrl = options.baseUrl ?? getSiteBaseUrl()
  const url = `${baseUrl}/events/${event.slug}`
  const performerId = `${baseUrl}${BIO_PERSON_ID}`
  const performer = eventPerformer(artist, baseUrl)
  const organizer = personToJsonLd(resolvePopulatedPerson(event.organiser))
  const contributor = curatorContributor(event)
  const keywords = eventConceptualKeywords(event)
  const description = lexicalToPlain(event.descriptionLong).replace(/\s+/g, ' ').trim()
  const workFeatured = eventWorkFeatured(event, baseUrl, performerId)
  const images = eventInstallationImageUrls(event)
  const sameAs = eventSameAsUris(event)
  const countryIso = countryNameToIsoCode(event.venueCountry)

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
        ...(event.venueUrl?.trim() ? { url: event.venueUrl.trim() } : {}),
        address: {
          '@type': 'PostalAddress',
          ...(firstAddressLine(event.venueAddress) ?
            { streetAddress: firstAddressLine(event.venueAddress) }
          : {}),
          ...(event.venueCity?.trim() ? { addressLocality: event.venueCity.trim() } : {}),
          ...(countryIso ?
            { addressCountry: countryIso }
          : event.venueCountry?.trim() ?
            { addressCountry: event.venueCountry.trim() }
          : {}),
        },
        ...(event.venueLatLng?.lat != null && event.venueLatLng?.lng != null ?
          {
            geo: {
              '@type': 'GeoCoordinates',
              latitude: event.venueLatLng.lat,
              longitude: event.venueLatLng.lng,
            },
          }
        : {}),
      }
    : undefined

  const doc: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': schemaOrgEventType(event.eventType),
    '@id': url,
    name: event.title,
    url,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: event.isOnline ?
      'https://schema.org/OnlineEventAttendanceMode'
    : 'https://schema.org/OfflineEventAttendanceMode',
    ...(description ? { description } : {}),
    ...(isoDateOnly(event.startDate) ? { startDate: isoDateOnly(event.startDate) } : {}),
    ...(isoDateOnly(event.endDate) ? { endDate: isoDateOnly(event.endDate) } : {}),
    ...(location ? { location } : {}),
    performer,
    ...(organizer ? { organizer } : {}),
    ...(contributor ? { contributor } : {}),
    ...(keywords.length > 0 ?
      {
        about: keywords.map((name) => ({ '@type': 'Thing', name })),
        keywords: keywords.join(', '),
      }
    : {}),
    ...(workFeatured.length > 0 ? { workFeatured } : {}),
    ...(images.length > 0 ? { image: images } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  }

  return JSON.parse(JSON.stringify(doc)) as Record<string, unknown>
}

export const generateEventJsonLd = buildEventJsonLd
