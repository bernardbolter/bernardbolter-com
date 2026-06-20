import type { Artist, Artwork } from '@/payload-types'

type ConfidenceRow = {
  claim?: string | null
  evidenceBasis?: string | null
  confidenceLevel?: string | null
}
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
  if (Array.isArray(value)) return value as T[]
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown
      return Array.isArray(parsed) ? (parsed as T[]) : []
    } catch {
      return []
    }
  }
  return []
}

function formatAcquisitionDate(value?: string | null): string | null {
  if (!value?.trim()) return null
  const trimmed = value.trim()
  const yearMonth = trimmed.match(/^(\d{4})-(\d{2})/)
  if (yearMonth) return `${yearMonth[1]}-${yearMonth[2]}`
  const year = extractYear(trimmed)
  return year
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

export type PublicProvenanceClaim = {
  claim: string
  confidenceLevel: 'documented-fact' | 'credible-inference' | 'institutional-assertion'
}

const PUBLIC_CONFIDENCE_LEVELS = new Set([
  'documented-fact',
  'credible-inference',
  'institutional-assertion',
])

export function getPublicProvenanceClaims(
  artwork: Pick<Artwork, 'provenanceConfidenceLayer'>,
): {
  prominent: PublicProvenanceClaim[]
  demoted: PublicProvenanceClaim[]
  hasDocumentedFact: boolean
  hasCredibleInference: boolean
} {
  const layers = asArray<ConfidenceRow>(artwork.provenanceConfidenceLayer)
  const prominent: PublicProvenanceClaim[] = []
  const demoted: PublicProvenanceClaim[] = []

  for (const row of layers) {
    const claim = row.claim?.trim()
    const confidenceLevel = row.confidenceLevel?.trim()
    if (!claim || !confidenceLevel || confidenceLevel === 'speculation') continue
    if (!PUBLIC_CONFIDENCE_LEVELS.has(confidenceLevel)) continue

    const entry = {
      claim,
      confidenceLevel: confidenceLevel as PublicProvenanceClaim['confidenceLevel'],
    }

    if (confidenceLevel === 'institutional-assertion') {
      demoted.push(entry)
    } else {
      prominent.push(entry)
    }
  }

  return {
    prominent,
    demoted,
    hasDocumentedFact: prominent.some((row) => row.confidenceLevel === 'documented-fact'),
    hasCredibleInference: prominent.some((row) => row.confidenceLevel === 'credible-inference'),
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
  return Boolean(artwork.currentLocation?.category)
}

export function buildCurrentHolderLine(artwork: Artwork, artist: Artist | null): string {
  if (artwork.availabilityStatus === 'on-consignment') {
    return `Available via ${artwork.galleryReference?.trim() || 'gallery'}`
  }

  const category = artwork.currentLocation?.category

  switch (category) {
    case 'artists-studio': {
      const detail = artwork.currentLocation?.locationDetail?.trim()
      if (detail) return `Currently in artist's studio, ${detail}`
      const city = artist?.workCity1?.trim()
      return city ? `Currently in artist's studio, ${city}` : "Currently in artist's studio"
    }
    case 'institution':
      return artwork.currentLocation?.locationDetail?.trim() || 'Institution'
    case 'on-loan':
      return 'Currently on loan'
    case 'private-collection':
    default: {
      const current = findCurrentOwnershipEntry(getOwnershipRows(artwork))
      if (current?.collectorVisible === true) {
        const name = current.displayName?.trim() || 'Private collection'
        const city = current.city?.trim()
        return city ? `${name}, ${city}` : name
      }
      return 'Private collection'
    }
  }
}

export function buildOwnershipTimelineRows(artwork: Artwork): OwnershipTimelineRow[] {
  const rows = sortByDateAcquired(getOwnershipRows(artwork)).filter(
    (row) => row.collectorVisible === true,
  )
  if (rows.length === 0) return []

  return rows.map((row) => {
    const name = row.displayName?.trim() || 'Private collection'
    const city = row.city?.trim()
    const acquired = formatAcquisitionDate(row.dateAcquired)
    const parts = [name, city, acquired].filter(Boolean) as string[]
    return { text: parts.join(' · ') }
  })
}

export function buildOwnershipClaimHref(artwork: Pick<Artwork, 'slug' | 'title'>): string {
  const params = new URLSearchParams()
  if (artwork.slug) params.set('claim', artwork.slug)
  if (artwork.title) params.set('title', artwork.title)
  return `/contact?${params.toString()}`
}

export function hasUnclaimedOwnershipAppeal(artwork: Artwork): boolean {
  if (isInArtistsStudio(artwork)) return false

  const rows = getOwnershipRows(artwork)
  if (rows.length === 0) return true
  return !rows.some((row) => row.claimStatus === 'claimed-confirmed')
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
