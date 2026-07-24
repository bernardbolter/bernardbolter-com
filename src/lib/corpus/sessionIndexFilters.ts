export const SESSION_INDEX_TYPE_OPTIONS = [
  'artwork-cataloguing',
  'artist-statement',
  'biography',
  'onboarding',
  'event-enrichment',
  'corpus-revisit',
] as const

export type SessionIndexType = (typeof SESSION_INDEX_TYPE_OPTIONS)[number]

export type SessionIndexFilters = {
  artwork?: string | null
  sessionType?: SessionIndexType | null
  series?: string | null
  completedAfter?: string | null
  completedBefore?: string | null
  linchpinFlag?: boolean | null
}

function parseDateParam(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  // YYYY or YYYY-MM-DD (corpus-style year or full date)
  if (/^\d{4}$/.test(trimmed)) return `${trimmed}-01-01`
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  return null
}

export function parseSessionIndexFilters(
  searchParams: URLSearchParams | { get: (key: string) => string | null },
): SessionIndexFilters {
  const artwork = searchParams.get('artwork')?.trim() || null
  const series = searchParams.get('series')?.trim() || null
  const sessionTypeRaw = searchParams.get('sessionType')?.trim() || null
  const sessionType =
    sessionTypeRaw &&
    (SESSION_INDEX_TYPE_OPTIONS as readonly string[]).includes(sessionTypeRaw)
      ? (sessionTypeRaw as SessionIndexType)
      : null

  const completedAfter = parseDateParam(searchParams.get('completedAfter'))
  const completedBeforeRaw = searchParams.get('completedBefore')?.trim() || null
  let completedBefore: string | null = null
  if (completedBeforeRaw && /^\d{4}$/.test(completedBeforeRaw)) {
    completedBefore = `${completedBeforeRaw}-12-31`
  } else {
    completedBefore = parseDateParam(completedBeforeRaw)
  }

  const linchpinRaw = searchParams.get('linchpinFlag')?.trim().toLowerCase()
  let linchpinFlag: boolean | null = null
  if (linchpinRaw === 'true' || linchpinRaw === '1') linchpinFlag = true
  if (linchpinRaw === 'false' || linchpinRaw === '0') linchpinFlag = false

  return {
    artwork,
    sessionType,
    series,
    completedAfter,
    completedBefore,
    linchpinFlag,
  }
}

export function sessionIndexHasActiveFilters(filters: SessionIndexFilters): boolean {
  return Boolean(
    filters.artwork ||
      filters.sessionType ||
      filters.series ||
      filters.completedAfter ||
      filters.completedBefore ||
      filters.linchpinFlag != null,
  )
}

export function buildSessionIndexQueryString(filters: SessionIndexFilters): string {
  const params = new URLSearchParams()
  if (filters.artwork) params.set('artwork', filters.artwork)
  if (filters.sessionType) params.set('sessionType', filters.sessionType)
  if (filters.series) params.set('series', filters.series)
  if (filters.completedAfter) {
    // Prefer year-only in links when we expanded YYYY → YYYY-01-01
    const after = filters.completedAfter.endsWith('-01-01')
      ? filters.completedAfter.slice(0, 4)
      : filters.completedAfter
    params.set('completedAfter', after)
  }
  if (filters.completedBefore) {
    const before = filters.completedBefore.endsWith('-12-31')
      ? filters.completedBefore.slice(0, 4)
      : filters.completedBefore
    params.set('completedBefore', before)
  }
  if (filters.linchpinFlag != null) {
    params.set('linchpinFlag', filters.linchpinFlag ? 'true' : 'false')
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

/** Display values for year inputs (strip expanded day bounds). */
export function sessionFilterYearDisplay(
  isoOrNull: string | null | undefined,
  bound: 'after' | 'before',
): string {
  if (!isoOrNull) return ''
  if (bound === 'after' && isoOrNull.endsWith('-01-01')) return isoOrNull.slice(0, 4)
  if (bound === 'before' && isoOrNull.endsWith('-12-31')) return isoOrNull.slice(0, 4)
  return isoOrNull
}
