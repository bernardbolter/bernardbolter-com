import { lexicalToPlain } from '@/lib/artOfficial/lexicalToPlain'
import type { ArtHistoricalReference, Artwork } from '@/payload-types'

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim())
}

function aboutText(artwork: Artwork): string | null {
  const short = artwork.descriptionShort?.trim()
  const long = lexicalToPlain(artwork.descriptionLong)
  if (short && long) return `${short}\n\n${long}`
  return short || long || null
}

const PROSE_INTENT_FIELDS: Array<(artwork: Artwork) => string | null | undefined> = [
  (artwork) => aboutText(artwork),
  (artwork) => artwork.intent,
  (artwork) => artwork.directInspiration,
  (artwork) => artwork.makingNote,
  (artwork) => artwork.encounterNote,
  (artwork) => artwork.intentVsOutcome,
  (artwork) => artwork.workContext,
  (artwork) => artwork.processNotes,
  (artwork) => artwork.materialAndProcessMeaning,
  (artwork) => artwork.consciousRejections,
  (artwork) => artwork.seriesContext,
  (artwork) => artwork.sourceMaterials,
  (artwork) => artwork.formalContributionAssessment,
]

/** Prose/intent fields and art-historical context — excludes tags and CLIP. */
export function artworkHasArtistAccountProse(artwork: Artwork): boolean {
  if (PROSE_INTENT_FIELDS.some((read) => hasText(read(artwork) ?? undefined))) {
    return true
  }

  if (hasText(artwork.artHistoricalContext)) return true

  const references = (artwork.artHistoricalReferences ?? []).filter(
    (ref): ref is ArtHistoricalReference => typeof ref === 'object' && ref !== null,
  )
  return references.length > 0
}

type ProseColumnOptions = {
  artwork: Artwork
  hasClipEmbedding: boolean
  similarWorksCount: number
}

/** Gates the single-column desktop fallback — CLIP/similar works count; tags alone do not. */
export function artworkShowsProseColumn({
  artwork,
  hasClipEmbedding,
  similarWorksCount,
}: ProseColumnOptions): boolean {
  if (artworkHasArtistAccountProse(artwork)) return true
  if (hasClipEmbedding) return true
  if (similarWorksCount > 0) return true
  return false
}
