import { lexicalToPlain } from '@/lib/artOfficial/lexicalToPlain'
import { resolveMediumLabel } from '@/lib/artwork/mediumVocabulary'
import { CORPUS_CONTEXT, CORPUS_VERSION } from '@/lib/corpus/constants'
import { buildArtworkJsonLd } from '@/utilities/buildArtworkJsonLd'
import type { Artist, Artwork, Series } from '@/payload-types'

export type CorpusFormat = 'jsonld' | 'index'

function trimString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function resolveSeries(artwork: Artwork): Series | null {
  if (!artwork.series || typeof artwork.series !== 'object') return null
  return artwork.series as Series
}

export function corpusDateModified(artworks: Artwork[]): string {
  if (artworks.length === 0) return new Date().toISOString()

  return artworks.reduce((latest, artwork) => {
    const updatedAt = trimString(artwork.updatedAt)
    if (!updatedAt) return latest
    return new Date(updatedAt) > new Date(latest) ? updatedAt : latest
  }, trimString(artworks[0]?.updatedAt) || new Date().toISOString())
}

function buildAuthorBlock(artist: Artist | null, baseUrl: string): Record<string, unknown> {
  const identifiers: Array<Record<string, unknown>> = []

  const ulanUri = trimString(artist?.ulanUri)
  if (ulanUri) {
    identifiers.push({ '@type': 'PropertyValue', propertyID: 'ULAN', value: ulanUri })
  }

  const wikidataUri = trimString(artist?.wikidataUri)
  if (wikidataUri) {
    identifiers.push({ '@type': 'PropertyValue', propertyID: 'Wikidata', value: wikidataUri })
  }

  return {
    '@type': 'Person',
    name: trimString(artist?.name) || 'Bernard Bolter',
    '@id': `${baseUrl}/bio#person`,
    ...(identifiers.length ? { identifier: identifiers } : {}),
  }
}

function buildSeriesAboutEntry(series: Series, baseUrl: string): Record<string, unknown> {
  const description = lexicalToPlain(series.description)
  const entry: Record<string, unknown> = {
    '@type': 'Collection',
    name: series.name,
    url: `${baseUrl}/series/${series.slug}`,
  }

  if (series.yearStart != null) entry.startDate = String(series.yearStart)
  if (series.yearEnd != null) entry.endDate = String(series.yearEnd)
  if (description) entry.description = description

  return entry
}

function artworkFeedElement(artwork: Artwork, baseUrl: string): Record<string, unknown> {
  const jsonLd = buildArtworkJsonLd(artwork, null, { baseUrl })
  const { '@context': _context, ...entry } = jsonLd
  return entry
}

export function buildCorpusIndexResponse(
  artworks: Artwork[],
  baseUrl: string,
  seriesSlug?: string | null,
): Record<string, unknown> {
  const seriesFilter = seriesSlug?.trim()
  const url = seriesFilter
    ? `${baseUrl}/api/corpus?format=index&series=${encodeURIComponent(seriesFilter)}`
    : `${baseUrl}/api/corpus?format=index`

  return {
    '@context': CORPUS_CONTEXT,
    '@type': 'DataFeed',
    name: 'Bernard Bolter — Artist Archive Index',
    url,
    dateModified: corpusDateModified(artworks),
    'artism:corpusVersion': CORPUS_VERSION,
    'artism:totalArtworks': artworks.length,
    'artism:totalPublished': artworks.length,
    dataFeedElement: artworks.map((artwork) => {
      const series = resolveSeries(artwork)
      return {
        slug: artwork.slug,
        title: artwork.title,
        catalogueNumber: artwork.catalogueNumber ?? null,
        year: artwork.yearCreated ?? null,
        series: series?.slug ?? null,
        seriesName: series?.name ?? null,
        medium: resolveMediumLabel(artwork) || artwork.medium || null,
        reasoningStatus: artwork.reasoningStatus ?? null,
        hasEditions: artwork.hasEditions ?? null,
        url: `${baseUrl}/${artwork.slug}`,
      }
    }),
  }
}

export function buildCorpusJsonLdResponse(
  artworks: Artwork[],
  seriesList: Series[],
  artist: Artist | null,
  baseUrl: string,
  seriesSlug?: string | null,
): Record<string, unknown> {
  const seriesFilter = seriesSlug?.trim()
  const url = seriesFilter
    ? `${baseUrl}/api/corpus?series=${encodeURIComponent(seriesFilter)}`
    : `${baseUrl}/api/corpus`

  return {
    '@context': CORPUS_CONTEXT,
    '@type': 'DataFeed',
    name: 'Bernard Bolter — Artist Archive Corpus',
    url,
    dateModified: corpusDateModified(artworks),
    'artism:corpusVersion': CORPUS_VERSION,
    'artism:totalArtworks': artworks.length,
    'artism:totalPublished': artworks.length,
    author: buildAuthorBlock(artist, baseUrl),
    about: seriesList.map((series) => buildSeriesAboutEntry(series, baseUrl)),
    dataFeedElement: artworks.map((artwork) => artworkFeedElement(artwork, baseUrl)),
  }
}

export function buildCorpusResponse(
  format: CorpusFormat,
  artworks: Artwork[],
  seriesList: Series[],
  artist: Artist | null,
  baseUrl: string,
  seriesSlug?: string | null,
): Record<string, unknown> {
  if (format === 'index') {
    return buildCorpusIndexResponse(artworks, baseUrl, seriesSlug)
  }

  return buildCorpusJsonLdResponse(artworks, seriesList, artist, baseUrl, seriesSlug)
}
