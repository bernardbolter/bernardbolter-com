import type { Event } from '@/payload-types'

export type SearchEventsInput = {
  venueKeywords?: string | null
  yearApprox?: number | null
  titleKeywords?: string | null
}

export type SearchEventsCandidate = {
  id: number
  slug: string
  title: string
  venueName: string | null
  venueCity: string | null
  yearStart: number | null
  eventType: string
  enrichmentStatus: string | null
  score: number
  matchReasons: string[]
}

export type SearchEventsResult = {
  candidates: SearchEventsCandidate[]
  possibleDuplicates: boolean
  note: string | null
}

/** Lowercase, strip punctuation, collapse whitespace. */
export function normalizeEventSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokens(value: string): string[] {
  return normalizeEventSearchText(value)
    .split(' ')
    .filter((t) => t.length >= 2)
}

function yearWithinTolerance(
  yearStart: number | null | undefined,
  yearApprox: number | null | undefined,
): boolean {
  if (yearApprox == null || !Number.isFinite(yearApprox)) return true
  if (typeof yearStart !== 'number' || !Number.isFinite(yearStart)) return false
  return Math.abs(yearStart - yearApprox) <= 1
}

function scoreField(
  haystack: string | null | undefined,
  needle: string | null | undefined,
): { score: number; reasons: string[] } {
  if (!needle?.trim() || !haystack?.trim()) return { score: 0, reasons: [] }
  const h = normalizeEventSearchText(haystack)
  const n = normalizeEventSearchText(needle)
  if (!h || !n) return { score: 0, reasons: [] }

  const reasons: string[] = []
  let score = 0

  if (h === n) {
    score += 40
    reasons.push('exact')
  } else if (h.includes(n) || n.includes(h)) {
    score += 28
    reasons.push('substring')
  }

  const hTokens = new Set(tokens(haystack))
  const nTokens = tokens(needle)
  if (nTokens.length) {
    const hit = nTokens.filter((t) => hTokens.has(t) || [...hTokens].some((ht) => ht.includes(t) || t.includes(ht)))
    const ratio = hit.length / nTokens.length
    if (ratio > 0) {
      score += Math.round(ratio * 30)
      reasons.push(`tokens:${hit.length}/${nTokens.length}`)
    }
  }

  return { score, reasons }
}

function scoreEvent(
  event: Pick<Event, 'title' | 'venueName' | 'venueCity' | 'yearStart'>,
  input: SearchEventsInput,
): { score: number; matchReasons: string[] } | null {
  const hasAnyQuery =
    Boolean(input.venueKeywords?.trim()) ||
    Boolean(input.titleKeywords?.trim()) ||
    input.yearApprox != null
  if (!hasAnyQuery) return null

  if (!yearWithinTolerance(event.yearStart, input.yearApprox)) return null

  const reasons: string[] = []
  let score = 0
  const venueBlob = [event.venueName, event.venueCity].filter(Boolean).join(' ')

  if (input.titleKeywords?.trim()) {
    const titleScore = scoreField(event.title, input.titleKeywords)
    score += titleScore.score
    if (titleScore.reasons.length) reasons.push(`title(${titleScore.reasons.join(',')})`)

    // Title keywords often include venue fragments ("herbst salon pallaseum")
    const crossVenue = scoreField(venueBlob, input.titleKeywords)
    if (crossVenue.score > 0) {
      score += Math.round(crossVenue.score * 0.75)
      reasons.push(`title→venue(${crossVenue.reasons.join(',')})`)
    }
  }

  if (input.venueKeywords?.trim()) {
    const venueScore = scoreField(venueBlob, input.venueKeywords)
    score += venueScore.score
    if (venueScore.reasons.length) reasons.push(`venue(${venueScore.reasons.join(',')})`)

    const crossTitle = scoreField(event.title, input.venueKeywords)
    if (crossTitle.score > 0) {
      score += Math.round(crossTitle.score * 0.5)
      reasons.push(`venue→title(${crossTitle.reasons.join(',')})`)
    }
  }

  if (input.yearApprox != null && typeof event.yearStart === 'number') {
    const delta = Math.abs(event.yearStart - input.yearApprox)
    if (delta === 0) {
      score += 12
      reasons.push('year:exact')
    } else if (delta === 1) {
      score += 6
      reasons.push('year:±1')
    }
  }

  // Require some textual signal when keywords were provided
  const needsText =
    Boolean(input.venueKeywords?.trim()) || Boolean(input.titleKeywords?.trim())
  if (needsText && score < 8) return null

  return { score, matchReasons: reasons }
}

/**
 * Fuzzy match Events by title / venue / year (±1).
 * Returns all plausible candidates ranked by score — never auto-picks one.
 */
export function rankEventSearchCandidates(
  events: Array<
    Pick<
      Event,
      | 'id'
      | 'slug'
      | 'title'
      | 'venueName'
      | 'venueCity'
      | 'yearStart'
      | 'eventType'
      | 'enrichmentStatus'
    >
  >,
  input: SearchEventsInput,
): SearchEventsResult {
  const scored: SearchEventsCandidate[] = []

  for (const event of events) {
    if (!event.slug?.trim() || !event.title?.trim()) continue
    const ranked = scoreEvent(event, input)
    if (!ranked) continue
    scored.push({
      id: event.id,
      slug: event.slug,
      title: event.title,
      venueName: event.venueName?.trim() || null,
      venueCity: event.venueCity?.trim() || null,
      yearStart: typeof event.yearStart === 'number' ? event.yearStart : null,
      eventType: event.eventType,
      enrichmentStatus: event.enrichmentStatus ?? null,
      score: ranked.score,
      matchReasons: ranked.matchReasons,
    })
  }

  scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))

  const top = scored.slice(0, 12)
  const possibleDuplicates =
    top.length >= 2 &&
    top[0]!.score >= 20 &&
    top[1]!.score >= Math.max(12, top[0]!.score * 0.55) &&
    titlesLookRelated(top[0]!.title, top[1]!.title)

  let note: string | null = null
  if (top.length === 0) {
    note = 'No plausible Events matches. Confirm with the artist before create_event_stub.'
  } else if (possibleDuplicates) {
    note =
      'Multiple records look like possible duplicates of the same show — flag for artist review before linking either. Do not merge silently.'
  } else if (top.length > 1) {
    note =
      'Multiple candidates — present one at a time for confirmation. Never auto-pick the best match.'
  }

  return { candidates: top, possibleDuplicates, note }
}

function titlesLookRelated(a: string, b: string): boolean {
  const na = normalizeEventSearchText(a)
  const nb = normalizeEventSearchText(b)
  if (!na || !nb) return false
  if (na === nb || na.includes(nb) || nb.includes(na)) return true
  const aTokens = tokens(a)
  const bTokens = tokens(b)
  if (!aTokens.length || !bTokens.length) return false

  const overlapRatio = (from: string[], against: Set<string>) => {
    const hit = from.filter(
      (t) => against.has(t) || [...against].some((other) => other.includes(t) || t.includes(other)),
    )
    return hit.length / from.length
  }

  const aSet = new Set(aTokens)
  const bSet = new Set(bTokens)
  return overlapRatio(aTokens, bSet) >= 0.5 || overlapRatio(bTokens, aSet) >= 0.5
}
