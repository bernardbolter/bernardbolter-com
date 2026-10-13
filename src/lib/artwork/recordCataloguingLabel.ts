import { artworkHasArtistAccountProse } from '@/lib/artwork/layer3Prose'
import type { Artwork } from '@/payload-types'

/**
 * Human-facing cataloguing label on artwork pages.
 *
 * Uses derived `reasoningStatus` (session messages > 0 + why-fields) overlaid by
 * the page loader. A record with real descriptive prose is never labeled
 * "not yet fully catalogued" when status is still stub/partial for session reasons.
 */
export function resolveRecordCataloguingLabel(
  artwork: Pick<
    Artwork,
    | 'reasoningStatus'
    | 'descriptionShort'
    | 'descriptionLong'
    | 'intent'
    | 'directInspiration'
    | 'makingNote'
    | 'encounterNote'
    | 'intentVsOutcome'
    | 'workContext'
    | 'processNotes'
    | 'materialAndProcessMeaning'
    | 'consciousRejections'
    | 'seriesContext'
    | 'sourceMaterials'
    | 'formalContributionAssessment'
    | 'artHistoricalContext'
    | 'artHistoricalReferences'
  >,
): string | null {
  const hasProse = artworkHasArtistAccountProse(artwork as Artwork)

  if (!hasProse) {
    // Image + title only (or identity fields alone) — true stub for visitors.
    return 'Record not yet fully catalogued'
  }

  if (artwork.reasoningStatus === 'complete') {
    return 'Record fully catalogued via Art/Official'
  }

  if (artwork.reasoningStatus === 'partial') {
    return 'Record partially catalogued'
  }

  // Descriptive fields present, but no completed Art/Official session on record
  // (pre-session catalogue, migrated prose, etc.) — do not call it incomplete.
  return null
}
