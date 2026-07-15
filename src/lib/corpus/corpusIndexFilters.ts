export type CorpusIndexFilters = {
  series?: string | null
  yearFrom?: number | null
  yearTo?: number | null
  status?: 'stub' | 'partial' | 'complete' | null
  hasVisionAnalyses?: boolean | null
}

export function parseCorpusIndexFilters(
  searchParams: URLSearchParams | { get: (key: string) => string | null },
): CorpusIndexFilters {
  const series = searchParams.get('series')?.trim() || null
  const yearFromRaw = searchParams.get('yearFrom')?.trim()
  const yearToRaw = searchParams.get('yearTo')?.trim()
  const statusRaw = searchParams.get('status')?.trim()
  const hasVisionRaw = searchParams.get('hasVisionAnalyses')?.trim().toLowerCase()

  const yearFrom = yearFromRaw && /^\d{4}$/.test(yearFromRaw) ? Number(yearFromRaw) : null
  const yearTo = yearToRaw && /^\d{4}$/.test(yearToRaw) ? Number(yearToRaw) : null

  const status =
    statusRaw === 'stub' || statusRaw === 'partial' || statusRaw === 'complete'
      ? statusRaw
      : null

  let hasVisionAnalyses: boolean | null = null
  if (hasVisionRaw === 'true' || hasVisionRaw === '1') hasVisionAnalyses = true
  if (hasVisionRaw === 'false' || hasVisionRaw === '0') hasVisionAnalyses = false

  return { series, yearFrom, yearTo, status, hasVisionAnalyses }
}

export function corpusIndexHasActiveFilters(filters: CorpusIndexFilters): boolean {
  return Boolean(
    filters.series ||
      filters.yearFrom != null ||
      filters.yearTo != null ||
      filters.status ||
      filters.hasVisionAnalyses != null,
  )
}

export function buildCorpusIndexQueryString(filters: CorpusIndexFilters): string {
  const params = new URLSearchParams()
  if (filters.series) params.set('series', filters.series)
  if (filters.yearFrom != null) params.set('yearFrom', String(filters.yearFrom))
  if (filters.yearTo != null) params.set('yearTo', String(filters.yearTo))
  if (filters.status) params.set('status', filters.status)
  if (filters.hasVisionAnalyses != null) {
    params.set('hasVisionAnalyses', filters.hasVisionAnalyses ? 'true' : 'false')
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}
