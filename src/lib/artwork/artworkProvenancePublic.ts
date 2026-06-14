import type { Artist, Artwork } from '@/payload-types'

type ConfidenceRow = { confidenceLevel?: string | null }
type OwnershipRow = {
  displayName?: string | null
  city?: string | null
  dateAcquired?: string | null
  dateRelinquished?: string | null
  collectorVisible?: boolean | null
  claimStatus?: string | null
  ownerPrivate?: string | null
}
type LoanRow = {
  institution?: string | null
  dateOut?: string | null
  dateReturned?: string | null
  eventId?: number | null
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export type ProvenanceConfidenceSummary = 'documented' | 'partial' | 'undocumented'

export function deriveProvenanceConfidenceSummary(
  artwork: Pick<Artwork, 'provenanceConfidenceLayer' | 'provenanceOriginKnown'>,
): ProvenanceConfidenceSummary | null {
  if (artwork.provenanceOriginKnown === false) return 'undocumented'

  const layers = asArray<ConfidenceRow>(artwork.provenanceConfidenceLayer)
  if (layers.length === 0) return null

  const levels = layers.map((row) => row.confidenceLevel).filter(Boolean)
  if (levels.length === 0) return null
  if (levels.every((level) => level === 'documented-fact')) return 'documented'
  return 'partial'
}

export function provenanceConfidenceStatement(summary: ProvenanceConfidenceSummary): string {
  switch (summary) {
    case 'documented':
      return 'Provenance: fully documented'
    case 'partial':
      return 'Provenance: partially documented'
    case 'undocumented':
      return 'Provenance: origin undocumented'
  }
}

export type OwnershipTimelineRow = {
  text: string
}

export type OwnershipDisplay = {
  showSection: boolean
  currentHolderLine: string | null
  showOriginHonesty: boolean
  timelineRows: OwnershipTimelineRow[]
  showTimeline: boolean
  showUnclaimedAppeal: boolean
  claimContactHref: string | null
}

function extractYear(value?: string | null): string | null {
  if (!value?.trim()) return null
  const match = value.trim().match(/\b(19|20)\d{2}\b/)
  return match?.[0] ?? value.trim()
}

function formatTimelineEnd(dateRelinquished?: string | null): string {
  return dateRelinquished?.trim() || 'present'
}

function sortByDateAcquired(rows: OwnershipRow[]): OwnershipRow[] {
  return [...rows].sort((a, b) => (a.dateAcquired ?? '').localeCompare(b.dateAcquired ?? ''))
}

function getOwnershipRows(artwork: Artwork): OwnershipRow[] {
  return asArray<OwnershipRow>(artwork.ownershipHistory)
}

function findCurrentOwnershipEntry(rows: OwnershipRow[]): OwnershipRow | null {
  const open = rows.filter((row) => !row.dateRelinquished?.trim())
  if (open.length === 0) return null
  const sorted = sortByDateAcquired(open)
  return sorted[sorted.length - 1] ?? null
}

function isInArtistsStudio(artwork: Artwork): boolean {
  return artwork.currentLocation?.category === 'artists-studio'
}

export function shouldShowOwnershipSection(artwork: Artwork): boolean {
  const rows = getOwnershipRows(artwork)
  if (rows.some((row) => row.collectorVisible === true)) return true
  if (artwork.provenanceOriginKnown === false) return true
  if (isInArtistsStudio(artwork)) return true
  return false
}

export function buildCurrentHolderLine(artwork: Artwork, artist: Artist | null): string {
  const onLoan = artwork.currentLocation?.category === 'on-loan'
  let line: string

  if (isInArtistsStudio(artwork)) {
    const detail = artwork.currentLocation?.locationDetail?.trim()
    if (detail) {
      line = `Currently in the artist's studio, ${detail}`
    } else {
      const city = artist?.workCity1?.trim()
      line = city ?
        `Currently in the artist's studio, ${city}`
      : "Currently in the artist's studio"
    }
  } else {
    const current = findCurrentOwnershipEntry(getOwnershipRows(artwork))
    if (current?.collectorVisible === true) {
      const name = current.displayName?.trim() || 'Private collection'
      const city = current.city?.trim()
      const year = extractYear(current.dateAcquired)
      const locationPart = city ? `${name}, ${city}` : name
      line =
        year ?
          `Currently held by ${locationPart} · since ${year}`
        : `Currently held by ${locationPart}`
    } else {
      line = 'Currently in a private collection'
    }
  }

  if (onLoan) {
    line += ' · currently on loan'
  }

  return line
}

export function buildOwnershipTimelineRows(artwork: Artwork): OwnershipTimelineRow[] {
  const rows = sortByDateAcquired(getOwnershipRows(artwork))
  if (rows.length < 2) return []

  const result: OwnershipTimelineRow[] = []
  const yearCreated = artwork.yearCreated
  const first = rows[0]
  const firstAcquired = first?.dateAcquired?.trim()

  if (yearCreated && firstAcquired) {
    const acquiredYear = extractYear(firstAcquired)
    if (acquiredYear && acquiredYear > String(yearCreated)) {
      result.push({
        text: `Artist's studio · ${yearCreated}–${firstAcquired}`,
      })
    }
  }

  for (const row of rows) {
    const range = `${row.dateAcquired?.trim() || '?'}–${formatTimelineEnd(row.dateRelinquished)}`
    if (row.collectorVisible === true) {
      const name = row.displayName?.trim() || 'Private collection'
      const city = row.city?.trim()
      const parts = city ? [name, city, range] : [name, range]
      result.push({ text: parts.join(' · ') })
    } else {
      result.push({ text: `Private collection · ${range}` })
    }
  }

  return result
}

export function buildOwnershipClaimHref(artwork: Pick<Artwork, 'slug' | 'title'>): string {
  const params = new URLSearchParams()
  if (artwork.slug) params.set('claim', artwork.slug)
  if (artwork.title) params.set('title', artwork.title)
  return `/contact?${params.toString()}`
}

export function hasUnclaimedOwnershipAppeal(artwork: Artwork): boolean {
  if (isInArtistsStudio(artwork)) return false

  return getOwnershipRows(artwork).some(
    (row) => row.claimStatus === 'unclaimed' && !row.dateRelinquished?.trim(),
  )
}

export function buildOwnershipDisplay(artwork: Artwork, artist: Artist | null): OwnershipDisplay {
  const timelineRows = buildOwnershipTimelineRows(artwork)
  const showUnclaimedAppeal = hasUnclaimedOwnershipAppeal(artwork)

  return {
    showSection: shouldShowOwnershipSection(artwork),
    currentHolderLine: buildCurrentHolderLine(artwork, artist),
    showOriginHonesty: artwork.provenanceOriginKnown === false,
    timelineRows,
    showTimeline: timelineRows.length > 0,
    showUnclaimedAppeal,
    claimContactHref: showUnclaimedAppeal ? buildOwnershipClaimHref(artwork) : null,
  }
}

/** @deprecated Use buildOwnershipTimelineRows — kept for transitional tests. */
export function getPublicOwnershipTimeline(artwork: Artwork): Array<{
  displayName: string
  city?: string
  dateAcquired?: string
  dateRelinquished?: string
}> {
  return getOwnershipRows(artwork)
    .filter((row) => row.collectorVisible === true)
    .map((row) => ({
      displayName: row.displayName?.trim() || 'Private collection',
      city: row.city?.trim() || undefined,
      dateAcquired: row.dateAcquired?.trim() || undefined,
      dateRelinquished: row.dateRelinquished?.trim() || undefined,
    }))
}

export type PublicLoanEntry = {
  institution: string
  dateOut?: string
  dateReturned?: string
  eventId?: number
}

export function getPublicLoanHistory(artwork: Artwork): PublicLoanEntry[] {
  return asArray<LoanRow>(artwork.loanHistory)
    .filter((row) => row.institution?.trim())
    .map((row) => ({
      institution: row.institution!.trim(),
      dateOut: row.dateOut?.trim() || undefined,
      dateReturned: row.dateReturned?.trim() || undefined,
      eventId: typeof row.eventId === 'number' ? row.eventId : undefined,
    }))
}
