# Bio & Statement Capture Layer Brief

*Derived from The Thinker session, July 15, 2026. Read alongside `bio-page-spec.md`, `statement-page-redesign-spec.md`, `statement-page-jsonld-and-related-works-addendum.md`.*

## Part 1 — Why

Bio and Statement currently hold only static, hand-authored singleton content (`statementFull`, `statementOpening`, bio photo grid) — edited directly in Payload admin, one clean version each. Art/Official sessions produce genuine biographical facts and cross-work pattern-discoveries as a side effect of cataloguing individual artworks (e.g. "at 19, only having lived in San Francisco, Bolter thought of it as a small town" and "a solitary figure dwarfing architecture recurs from 1993's *The Thinker* through DCS/Megacities"). None of this currently has anywhere to go except scattered into individual artwork fields, where cross-work/whole-life facts don't really belong.

This brief adds a second, accumulating layer beneath the existing curated top layer on both pages — same relationship `visionAnalyses[]` has to an artwork's description: many small sourced entries feeding a display distinct from (and beneath) the polished, hand-authored text.

Additionally: existing historical bios and statements (prior versions from earlier periods of practice) should be captured the same way, as a third entry type, since they represent the artist's own self-reading of the whole practice at a point in time — a parallel to `visionAnalyses` aimed at the self rather than at an artwork.

## Part 2 — Schema (Artist singleton)

```ts
// Add to existing Artist singleton collection

{
  name: 'bioTimelineEntries',
  type: 'array',
  fields: [
    { name: 'eventDate', type: 'text', admin: { description: 'When the life-event happened (e.g. "1993"), not when it was captured.' } },
    { name: 'text', type: 'textarea' },
    { name: 'sourceSessionRef', type: 'relationship', relationTo: 'sessions' },
    { name: 'linkedArtworkSlugs', type: 'relationship', relationTo: 'artworks', hasMany: true, admin: { description: 'Optional. The artwork(s) that prompted this fact, if any.' } },
    { name: 'visibility', type: 'select', options: ['public', 'private'], defaultValue: 'public' },
  ],
},
{
  name: 'statementThroughlines',
  type: 'array',
  fields: [
    { name: 'dateRecognized', type: 'date', admin: { description: 'When the pattern was named/recognized, not when the linked works were made.' } },
    { name: 'text', type: 'textarea' },
    { name: 'linkedArtworkSlugs', type: 'relationship', relationTo: 'artworks', hasMany: true },
    { name: 'sourceSessionRef', type: 'relationship', relationTo: 'sessions', admin: { description: 'The session where this throughline was first named.' } },
    { name: 'reinforcingSessions', type: 'relationship', relationTo: 'sessions', hasMany: true, admin: { description: 'Later sessions that independently corroborated this pattern. Grows over time; makes a throughline\'s strength as a real recurring pattern visible, distinct from a one-off observation.' } },
    { name: 'visibility', type: 'select', options: ['public', 'private'], defaultValue: 'public' },
  ],
},
{
  name: 'historicalBios',
  type: 'array',
  fields: [
    { name: 'date', type: 'date' },
    { name: 'fullText', type: 'richText' },
    { name: 'context', type: 'text', admin: { description: 'Optional note on what prompted this version — a show, a life change, a rewrite.' } },
  ],
},
{
  name: 'historicalStatements',
  type: 'array',
  fields: [
    { name: 'date', type: 'date' },
    { name: 'fullText', type: 'richText' },
    { name: 'context', type: 'text' },
  ],
},
```

**Do NOT** default `visibility` to private. Consistent with the archive's open, machine-readable premise, these entries default public; the artist can mark individual entries private later if needed.

## Part 3 — Human display

On both Bio and Statement pages: the existing curated top content (`statementFull`/`statementOpening`, bio fields) is unchanged. Below it, add a new labeled section — working title "Still being written" or "As it's discovered" (do not present it as a second, competing bio/statement) — rendering the relevant array as a slim vertical list:

- Reuse the visual treatment already built for the ownership timeline: a thin connecting rule at low series-colour opacity, threading down through dated entries.
- Per entry: date on the left (small), entry text in the same muted/italic caption style already used for photo captions elsewhere on the page (reuse that CSS class, do not invent a new one), a quiet inline link ("→ session") to the source session page rather than a button.
- Text should read as visibly small and subordinate to the curated content above — this section is provisional and accumulating by design, not a second authoritative statement.

`historicalBios`/`historicalStatements` entries render as their own distinct list or section (full documents, not excerpts) — link through to the full historical text rather than showing inline content, since these are complete archival documents, not short entries.

## Part 4 — Machine display (JSON-LD)

**Bio page (`Person` entity):** each `bioTimelineEntries` item becomes an `additionalProperty` under the `artism:` namespace:

```json
{
  "@type": "PropertyValue",
  "propertyID": "artism:biographicalNote",
  "value": "[entry.text]",
  "artism:eventDate": "[entry.eventDate]",
  "isBasedOn": "https://bernardbolter.com/sessions/[sourceSessionRef.slug]"
}
```

**Statement page (`CreativeWork` entity):** each `statementThroughlines` item becomes an `additionalProperty` the same way, AND feeds the existing `mentions` array (per `statement-page-jsonld-and-related-works-addendum.md` Section 3.4) with its `linkedArtworkSlugs`, so a throughline connecting The Thinker and a later work makes both artworks machine-discoverable directly from the Statement page's JSON-LD, not only from their own artwork pages.

## Part 5 — Timeline integration (see also `timeline-multi-marker-brief.md`)

Both entry types, plus historical bios/statements, are intended to eventually surface as markers on the existing homepage/archive timeline (drag/scroll canvas). This brief only establishes the schema and page-level display; the timeline visualization work is scoped separately.

## Part 6 — The abstract-proposal capture mechanism

Entries in `bioTimelineEntries` and `statementThroughlines` are proposed during the session-close "abstract-proposal beat" (see `session-flow-revision-brief.md` step 9), not asked for directly via a separate form. Apply a load-bearing test before proposing: an entry should only be proposed if it's a genuine cross-work pattern or a standalone life-fact — not a restatement of something already going into the artwork's own `intent`/`formalContributionAssessment` fields. This keeps the bio/statement layers distinct from artwork-level fields rather than duplicating them.

## Part 7 — Do NOT

- Do not build these as separate collections — they are arrays on the existing Artist singleton, same pattern as other array fields already in the schema.
- Do not default `visibility` to private.
- Do not let this section visually compete with or resemble the curated top-layer bio/statement content — smaller text, clearly subordinate, explicitly framed as provisional.
- Do not show historical bios/statements as inline excerpts — link through to full text.
- Do not skip `reinforcingSessions` — a throughline confirmed by only one session should look different from one confirmed by three.

## Part 8 — Verification checklist

- [ ] `bioTimelineEntries` and `statementThroughlines` render below existing curated content on their respective pages, visually subordinate
- [ ] Each entry links to its `sourceSessionRef` session page
- [ ] JSON-LD for both pages includes `additionalProperty` entries per array item
- [ ] Statement page `mentions` array includes artworks from `statementThroughlines.linkedArtworkSlugs`
- [ ] `historicalBios`/`historicalStatements` entries display as full-document links, not excerpts
- [ ] New entries default to `visibility: public`

---
*Bio & Statement capture layer brief · July 2026*
