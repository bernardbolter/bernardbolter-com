import { lexicalToPlain } from '@/lib/artOfficial/lexicalToPlain'
import { getSiteBaseUrl } from '@/lib/jsonld/site'
import type { Artist, Series } from '@/payload-types'

const ARTISM_CONTEXT = {
  '@vocab': 'https://schema.org/',
  artism: 'https://artism.org/schema/',
} as const

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

/** CollectionPage JSON-LD for /series/[slug]. */
export function generateSeriesJsonLd(
  series: Series,
  artist: Artist,
  options: GenerateSeriesJsonLdOptions = {},
): Record<string, unknown> {
  const base = options.baseUrl ?? getSiteBaseUrl()
  const identifiers = buildPersonIdentifiers(artist)
  const description = seriesDescriptionPlain(series)

  const collection: Record<string, unknown> = {
    '@type': 'Collection',
    name: series.name,
    creator: {
      '@type': 'Person',
      name: artist.name,
      ...(identifiers.length ? { identifier: identifiers } : {}),
    },
  }

  if (description) collection.description = description
  if (typeof series.yearStart === 'number') collection.startDate = String(series.yearStart)
  if (typeof series.yearEnd === 'number') collection.endDate = String(series.yearEnd)

  return {
    '@context': ARTISM_CONTEXT,
    '@type': 'CollectionPage',
    name: series.name,
    url: `${base}/series/${series.slug}`,
    mainEntity: collection,
  }
}
