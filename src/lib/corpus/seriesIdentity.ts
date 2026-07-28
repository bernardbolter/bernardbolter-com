import { lexicalToPlain } from '@/lib/artOfficial/lexicalToPlain'
import { CORPUS_BASE } from '@/lib/corpus/constants'
import type { Series } from '@/payload-types'

/** Canonical series node identity used across corpus + series page JSON-LD. */
export function seriesIdUrl(slug: string, baseUrl: string = CORPUS_BASE): string {
  return `${baseUrl}/series/${slug}#series`
}

export function seriesPageUrl(slug: string, baseUrl: string = CORPUS_BASE): string {
  return `${baseUrl}/series/${slug}`
}

/** Full CreativeWorkSeries node for feed `about` and Tier-4 `isPartOf`. */
export function buildSeriesNode(
  series: Pick<Series, 'name' | 'slug' | 'yearStart' | 'yearEnd' | 'description'>,
  baseUrl: string = CORPUS_BASE,
  options: { includeDescription?: boolean } = {},
): Record<string, unknown> {
  const slug = series.slug?.trim()
  const entry: Record<string, unknown> = {
    '@type': 'CreativeWorkSeries',
    '@id': seriesIdUrl(slug || '', baseUrl),
    name: series.name,
    url: seriesPageUrl(slug || '', baseUrl),
  }

  if (series.yearStart != null) entry.startDate = String(series.yearStart)
  if (series.yearEnd != null) entry.endDate = String(series.yearEnd)

  if (options.includeDescription) {
    const description = lexicalToPlain(series.description)
    if (description) entry.description = description
  }

  return entry
}

/** Bare `@id` reference for index / survey records. */
export function buildSeriesRef(
  series: Pick<Series, 'slug'>,
  baseUrl: string = CORPUS_BASE,
): Record<string, unknown> {
  return { '@id': seriesIdUrl(series.slug?.trim() || '', baseUrl) }
}
