import { lexicalToPlain } from '@/lib/artOfficial/lexicalToPlain'
import { throughlineMentionArtworks } from '@/lib/artist/accumulatingEntries'
import { artistAsSchemaPerson } from '@/lib/jsonld/artistPerson'
import { buildArtworkMentionStub } from '@/lib/jsonld/artworkMention'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import type { Artist, Artwork, Event, Session } from '@/payload-types'

const ARTISM_CONTEXT = {
  '@vocab': 'https://schema.org/',
  artism: 'https://artism.org/schema/',
} as const

export type GenerateStatementJsonLdOptions = {
  baseUrl?: string
  aboutEvent?: Event | null
}

function readArtwork(entry: number | Artwork | null | undefined): Artwork | null {
  if (!entry || typeof entry !== 'object') return null
  return entry
}

function formatEventStartDateYear(event: Event): string {
  if (typeof event.yearStart === 'number') return String(event.yearStart)
  const parsed = new Date(event.startDate)
  if (!Number.isNaN(parsed.getTime())) return String(parsed.getFullYear())
  return event.startDate
}

function resolveVenueSameAs(event: Event): string | undefined {
  const wikidata = event.venueWikidataUri?.trim()
  if (wikidata) return wikidata

  const sameAs = event.sameAs?.find((entry) => entry?.uri?.trim())
  return sameAs?.uri?.trim() || undefined
}

function buildEventAboutBlock(event: Event, baseUrl: string): Record<string, unknown> {
  const locationSameAs = resolveVenueSameAs(event)
  const location: Record<string, unknown> = {
    '@type': 'Place',
    name: event.venueName ?? [event.venueCity, event.venueCountry].filter(Boolean).join(', '),
    address: {
      '@type': 'PostalAddress',
      ...(event.venueCity ? { addressLocality: event.venueCity } : {}),
      ...(event.venueCountry ? { addressCountry: event.venueCountry } : {}),
    },
    ...(locationSameAs ? { sameAs: locationSameAs } : {}),
  }

  const workFeatured = (event.artworks ?? [])
    .map((entry) => readArtwork(entry))
    .filter((artwork): artwork is Artwork => artwork !== null)
    .map((artwork) => buildArtworkMentionStub(artwork, baseUrl))

  const about: Record<string, unknown> = {
    '@type': 'Event',
    name: event.title,
    startDate: formatEventStartDateYear(event),
    location,
    ...(event.descriptionShort?.trim() ? { description: event.descriptionShort.trim() } : {}),
    ...(workFeatured.length ? { workFeatured } : {}),
  }

  return about
}

function sessionHref(
  session: number | Session | null | undefined,
  baseUrl: string,
): string | undefined {
  if (!session || typeof session !== 'object') return undefined
  if (session.status !== 'completed' || !session.sessionId) return undefined
  return `${baseUrl}/sessions/${session.sessionId}`
}

function buildThroughlineProperties(
  artist: Artist,
  baseUrl: string,
): Record<string, unknown>[] {
  return (artist.statementThroughlines ?? [])
    .filter((entry) => (entry.visibility ?? 'public') === 'public' && entry.text?.trim())
    .map((entry) => {
      const basedOn = sessionHref(entry.sourceSessionRef, baseUrl)
      const slug = entry.slug?.trim()
      return {
        '@type': 'PropertyValue',
        propertyID: 'artism:statementThroughline',
        value: entry.text.trim(),
        ...(entry.dateRecognized
          ? { 'artism:dateRecognized': entry.dateRecognized }
          : {}),
        ...(slug ? { url: `${baseUrl}/statement/throughlines/${slug}` } : {}),
        ...(basedOn ? { isBasedOn: basedOn } : {}),
      }
    })
}

function buildMentions(artist: Artist, baseUrl: string): Record<string, unknown>[] {
  const fromRelated = (artist.statementRelatedWorks ?? [])
    .map((entry) => readArtwork(entry.artwork))
    .filter((artwork): artwork is Artwork => artwork !== null)

  const fromThroughlines = throughlineMentionArtworks(artist)
  const seen = new Set<number>()
  const combined: Artwork[] = []
  for (const artwork of [...fromRelated, ...fromThroughlines]) {
    if (seen.has(artwork.id)) continue
    seen.add(artwork.id)
    combined.push(artwork)
  }

  return combined.map((artwork) => buildArtworkMentionStub(artwork, baseUrl))
}

function buildAuthor(artist: Artist, baseUrl: string): Record<string, unknown> {
  const person = artistAsSchemaPerson(artist)
  return {
    ...person,
    url: `${baseUrl}/bio`,
  }
}

/** CreativeWork JSON-LD for /statement — statement document is the primary entity. */
export function generateStatementJsonLd(
  artist: Artist,
  options: GenerateStatementJsonLdOptions = {},
): Record<string, unknown> {
  const base = options.baseUrl ?? getSiteBaseUrl()
  const text = lexicalToPlain(artist.statementFull)
  const abstractText = artist.statementShort?.trim()
  const dateModified = artist.statementLastRevised?.trim()
  const mentions = buildMentions(artist, base)
  const additionalProperty = buildThroughlineProperties(artist, base)

  const doc: Record<string, unknown> = {
    '@context': ARTISM_CONTEXT,
    '@type': 'CreativeWork',
    '@id': `${base}/statement#statement`,
    name: `Artist statement — ${artist.name}`,
    genre: 'Artist statement',
    url: `${base}/statement`,
    inLanguage: 'en',
    author: buildAuthor(artist, base),
    ...(text ? { text } : {}),
    ...(abstractText ? { abstract: abstractText } : {}),
    ...(dateModified ? { dateModified } : {}),
    ...(mentions.length ? { mentions } : {}),
    ...(additionalProperty.length ? { additionalProperty } : {}),
  }

  if (options.aboutEvent) {
    doc.about = buildEventAboutBlock(options.aboutEvent, base)
  }

  return doc
}
