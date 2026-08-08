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
  hasStruggle?: boolean | null
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

  const struggleRaw = searchParams.get('hasStruggle')?.trim().toLowerCase()
  let hasStruggle: boolean | null = null
  if (struggleRaw === 'true' || struggleRaw === '1') hasStruggle = true
  if (struggleRaw === 'false' || struggleRaw === '0') hasStruggle = false

  return {
    artwork,
    sessionType,
    series,
    completedAfter,
    completedBefore,
    linchpinFlag,
    hasStruggle,
  }
}

export function sessionIndexHasActiveFilters(filters: SessionIndexFilters): boolean {
  return Boolean(
    filters.artwork ||
      filters.sessionType ||
      filters.series ||
      filters.completedAfter ||
      filters.completedBefore ||
      filters.linchpinFlag != null ||
      filters.hasStruggle != null,
  )
}

/**
 * Self-canonicalize filtered /sessions views that change the result set.
 * Empty filters, empty results, or filters that leave the full list unchanged
 * still defer to bare `/sessions`.
 */
export function resolveSessionsIndexCanonical(options: {
  filters: SessionIndexFilters
  filteredCount: number
  unfilteredCount: number
}): string {
  const { filters, filteredCount, unfilteredCount } = options
  if (!sessionIndexHasActiveFilters(filters)) return '/sessions'
  if (filteredCount === 0) return '/sessions'
  if (filteredCount === unfilteredCount) return '/sessions'
  return `/sessions${buildSessionIndexQueryString(filters)}`
}

type ArtworkLike = { id?: number; slug?: string | null } | number | null | undefined

function artworkSlug(value: ArtworkLike): string | null {
  if (!value || typeof value !== 'object') return null
  const slug = value.slug?.trim()
  return slug || null
}

/**
 * Prefer a relationship that actually carries a slug.
 * Early sessions often have `primaryArtwork: null` and only `artworkRecord` set;
 * never short-circuit on a populated-but-slugless primary object.
 */
export function resolveSessionPrimaryArtwork<T extends { slug?: string | null }>(
  primaryArtwork: number | T | null | undefined,
  artworkRecord: number | T | null | undefined,
): T | null {
  const primary = primaryArtwork && typeof primaryArtwork === 'object' ? primaryArtwork : null
  const legacy = artworkRecord && typeof artworkRecord === 'object' ? artworkRecord : null
  if (primary && artworkSlug(primary)) return primary
  if (legacy && artworkSlug(legacy)) return legacy
  return primary ?? legacy
}

/** Slugs this session should match for `/sessions?artwork=` (primary + mentioned). */
export function sessionArtworkFilterSlugs(options: {
  primaryArtwork?: ArtworkLike
  artworkRecord?: ArtworkLike
  mentionedArtworks?: ArtworkLike[] | null
}): string[] {
  const slugs = new Set<string>()
  const primary = resolveSessionPrimaryArtwork(options.primaryArtwork, options.artworkRecord)
  const primarySlug = artworkSlug(primary)
  if (primarySlug) slugs.add(primarySlug)
  for (const entry of options.mentionedArtworks ?? []) {
    const slug = artworkSlug(entry)
    if (slug) slugs.add(slug)
  }
  return [...slugs]
}

export function sessionMatchesArtworkFilter(
  session: {
    primaryArtwork?: ArtworkLike
    artworkRecord?: ArtworkLike
    mentionedArtworks?: ArtworkLike[] | null
  },
  artworkSlugFilter: string,
): boolean {
  const needle = artworkSlugFilter.trim()
  if (!needle) return true
  return sessionArtworkFilterSlugs(session).includes(needle)
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
  if (filters.hasStruggle != null) {
    params.set('hasStruggle', filters.hasStruggle ? 'true' : 'false')
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
