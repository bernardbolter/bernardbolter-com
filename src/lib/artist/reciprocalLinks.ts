import { resolveConnectorCardLabel } from '@/lib/artwork/catalogueIdentity'
import { CORPUS_BASE } from '@/lib/corpus/constants'
import type { Artist, Artwork } from '@/payload-types'

export type ReciprocalLink = {
  /** Short title — prominent label. */
  name: string
  url: string
  /** Full claim text — always SSR'd. */
  claim: string
  /**
   * Span when derivable: year / year range, or how many works the claim touches.
   * Null when neither is available.
   */
  span: string | null
}

function relationMatchesArtwork(
  linked: number | Artwork | null | undefined,
  artwork: Pick<Artwork, 'id' | 'slug'>,
): boolean {
  if (linked == null) return false
  if (typeof linked === 'number') return linked === artwork.id
  if (typeof linked !== 'object') return false
  if (typeof linked.id === 'number' && linked.id === artwork.id) return true
  const linkedSlug = linked.slug?.trim()
  const artworkSlug = artwork.slug?.trim()
  return Boolean(linkedSlug && artworkSlug && linkedSlug === artworkSlug)
}

function entryLinksArtwork(
  linked: (number | Artwork)[] | null | undefined,
  artwork: Pick<Artwork, 'id' | 'slug'>,
): boolean {
  return (linked ?? []).some((row) => relationMatchesArtwork(row, artwork))
}

function linkedArtworkCount(linked: (number | Artwork)[] | null | undefined): number {
  return (linked ?? []).length
}

function yearsFromLinkedArtworks(linked: (number | Artwork)[] | null | undefined): number[] {
  const years: number[] = []
  for (const row of linked ?? []) {
    if (!row || typeof row !== 'object') continue
    if (typeof row.yearStart === 'number' && Number.isFinite(row.yearStart)) {
      years.push(row.yearStart)
    }
    if (typeof row.yearCompleted === 'number' && Number.isFinite(row.yearCompleted)) {
      years.push(row.yearCompleted)
    }
  }
  return years
}

function formatYearRange(years: number[]): string | null {
  if (years.length === 0) return null
  const min = Math.min(...years)
  const max = Math.max(...years)
  if (min === max) return String(min)
  return `${min}–${max}`
}

function formatWorksSpan(count: number): string | null {
  if (count <= 0) return null
  return count === 1 ? '1 work' : `${count} works`
}

/**
 * Prefer an explicit date/year, then a range from linked works, then a work count.
 */
export function formatConnectorSpan(input: {
  eventDate?: string | null
  linked?: (number | Artwork)[] | null
}): string | null {
  const eventDate = input.eventDate?.replace(/\s+/g, ' ').trim()
  if (eventDate) return eventDate

  const yearRange = formatYearRange(yearsFromLinkedArtworks(input.linked))
  if (yearRange) return yearRange

  return formatWorksSpan(linkedArtworkCount(input.linked))
}

function pathForConnector(origin: string, path: string): string {
  if (!origin) return path
  return `${origin}${path}`
}

/**
 * Live reverse lookup: public statement throughlines whose linkedArtworkSlugs
 * include this artwork. No stored backfill — same pattern as Visual Similarity.
 */
export function findRelatedThroughlines(
  artist: Artist | null | undefined,
  artwork: Pick<Artwork, 'id' | 'slug'>,
  baseUrl: string = CORPUS_BASE,
): ReciprocalLink[] {
  if (!artist) return []
  const origin = baseUrl.replace(/\/$/, '')
  const out: ReciprocalLink[] = []

  for (const entry of artist.statementThroughlines ?? []) {
    if ((entry.visibility ?? 'public') !== 'public') continue
    const slug = entry.slug?.trim()
    const text = entry.text?.trim()
    if (!slug || !text) continue
    if (!entryLinksArtwork(entry.linkedArtworkSlugs, artwork)) continue
    const claim = text.replace(/\s+/g, ' ').trim()
    const name = resolveConnectorCardLabel({
      text: claim,
      shortTitle: entry.shortTitle,
    })
    if (!name) continue
    out.push({
      name,
      claim,
      span: formatConnectorSpan({ linked: entry.linkedArtworkSlugs }),
      url: pathForConnector(origin, `/statement/throughlines/${slug}`),
    })
  }

  return out
}

/**
 * Live reverse lookup: public bio timeline entries whose linkedArtworkSlugs
 * include this artwork.
 */
export function findRelatedBioEvents(
  artist: Artist | null | undefined,
  artwork: Pick<Artwork, 'id' | 'slug'>,
  baseUrl: string = CORPUS_BASE,
): ReciprocalLink[] {
  if (!artist) return []
  const origin = baseUrl.replace(/\/$/, '')
  const out: ReciprocalLink[] = []

  for (const entry of artist.bioTimelineEntries ?? []) {
    if ((entry.visibility ?? 'public') !== 'public') continue
    const slug = entry.slug?.trim()
    const text = entry.text?.trim()
    if (!slug || !text) continue
    if (!entryLinksArtwork(entry.linkedArtworkSlugs, artwork)) continue
    const claim = text.replace(/\s+/g, ' ').trim()
    const name = resolveConnectorCardLabel({
      text: claim,
      shortTitle: entry.shortTitle,
    })
    if (!name) continue
    out.push({
      name,
      claim,
      span: formatConnectorSpan({
        eventDate: entry.eventDate,
        linked: entry.linkedArtworkSlugs,
      }),
      url: pathForConnector(origin, `/bio/entries/${slug}`),
    })
  }

  return out
}

/** Tier 1 drill-down signal — true when either reverse lookup has hits. */
export function artworkHasThroughlineConnections(
  artist: Artist | null | undefined,
  artwork: Pick<Artwork, 'id' | 'slug'>,
): boolean {
  if (!artist) return false
  for (const entry of artist.statementThroughlines ?? []) {
    if ((entry.visibility ?? 'public') !== 'public') continue
    if (!entry.slug?.trim() || !entry.text?.trim()) continue
    if (entryLinksArtwork(entry.linkedArtworkSlugs, artwork)) return true
  }
  for (const entry of artist.bioTimelineEntries ?? []) {
    if ((entry.visibility ?? 'public') !== 'public') continue
    if (!entry.slug?.trim() || !entry.text?.trim()) continue
    if (entryLinksArtwork(entry.linkedArtworkSlugs, artwork)) return true
  }
  return false
}
