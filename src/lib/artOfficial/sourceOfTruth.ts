import { readFileSync } from 'fs'
import path from 'path'

/**
 * Canonical Art/Official source-of-truth doc path (repo-relative).
 * Operator UI and agent prompt both derive from this file.
 */
export const ART_OFFICIAL_SOURCE_OF_TRUTH_PATH =
  'docs/corpus/art-official-source-of-truth.md'

export function loadArtOfficialSourceOfTruthMarkdown(): string {
  const absolute = path.join(process.cwd(), ART_OFFICIAL_SOURCE_OF_TRUTH_PATH)
  return readFileSync(absolute, 'utf8')
}

/**
 * Condensed operational rules from the source-of-truth doc for the agent system prompt.
 * Keep in sync when Part 3–6 of art-official-source-of-truth.md change.
 */
export function buildSourceOfTruthPromptBlock(): string {
  return `ART/OFFICIAL SOURCE OF TRUTH — OPERATIONAL RULES (authoritative when specs disagree)

BLIND ACTS (do not conflate)
- firstImpression = the artist's pre-upload blind text (artist-authored, before the image). Never call this "your blind vision."
- Agent vision analysis = separate, image-based, runs inside the artwork reasoning session (not a standalone pipeline step).
- If the artist volunteers descriptive material before the formal four-question pre-upload ritual, capture it as firstImpression via store_session_field — do not force a redundant re-ask.

EXHIBITION HISTORY
- Never write exhibition/show history into workContext or provenanceNotes.
- Use search_events → artist confirm → link_artwork_to_event; or create_event_stub only after search finds nothing and the artist says yes.

EDITION / PRINT STATUS (step 7, when prints exist)
- Set hasEditions: none | limited | open.
- Non-DCS / non-Megacities → ownershipRegistry[] with editionSize + copies[].
- Digital City Series → dcs.editionTiers[] (size field: totalEditionSize).
- Megacities → megacities.editionTiers[] (same copies[] shape).
- No printedCount field — printed = copies rows; unprinted is implied by size − copies.length.
- claimStatus: unclaimed | claimed-pending | claimed-confirmed | artist-held | sold-secondary.
- Studio-held copy → claimStatus artist-held (optional private notes for location detail).

BLOCKED FROM CHAT / ENVELOPE (admin-only — never stage or invent envelope writes for these)
- salesRecord, insuranceValue, insuranceValueDate, askingPrice (and other financial/commerce fields)

ALLOWED — artHistoricalReferences as structured array only (RE-RESOLVED 2026-07-27)
- Stage [{ name, matchStrategy: "fuzzy-match-or-create", relevanceNote? }] — never a prose string
- Put extended art-historical prose in artHistoricalContext

ALLOWED FOR CHAT / ENVELOPE (where-has-this-lived provenance cluster — stage from conversation; manual audit later is fine)
- ownershipHistory, provenanceOriginKnown, provenanceConfidenceLayer

IMPORT ENVELOPE (Studio Archive paste)
- Valid collections: artworks | bio-timeline | statement-throughlines | sessions
- statement-throughlines is plural as the collection key; Session proposedAbstracts use singular statement-throughline
- sessions set upserts by sessionId; sessions writes in a paste run before dependent bio/throughline sourceSessionRef lookups`
}
