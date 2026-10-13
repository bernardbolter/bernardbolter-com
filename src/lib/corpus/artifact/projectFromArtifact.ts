import {
  CORPUS_BASE,
  CORPUS_CONTEXT,
  CORPUS_INDEX_PER_PAGE,
  CORPUS_ROOT_MAX_PER_PAGE,
  CORPUS_ROOT_PER_PAGE,
  CORPUS_SURVEY_PER_PAGE,
  CORPUS_VERSION,
} from '@/lib/corpus/constants'
import { buildUrlTemplates } from '@/lib/corpus/buildCorpusRecord'
import type { CorpusCoverage } from '@/lib/corpus/coverage'
import {
  buildCorpusIndexQueryString,
  corpusIndexHasActiveFilters,
  type CorpusIndexFilters,
} from '@/lib/corpus/corpusIndexFilters'
import { buildPaginationEnvelope, paginateItems } from '@/lib/corpus/pagination'
import { buildScopeDepthEnvelope } from '@/lib/corpus/scopeDepth'
import { buildTierMap } from '@/lib/corpus/tierMap'
import type { CorpusArtifact, CorpusWorkEnvelope } from '@/lib/corpus/artifact/types'

export function filterArtifactWorks(
  works: CorpusWorkEnvelope[],
  filters: CorpusIndexFilters,
): CorpusWorkEnvelope[] {
  return works.filter((work) => {
    if (filters.series && work.filters.seriesSlug !== filters.series) return false
    if (filters.yearFrom != null) {
      if (work.filters.yearCreated == null || work.filters.yearCreated < filters.yearFrom) {
        return false
      }
    }
    if (filters.yearTo != null) {
      if (work.filters.yearCreated == null || work.filters.yearCreated > filters.yearTo) {
        return false
      }
    }
    if (filters.status && work.filters.reasoningStatus !== filters.status) return false
    if (filters.hasVisionAnalyses != null) {
      if (work.filters.hasVisionAnalyses !== filters.hasVisionAnalyses) return false
    }
    return true
  })
}

export function coverageFromArtifactWorks(works: CorpusWorkEnvelope[]): CorpusCoverage {
  let withArtistIntent = 0
  let withVisionAnalysis = 0
  let withSessions = 0
  let reasoningComplete = 0

  for (const work of works) {
    const survey = work.surveyProjection
    if (
      (typeof survey.description === 'string' && survey.description.trim()) ||
      (typeof survey['art-official:intentLine'] === 'string' &&
        String(survey['art-official:intentLine']).trim())
    ) {
      withArtistIntent += 1
    }
    if (work.filters.hasVisionAnalyses) withVisionAnalysis += 1
    if (work.sessionCount > 0) withSessions += 1
    if (work.filters.reasoningStatus === 'complete') reasoningComplete += 1
  }

  return {
    matched: works.length,
    withArtistIntent,
    withVisionAnalysis,
    withSessions,
    reasoningComplete,
  }
}

export function findArtifactWork(
  artifact: CorpusArtifact,
  slug: string,
): CorpusWorkEnvelope | null {
  return artifact.works.find((work) => work.slug === slug) ?? null
}

export function buildIndexResponseFromArtifact(options: {
  artifact: CorpusArtifact
  filters?: CorpusIndexFilters
  depth?: 'index' | 'survey'
  page?: number
  perPage?: number
  baseUrl?: string
}): Record<string, unknown> {
  const baseUrl = options.baseUrl ?? CORPUS_BASE
  const filters = options.filters ?? {}
  const depth = options.depth ?? 'index'
  const isSurvey = depth === 'survey'
  const defaultPerPage = isSurvey ? CORPUS_SURVEY_PER_PAGE : CORPUS_INDEX_PER_PAGE
  const perPage = options.perPage ?? defaultPerPage
  const page = options.page ?? 1
  const matched = filterArtifactWorks(options.artifact.works, filters)
  const pageItems = paginateItems(matched, page, perPage)

  const qs = buildCorpusIndexQueryString(filters)
  const depthQs = isSurvey ? (qs ? `${qs}&depth=survey` : '?depth=survey') : qs
  const urlBase = `${baseUrl}/api/corpus/index`
  const url = depthQs.length > 0 ? `${urlBase}${depthQs}` : urlBase

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
    dateModified: options.artifact['art-official:generatedAt'],
    'art-official:corpusVersion': CORPUS_VERSION,
    'art-official:generatedAt': options.artifact['art-official:generatedAt'],
    'art-official:supersedesNote': options.artifact['art-official:supersedesNote'],
    'art-official:totalArtworks': options.artifact['art-official:totalArtworks'],
    'art-official:totalPublished': options.artifact['art-official:totalPublished'],
    ...buildScopeDepthEnvelope(isSurvey ? 'survey' : 'index', {
      hasActiveFilters: corpusIndexHasActiveFilters(filters),
    }),
    'art-official:tierMap': buildTierMap(baseUrl),
    'art-official:coverage': coverageFromArtifactWorks(matched),
    ...pagination,
    'art-official:surveyUrl': `${baseUrl}/api/corpus/index?depth=survey`,
    ...(isSurvey ? {} : { 'art-official:urlTemplates': buildUrlTemplates(baseUrl) }),
    ...(options.artifact.about.length ? { about: options.artifact.about } : {}),
    dataFeedElement: pageItems.map((work) =>
      isSurvey ? work.surveyProjection : work.indexProjection,
    ),
  }
}

export function buildRootFeedFromArtifact(options: {
  artifact: CorpusArtifact
  filters?: CorpusIndexFilters
  page?: number
  perPage?: number
  baseUrl?: string
}): Record<string, unknown> {
  const baseUrl = options.baseUrl ?? CORPUS_BASE
  const filters = options.filters ?? {}
  const defaultPerPage = CORPUS_ROOT_PER_PAGE
  const perPage = Math.min(options.perPage ?? defaultPerPage, CORPUS_ROOT_MAX_PER_PAGE)
  const page = options.page ?? 1
  const matched = filterArtifactWorks(options.artifact.works, filters)
  const pageItems = paginateItems(matched, page, perPage)
  const qs = buildCorpusIndexQueryString(filters)
  const url = `${baseUrl}/api/corpus${qs}`

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
    dateModified: options.artifact['art-official:generatedAt'],
    'art-official:corpusVersion': CORPUS_VERSION,
    'art-official:generatedAt': options.artifact['art-official:generatedAt'],
    'art-official:supersedesNote': options.artifact['art-official:supersedesNote'],
    'art-official:totalArtworks': options.artifact['art-official:totalArtworks'],
    'art-official:totalPublished': options.artifact['art-official:totalPublished'],
    ...buildScopeDepthEnvelope('root'),
    'art-official:tierMap': buildTierMap(baseUrl),
    'art-official:coverage': coverageFromArtifactWorks(matched),
    ...pagination,
    author: options.artifact.author,
    about: options.artifact.about,
    dataFeedElement: pageItems.map((work) => {
      const { '@context': _ctx, ...entry } = work.record
      return entry
    }),
  }
}

/** HTML /corpus row shape — no Payload Artwork required. */
export type ArtifactCorpusIndexRow = {
  slug: string
  title: string
  yearCreated: number | null
  reasoningStatus: string | null
  seriesName: string | null
  gist: string | null
  intent: string | null
}

export function rowsFromArtifactWorks(works: CorpusWorkEnvelope[]): ArtifactCorpusIndexRow[] {
  return works.map((work) => ({
    slug: work.slug,
    title: work.filters.title,
    yearCreated: work.filters.yearCreated,
    reasoningStatus: work.filters.reasoningStatus,
    seriesName: work.filters.seriesName,
    gist:
      typeof work.indexProjection['art-official:gist'] === 'string'
        ? (work.indexProjection['art-official:gist'] as string)
        : null,
    intent:
      typeof work.surveyProjection['art-official:intentLine'] === 'string'
        ? (work.surveyProjection['art-official:intentLine'] as string)
        : null,
  }))
}

export type ArtifactSeriesOption = {
  id: string
  slug: string
  name: string
}

export function seriesOptionsFromArtifact(artifact: CorpusArtifact): ArtifactSeriesOption[] {
  return artifact.about
    .map((node, index) => {
      const name = typeof node.name === 'string' ? node.name : null
      const idUrl = typeof node['@id'] === 'string' ? node['@id'] : ''
      const match = idUrl.match(/\/series\/([^/#]+)/)
      const slug = match?.[1] ?? null
      if (!name || !slug) return null
      return { id: String(index), slug, name }
    })
    .filter((row): row is ArtifactSeriesOption => row != null)
}
