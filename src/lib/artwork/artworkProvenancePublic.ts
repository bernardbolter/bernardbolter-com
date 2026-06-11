import type { Artwork } from '@/payload-types'

type ConfidenceRow = { confidenceLevel?: string | null }
type OwnershipRow = {
  displayName?: string | null
  city?: string | null
  dateAcquired?: string | null
  dateRelinquished?: string | null
  collectorVisible?: boolean | null
  claimStatus?: string | null
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

export type PublicOwnershipEntry = {
  displayName: string
  city?: string
  dateAcquired?: string
  dateRelinquished?: string
}

export function getPublicOwnershipTimeline(artwork: Artwork): PublicOwnershipEntry[] {
  return asArray<OwnershipRow>(artwork.ownershipHistory)
    .filter((row) => row.collectorVisible === true)
    .map((row) => ({
      displayName: row.displayName?.trim() || 'Private collection',
      city: row.city?.trim() || undefined,
      dateAcquired: row.dateAcquired?.trim() || undefined,
      dateRelinquished: row.dateRelinquished?.trim() || undefined,
    }))
}

export function hasUnclaimedOwnershipAppeal(artwork: Artwork): boolean {
  const rows = asArray<OwnershipRow>(artwork.ownershipHistory)
  if (!rows.length) return false
  const latest = rows[rows.length - 1]
  return latest?.claimStatus === 'unclaimed'
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
