import { lexicalToPlain } from '@/lib/artOfficial/lexicalToPlain'
import { CORPUS_BASE, CORPUS_CONTEXT } from '@/lib/corpus/constants'
import { seriesIdUrl, seriesPageUrl } from '@/lib/corpus/seriesIdentity'
import type { Artist, Series } from '@/payload-types'

const DESCRIPTION_MAX_LENGTH = 500

export type GenerateSeriesJsonLdOptions = {
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

function seriesDescriptionPlain(series: Series): string | undefined {
  const plain = lexicalToPlain(series.description).replace(/\s+/g, ' ').trim()
  if (!plain) return undefined
  if (plain.length <= DESCRIPTION_MAX_LENGTH) return plain
  return `${plain.slice(0, DESCRIPTION_MAX_LENGTH - 1).trimEnd()}…`
}

/** CollectionPage JSON-LD for /series/[slug] — mainEntity shares corpus series `@id`. */
export function generateSeriesJsonLd(
  series: Series,
  artist: Artist,
  options: GenerateSeriesJsonLdOptions = {},
): Record<string, unknown> {
  const base = options.baseUrl ?? CORPUS_BASE
  const identifiers = buildPersonIdentifiers(artist)
  const description = seriesDescriptionPlain(series)
  const slug = series.slug?.trim() || ''

  const seriesNode: Record<string, unknown> = {
    '@type': 'CreativeWorkSeries',
    '@id': seriesIdUrl(slug, base),
    name: series.name,
    url: seriesPageUrl(slug, base),
    creator: {
      '@type': 'Person',
      name: artist.name,
      ...(identifiers.length ? { identifier: identifiers } : {}),
    },
  }

  if (description) seriesNode.description = description
  if (typeof series.yearStart === 'number') seriesNode.startDate = String(series.yearStart)
  if (typeof series.yearEnd === 'number') seriesNode.endDate = String(series.yearEnd)

  return {
    '@context': CORPUS_CONTEXT,
    '@type': 'CollectionPage',
    name: series.name,
    url: seriesPageUrl(slug, base),
    mainEntity: seriesNode,
  }
}
