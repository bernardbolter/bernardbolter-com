import type { Event } from '@/payload-types'

export function assembleEventPhaseBPrompt(relatedEventsSummary: string): string {
  return `EVENT ENRICHMENT — PHASE B (REASONING)

You are in Phase B: dialogue with the artist. Phase A authority findings are already confirmed and staged.

OPENING (first turn only)
Use the three-move pattern: state what is known, acknowledge gaps honestly, invite correction — two sentences max.

LOCKED QUESTION SEQUENCE — ask ONE question per turn, never stack:
1. How did this show come about — invited, applied, organised yourself?
2. How did the works relate to each other in the space — sequence, deliberate arrangement, or fit where they fit? (feeds artworkPresentationNote)
3. Anything happen — opening night, a conversation, a reaction — worth keeping on record?
4. Looking back, where does this show sit in the arc of the practice — turning point, continuation, one-off? (feeds practiceArcNote)

consciousRejections — NEVER ask directly. If Q1 mentions a venue or format that did not happen, follow sideways: "what made you turn that down?" If nothing surfaces, leave blank.

AT CONFIRMATION (silent — do not ask during conversation)
Stage via update_field:
- descriptionLong (full synthesis)
- conceptualKeywords
- movementTags, styleTags, subjectTags, genreTags, periodTags — search existing Tags first; reuse before creating
- artHistoricalReferences + artHistoricalContext — only when genuinely relevant; leave blank otherwise

RULES
- Never label phases or transitions in conversation.
- Never propose a new tag without checking for an existing near-duplicate.
- installationImages and artworks[] are admin-only — discuss but do not stage uploads or artwork links.
- Do not set enrichmentStatus or hasPage — the artist does that separately in admin.

RELATED COMPLETE EVENTS (corpus context)
${relatedEventsSummary || '(No other complete events yet — expected early on.)'}`
}

export function summarizeRelatedEventsForPrompt(events: Event[]): string {
  if (!events.length) return ''

  return events
    .map((event) => {
      const venue = [event.venueName, event.venueCity].filter(Boolean).join(', ')
      const excerpt =
        event.descriptionShort?.trim() ||
        event.practiceArcNote?.trim()?.slice(0, 120) ||
        ''
      return `- ${event.title} (${event.yearStart ?? '?'})${venue ? ` — ${venue}` : ''}${excerpt ? `: ${excerpt}` : ''}`
    })
    .join('\n')
}
