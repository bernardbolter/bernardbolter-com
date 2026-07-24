import type { Artist, Artwork, Session } from '@/payload-types'

export type AccumulatingEntry = {
  id: string
  dateLabel: string
  text: string
  /** Permalink to bio entry or throughline page (preferred). */
  permalinkHref: string | null
  /** @deprecated Prefer permalinkHref — kept for transitional callers. */
  sessionHref: string | null
  reinforcingCount?: number
}

export type HistoricalDocumentLink = {
  id: string
  dateLabel: string
  context: string | null
  href: string
}

function relationId(value: unknown): number | null {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id: unknown }).id
    return typeof id === 'number' ? id : null
  }
  return null
}

function sessionPublicHref(session: number | Session | null | undefined): string | null {
  if (!session || typeof session !== 'object') return null
  if (session.status !== 'completed') return null
  if (!session.sessionId) return null
  return `/sessions/${session.sessionId}`
}

function formatIsoDate(value: string | null | undefined): string {
  if (!value) return ''
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = new Date(trimmed)
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    }
  }
  return trimmed
}

export function publicBioTimelineEntries(artist: Artist): AccumulatingEntry[] {
  return (artist.bioTimelineEntries ?? [])
    .filter((entry) => (entry.visibility ?? 'public') === 'public' && entry.text?.trim())
    .map((entry) => ({
      id: entry.id ?? entry.text,
      dateLabel: entry.eventDate?.trim() || '—',
      text: entry.text.trim(),
      permalinkHref: entry.slug?.trim() ? `/bio/entries/${entry.slug.trim()}` : null,
      sessionHref: sessionPublicHref(entry.sourceSessionRef),
    }))
}

export function publicStatementThroughlines(artist: Artist): AccumulatingEntry[] {
  return (artist.statementThroughlines ?? [])
    .filter((entry) => (entry.visibility ?? 'public') === 'public' && entry.text?.trim())
    .map((entry) => ({
      id: entry.id ?? entry.text,
      dateLabel: formatIsoDate(entry.dateRecognized) || '—',
      text: entry.text.trim(),
      permalinkHref: entry.slug?.trim()
        ? `/statement/throughlines/${entry.slug.trim()}`
        : null,
      sessionHref: sessionPublicHref(entry.sourceSessionRef),
      reinforcingCount: entry.reinforcingSessions?.length ?? 0,
    }))
}

export function historicalBioLinks(artist: Artist): HistoricalDocumentLink[] {
  return (artist.historicalBios ?? [])
    .filter((entry) => entry.id && entry.fullText)
    .map((entry) => ({
      id: entry.id!,
      dateLabel: formatIsoDate(entry.date) || 'Undated',
      context: entry.context?.trim() || null,
      href: `/bio/history/${entry.id}`,
    }))
}

export function historicalStatementLinks(artist: Artist): HistoricalDocumentLink[] {
  return (artist.historicalStatements ?? [])
    .filter((entry) => entry.id && entry.fullText)
    .map((entry) => ({
      id: entry.id!,
      dateLabel: formatIsoDate(entry.date) || 'Undated',
      context: entry.context?.trim() || null,
      href: `/statement/history/${entry.id}`,
    }))
}

export function throughlineMentionArtworks(artist: Artist): Artwork[] {
  const seen = new Set<number>()
  const out: Artwork[] = []
  for (const entry of artist.statementThroughlines ?? []) {
    if ((entry.visibility ?? 'public') !== 'public') continue
    for (const linked of entry.linkedArtworkSlugs ?? []) {
      if (!linked || typeof linked !== 'object') continue
      if (seen.has(linked.id)) continue
      seen.add(linked.id)
      out.push(linked)
    }
  }
  return out
}

export function findHistoricalBio(artist: Artist, entryId: string) {
  return (artist.historicalBios ?? []).find((entry) => entry.id === entryId) ?? null
}

export function findHistoricalStatement(artist: Artist, entryId: string) {
  return (artist.historicalStatements ?? []).find((entry) => entry.id === entryId) ?? null
}

export function resolveSessionNumericId(value: unknown): number | null {
  return relationId(value)
}
