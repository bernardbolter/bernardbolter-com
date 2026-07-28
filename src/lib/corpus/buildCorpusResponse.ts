import { computeAvailableTiers } from '@/lib/corpus/availableTiers'
import {
  buildCorpusRecord,
  buildUrlTemplates,
} from '@/lib/corpus/buildCorpusRecord'
import {
  CORPUS_BASE,
  CORPUS_CONTEXT,
  CORPUS_INDEX_PER_PAGE,
  CORPUS_ROOT_MAX_PER_PAGE,
  CORPUS_ROOT_PER_PAGE,
  CORPUS_SURVEY_PER_PAGE,
  CORPUS_VERSION,
} from '@/lib/corpus/constants'
import { computeCoverage } from '@/lib/corpus/coverage'
import {
  buildCorpusIndexQueryString,
  corpusIndexHasActiveFilters,
  type CorpusIndexFilters,
} from '@/lib/corpus/corpusIndexFilters'
import {
  buildPaginationEnvelope,
  paginateItems,
} from '@/lib/corpus/pagination'
import { buildScopeDepthEnvelope } from '@/lib/corpus/scopeDepth'
import { buildSeriesNode } from '@/lib/corpus/seriesIdentity'
import { buildTierMap } from '@/lib/corpus/tierMap'
import { buildArtworkJsonLd } from '@/utilities/buildArtworkJsonLd'
import type { Artist, Artwork, Series } from '@/payload-types'

export type CorpusFormat = 'jsonld' | 'index'
export type CorpusDepth = 'index' | 'survey'

function trimString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
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

function artworkFeedElement(artwork: Artwork, baseUrl: string, sessionCount: number): Record<string, unknown> {
  const jsonLd = buildArtworkJsonLd(artwork, null, {
    baseUrl,
    sessionCount,
    includeTraversalLinks: true,
  })
  const { '@context': _context, ...entry } = jsonLd
  return entry
}

export type BuildCorpusListOptions = {
  artworks: Artwork[]
  /** Whole-corpus published count (unfiltered). */
  totalArtworks: number
  seriesList?: Series[]
  artist?: Artist | null
  baseUrl?: string
  filters?: CorpusIndexFilters
  depth?: CorpusDepth
  page?: number
  perPage?: number
  sessionCountBySlug?: Map<string, number>
}

function sessionCountFor(
  artwork: Artwork,
  sessionCountBySlug: Map<string, number>,
): number {
  return sessionCountBySlug.get(artwork.slug) ?? 0
}

export function buildCorpusIndexResponse(options: BuildCorpusListOptions): Record<string, unknown> {
  const baseUrl = options.baseUrl ?? CORPUS_BASE
  const filters = options.filters ?? {}
  const depth = options.depth ?? 'index'
  const isSurvey = depth === 'survey'
  const defaultPerPage = isSurvey ? CORPUS_SURVEY_PER_PAGE : CORPUS_INDEX_PER_PAGE
  const perPage = options.perPage ?? defaultPerPage
  const page = options.page ?? 1
  const sessionCountBySlug = options.sessionCountBySlug ?? new Map()
  const matched = options.artworks
  const pageItems = paginateItems(matched, page, perPage)

  const qs = buildCorpusIndexQueryString(filters)
  const depthQs = isSurvey ? (qs ? `${qs}&depth=survey` : '?depth=survey') : qs
  // Rebuild URL via pagination helper for consistency — keep canonical path here
  const urlBase = `${baseUrl}/api/corpus/index`
  const url =
    depthQs.length > 0
      ? `${urlBase}${depthQs}`
      : urlBase

  const coverage = computeCoverage(matched, sessionCountBySlug)
  const pagination = buildPaginationEnvelope({
    baseUrl,
    path: 'index',
    filters,
    page,
    perPage,
    defaultPerPage,
    totalMatched: matched.length,
    depth: isSurvey ? 'survey' : null,
  })

  return {
    '@context': CORPUS_CONTEXT,
    '@type': 'DataFeed',
    name: isSurvey
      ? 'Bernard Bolter — Artist Archive Survey'
      : 'Bernard Bolter — Artist Archive Index',
    url,
    dateModified: corpusDateModified(matched),
    'artism:corpusVersion': CORPUS_VERSION,
    'artism:totalArtworks': options.totalArtworks,
    'artism:totalPublished': options.totalArtworks,
    ...buildScopeDepthEnvelope(isSurvey ? 'survey' : 'index', {
      hasActiveFilters: corpusIndexHasActiveFilters(filters),
    }),
    'artism:tierMap': buildTierMap(baseUrl),
    'artism:coverage': coverage,
    ...pagination,
    ...(isSurvey
      ? {}
      : { 'artism:urlTemplates': buildUrlTemplates(baseUrl) }),
    ...(options.seriesList?.length
      ? {
          about: options.seriesList.map((series) =>
            buildSeriesNode(series, baseUrl, { includeDescription: true }),
          ),
        }
      : {}),
    dataFeedElement: pageItems.map((artwork) =>
      buildCorpusRecord(artwork, isSurvey ? 'survey' : 'index', {
        baseUrl,
        sessionCount: sessionCountFor(artwork, sessionCountBySlug),
      }),
    ),
  }
}

export function buildCorpusJsonLdResponse(options: BuildCorpusListOptions): Record<string, unknown> {
  const baseUrl = options.baseUrl ?? CORPUS_BASE
  const filters = options.filters ?? {}
  const artist = options.artist ?? null
  const seriesList = options.seriesList ?? []
  const defaultPerPage = CORPUS_ROOT_PER_PAGE
  const perPage = Math.min(options.perPage ?? defaultPerPage, CORPUS_ROOT_MAX_PER_PAGE)
  const page = options.page ?? 1
  const sessionCountBySlug = options.sessionCountBySlug ?? new Map()
  const matched = options.artworks
  const pageItems = paginateItems(matched, page, perPage)

  const qs = buildCorpusIndexQueryString(filters)
  const url = `${baseUrl}/api/corpus${qs}`
  const coverage = computeCoverage(matched, sessionCountBySlug)
  const pagination = buildPaginationEnvelope({
    baseUrl,
    path: 'root',
    filters,
    page,
    perPage,
    defaultPerPage,
    totalMatched: matched.length,
  })

  return {
    '@context': CORPUS_CONTEXT,
    '@type': 'DataFeed',
    name: 'Bernard Bolter — Artist Archive Corpus',
    url,
    dateModified: corpusDateModified(matched),
    'artism:corpusVersion': CORPUS_VERSION,
    'artism:totalArtworks': options.totalArtworks,
    'artism:totalPublished': options.totalArtworks,
    // Bulk export occupies corpus×record — not a ladder rung; omit artism:tier.
    ...buildScopeDepthEnvelope('root'),
    'artism:tierMap': buildTierMap(baseUrl),
    'artism:coverage': coverage,
    ...pagination,
    author: buildAuthorBlock(artist, baseUrl),
    about: seriesList.map((series) =>
      buildSeriesNode(series, baseUrl, { includeDescription: true }),
    ),
    dataFeedElement: pageItems.map((artwork) =>
      artworkFeedElement(artwork, baseUrl, sessionCountFor(artwork, sessionCountBySlug)),
    ),
  }
}

/** @deprecated Prefer buildCorpusIndexResponse / buildCorpusJsonLdResponse options objects. */
export function buildCorpusResponse(
  format: CorpusFormat,
  artworks: Artwork[],
  seriesList: Series[],
  artist: Artist | null,
  baseUrl: string,
  filters: CorpusIndexFilters = {},
  extras: {
    totalArtworks?: number
    depth?: CorpusDepth
    page?: number
    perPage?: number
    sessionCountBySlug?: Map<string, number>
  } = {},
): Record<string, unknown> {
  const options: BuildCorpusListOptions = {
    artworks,
    totalArtworks: extras.totalArtworks ?? artworks.length,
    seriesList,
    artist,
    baseUrl,
    filters,
    depth: extras.depth,
    page: extras.page,
    perPage: extras.perPage,
    sessionCountBySlug: extras.sessionCountBySlug,
  }

  if (format === 'index') {
    return buildCorpusIndexResponse(options)
  }

  return buildCorpusJsonLdResponse(options)
}

export { computeAvailableTiers }
