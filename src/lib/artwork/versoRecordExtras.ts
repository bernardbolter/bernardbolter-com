import { getArtworkExhibitionEvents } from '@/lib/artwork/artworkExhibitionEvents'
import {
  deriveProvenanceConfidenceSummary,
  getPublicProvenanceClaims,
  provenanceConfidenceStatement,
} from '@/lib/artwork/artworkProvenancePublic'
import type { Artwork } from '@/payload-types'

/** Slim public claim for homepage verso page 3 — never evidenceBasis. */
export type VersoProvenanceClaim = {
  claim: string
  inferred: boolean
}

export type VersoExhibitionLine = {
  year: number
  title: string
  href: string | null
  venue: string | null
}

/**
 * Public-only extras for verso page 3 (provenance + exhibitions).
 * Built server-side from overrideAccess docs; never ships private layer fields.
 */
export type VersoRecordExtras = {
  provenanceSummary: string | null
  provenanceClaims: VersoProvenanceClaim[]
  exhibitions: VersoExhibitionLine[]
}

const MAX_PROVENANCE_CLAIMS = 4
const MAX_EXHIBITIONS = 6

export function buildVersoRecordExtras(artwork: Artwork): VersoRecordExtras {
  const summary = deriveProvenanceConfidenceSummary(artwork)
  const { prominent } = getPublicProvenanceClaims(artwork)

  const provenanceClaims = prominent.slice(0, MAX_PROVENANCE_CLAIMS).map((row) => ({
    claim: row.claim,
    inferred: row.confidenceLevel === 'credible-inference',
  }))

  const exhibitions = getArtworkExhibitionEvents(artwork)
    .slice(0, MAX_EXHIBITIONS)
    .map(({ event, year }) => {
      const venue = [event.venueName?.trim(), event.venueCity?.trim()].filter(Boolean).join(', ')
      return {
        year,
        title: event.title?.trim() || 'Exhibition',
        href: event.hasPage && event.slug ? `/events/${event.slug}` : null,
        venue: venue || null,
      }
    })

  return {
    provenanceSummary: summary ? provenanceConfidenceStatement(summary) : null,
    provenanceClaims,
    exhibitions,
  }
}

export function versoRecordExtrasAreEmpty(extras: VersoRecordExtras | null | undefined): boolean {
  if (!extras) return true
  return (
    !extras.provenanceSummary &&
    extras.provenanceClaims.length === 0 &&
    extras.exhibitions.length === 0
  )
}
