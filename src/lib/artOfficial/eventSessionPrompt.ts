import type { EventDialoguePhase } from './eventDialoguePhase'
import { EVENT_PHASE_A_STAGING_FIELDS } from './eventPhaseAStaging'

export function buildEventSessionTypeOverride(phase: EventDialoguePhase): string {
  if (phase === 'phase-b-reasoning') {
    return `SESSION TYPE: Event enrichment — Phase B (dialogue).

Stage every confirmed narrative field via update_field with targetCollection "events":
- descriptionLong, descriptionShort, artistNote, practiceArcNote, pressQuote, consciousRejections, artworkPresentationNote
- conceptualKeywords (array of { keyword: string })
- movementTags, styleTags, subjectTags, genreTags, periodTags (relationship ids when known)
- artHistoricalContext, artHistoricalReferences

Examples:
update_field({ targetCollection: "events", field: "artistNote", value: "Opening night…", confidence: "confirmed", source: "conversation" })
update_field({ targetCollection: "events", field: "practiceArcNote", value: "A continuation of…", confidence: "confirmed", source: "conversation" })
update_field({ targetCollection: "events", field: "descriptionLong", value: "Full prose…", confidence: "confirmed", source: "conversation" })

Or call generate_confirmation_draft for descriptionShort / descriptionLong / conceptualKeywords — required at wrap-up per EVENT TAG & KEYWORD WRAP-UP block.

Before inviting Commit, complete the mandatory tag and keyword wrap-up (all five tag fields + conceptualKeywords).

transition_to_reasoning_phase is ONLY for entering Phase B from Phase A — never call it at the end of Phase B. Phase B ends when the artist uses Commit in the confirmation panel.

Never tell the artist to edit Payload manually — staging happens here and appears under Staged fields.`
  }

  return `SESSION TYPE: Event enrichment — Phase A (research).

Stage every confirmed factual field via update_field with targetCollection "events":
- field: one of ${EVENT_PHASE_A_STAGING_FIELDS.join(', ')}
- confidence: "confirmed"
- source: "knowledge-base" when backed by a lookup/page URL, or "conversation" when the artist confirmed in chat

Examples:
update_field({ targetCollection: "events", field: "venueAddress", value: "Schwartzkopffstraße 2, 10115 Berlin", confidence: "confirmed", source: "knowledge-base" })
update_field({ targetCollection: "events", field: "venueLatLng", value: { lat: 52.5343456, lng: 13.3795639 }, confidence: "confirmed", source: "knowledge-base" })
update_field({ targetCollection: "events", field: "sameAs", value: [{ uri: "https://example.com/exhibition" }], confidence: "confirmed", source: "knowledge-base" })

Use venueUrl (not venueWebsite). When the artist confirms several fields at once, call update_field once per field in the same turn.

Never tell the artist to enter fields in the Payload admin sidebar — staging happens here and appears under Staged fields.

Optional: propose_authority_field / confirm_authority_proposal for a lookup-first pass. When done, call transition_to_reasoning_phase.`
}

export function buildEventPhaseADialogueRules(): string {
  return `EVENT PHASE A DIALOGUE RULES

- No reflective questions — factual confirm/reject only.
- Present findings plainly; ask the artist to confirm or reject.
- Stage each confirmed fact immediately with update_field (targetCollection "events").
- Never mention internal field names unless clarifying a correction.`
}
