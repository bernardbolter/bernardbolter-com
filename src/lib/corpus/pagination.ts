import type { CorpusIndexFilters } from '@/lib/corpus/corpusIndexFilters'
import { buildCorpusIndexQueryString } from '@/lib/corpus/corpusIndexFilters'

export type CorpusPaginationInput = {
  page: number
  perPage: number
  totalMatched: number
}

export type CorpusListPath = 'index' | 'root'

export function parsePageParam(raw: string | null | undefined): number {
  if (!raw?.trim()) return 1
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.floor(n)
}

export function parsePerPageParam(
  raw: string | null | undefined,
  defaultPerPage: number,
  maxPerPage: number,
): number {
  if (!raw?.trim()) return defaultPerPage
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1) return defaultPerPage
  return Math.min(Math.floor(n), maxPerPage)
}

export function paginateItems<T>(items: T[], page: number, perPage: number): T[] {
  const start = (page - 1) * perPage
  if (start >= items.length) return []
  return items.slice(start, start + perPage)
}

function buildListQueryString(options: {
  filters: CorpusIndexFilters
  page: number
  perPage: number
  defaultPerPage: number
  depth?: 'survey' | null
}): string {
  const params = new URLSearchParams()
  const filterQs = buildCorpusIndexQueryString(options.filters)
  if (filterQs.startsWith('?')) {
    new URLSearchParams(filterQs.slice(1)).forEach((value, key) => {
      params.set(key, value)
    })
  }
  if (options.depth === 'survey') params.set('depth', 'survey')
  if (options.page > 1) params.set('page', String(options.page))
  if (options.perPage !== options.defaultPerPage) {
    params.set('perPage', String(options.perPage))
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function buildPaginationEnvelope(options: {
  baseUrl: string
  path: CorpusListPath
  filters: CorpusIndexFilters
  page: number
  perPage: number
  defaultPerPage: number
  totalMatched: number
  depth?: 'survey' | null
}): Record<string, unknown> {
  const totalPages =
    options.totalMatched === 0 ? 0 : Math.ceil(options.totalMatched / options.perPage)
  const path =
    options.path === 'index' ? `${options.baseUrl}/api/corpus/index` : `${options.baseUrl}/api/corpus`

  const pageUrl = (page: number) =>
    `${path}${buildListQueryString({
      filters: options.filters,
      page,
      perPage: options.perPage,
      defaultPerPage: options.defaultPerPage,
      depth: options.depth,
    })}`

  return {
    'artism:page': options.page,
    'artism:perPage': options.perPage,
    'artism:totalPages': totalPages,
    'artism:totalMatched': options.totalMatched,
    'artism:nextPage':
      totalPages > 0 && options.page < totalPages ? pageUrl(options.page + 1) : null,
    'artism:prevPage': options.page > 1 && totalPages > 0 ? pageUrl(options.page - 1) : null,
  }
}
