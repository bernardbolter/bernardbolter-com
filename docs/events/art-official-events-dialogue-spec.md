# Art/Official — Events Dialogue Spec
## Two-Phase Reasoning Session: Haiku Research → Sonnet Dialogue
*June 2026 · Addendum to art-official-dialogue-spec.md and art-official-enrichment-pipeline.md*

Read alongside: `artist-archive-schema-final.md`, `master-schema-spec.md`, `events-intake-spec.md`, `art-official-dialogue-spec.md`

---

## Overview

This spec extends Art/Official to handle Events, not just Artworks. Unlike the Artworks pipeline (three async stages: intake → automated batch pass → chat reasoning), the Events flow is a **single interactive session with an internal model switch**, since events are entered one at a time, not in bulk, and there is no image to run automated analysis on.

```
SESSION OPENS
   ↓
PHASE A — research & lookup (model: claude-haiku-4-5-20251001)
   Reads whatever Quick Event Intake already captured (title, venue, dates).
   Uses web_search / web_fetch to find candidate authority URIs.
   Presents findings for a single confirm/reject pass — not a dialogue.
   ↓ artist confirms findings
   ↓ transition_to_reasoning_phase tool call fires
   ↓ session.currentPhase → 'phase-b-reasoning'
PHASE B — dialogue & synthesis (model: claude-sonnet-4-6)
   Loads Practice Knowledge + confirmed Phase A facts + other complete Events as context.
   Runs the locked question sequence (Section 4).
   Drafts descriptionLong, tags, conceptualKeywords, etc. at confirmation.
   ↓ artist reviews diff in Art/Official admin → confirms
   ↓ enrichmentStatus may then be set to 'complete' per existing events-intake-spec.md rules
```

No stage commits to the public Events record without explicit artist confirmation — same governing rule as the Artworks pipeline.

---

## Part 1 — Schema additions

All additions are to `src/collections/Events.ts` unless noted. Read `events-intake-spec.md` Part 1 for the existing Events schema — this section specifies only the delta.

### 1.1 `fieldConfidenceMap`

Mirrors the Artworks field exactly.

```ts
{
  name: 'fieldConfidenceMap',
  type: 'json',
  admin: {
    description: 'Machine-generated confidence and source tracking per field. Never edited manually.',
    readOnly: true,
  },
}
```

Shape:

```ts
{
  [fieldName: string]: {
    source: 'phase-a-haiku' | 'phase-b-sonnet' | 'artist-confirmed' | 'intake',
    confidence: 'high' | 'medium' | 'low',
    generatedAt: string,
    modelVersion: string,
    confirmed: boolean,
    confirmationNote?: string,
  }
}
```

### 1.2 Classification fields (new — shared Tags collection)

```ts
{ name: 'movementTags', type: 'relationship', relationTo: 'tags', hasMany: true },
{ name: 'styleTags',    type: 'relationship', relationTo: 'tags', hasMany: true },
{ name: 'subjectTags',  type: 'relationship', relationTo: 'tags', hasMany: true },
{ name: 'genreTags',    type: 'relationship', relationTo: 'tags', hasMany: true },
{ name: 'periodTags',   type: 'relationship', relationTo: 'tags', hasMany: true },
```

These reuse the existing Tags collection — do not create a parallel tags collection for Events. See `tags-future-roadmap.md` for the cross-reuse rule the agent must follow when proposing a tag (Section 4.5 below implements this).

### 1.3 `conceptualKeywords`

```ts
{
  name: 'conceptualKeywords',
  type: 'array',
  fields: [{ name: 'keyword', type: 'text' }],
  admin: { description: 'Abstract conceptual terms generated from the Phase B session. Artist confirms or edits.' },
}
```

### 1.4 Art-historical fields

```ts
{ name: 'artHistoricalReferences', type: 'relationship', relationTo: 'art-historical-references', hasMany: true },
{ name: 'artHistoricalContext', type: 'textarea', admin: { description: 'Prose note on art-historical connections. Agent drafts; artist confirms or rewrites.' } },
```

### 1.5 `practiceArcNote`

```ts
{
  name: 'practiceArcNote',
  type: 'textarea',
  admin: { description: "Artist's account of where this event sits in the practice arc. Mirrors Artworks.seriesContext. Drawn out through dialogue, not generated from inference alone." },
}
```

### 1.6 `consciousRejections`

```ts
{
  name: 'consciousRejections',
  type: 'textarea',
  admin: { description: "What was deliberately pushed against or turned down — a different venue, format, or direction. Never asked directly. Drawn out sideways, same rule as Artworks.consciousRejections." },
}
```

### 1.7 `relatedEventsOverride`

```ts
{
  name: 'relatedEventsOverride',
  type: 'relationship',
  relationTo: 'events',
  hasMany: true,
  admin: { description: 'Manual, artist-curated links to other events not caught by automatic venue/year/series matching — e.g. a touring show or a thematically linked but unrelated-venue exhibition.' },
}
```

### 1.8 Per-photo artwork tagging on `installationImages`

Add to the existing `installationImages` array fields (alongside `image`, `caption`, `altText`):

```ts
{
  name: 'artworksShown',
  type: 'relationship',
  relationTo: 'artworks',
  hasMany: true,
  admin: { description: "Which specific artworks are identifiable in this photo, if any. Leave empty for wide shots, crowd photos, or details where individual works aren't distinguishable." },
}
```

### 1.9 Sessions collection additions

```ts
// Extend existing sessionType select to include 'event'
{
  name: 'sessionType',
  type: 'select',
  options: ['artwork', 'statement', 'event'], // add 'event' to existing options
}

// New relation, parallel to existing artworkRecord field
{
  name: 'eventRecord',
  type: 'relationship',
  relationTo: 'events',
  admin: { condition: (data) => data.sessionType === 'event' },
}

// Tracks which phase of the two-phase session is active
{
  name: 'currentPhase',
  type: 'select',
  defaultValue: 'phase-a-research',
  options: [
    { label: 'Phase A — Research (Haiku)', value: 'phase-a-research' },
    { label: 'Phase B — Reasoning (Sonnet)', value: 'phase-b-reasoning' },
  ],
  admin: {
    condition: (data) => data.sessionType === 'event',
    description: 'Drives which model and system prompt the API route uses for the next turn. Never edited manually except by the transition_to_reasoning_phase tool.',
  },
}
```

---

## Part 2 — Phase A: Research & Lookup

### 2.1 Model

`claude-haiku-4-5-20251001`. Never Sonnet or Opus for this phase — it's factual lookup work, not interpretive reasoning, and should stay cheap.

### 2.2 What it does

On session open, Phase A:

1. Reads the Event record's already-filled fields (`title`, `venueName`, `venueCity`, `venueCountry`, `startDate`, `coExhibitors[].name` if any)
2. Calls `web_search` / `web_fetch` to find candidate authority URIs:
   - `venueWikidataUri`, `venueTgnUri` for the venue
   - `sameAs` candidates (venue website, press coverage, institutional archive page)
   - `ulanUri` / `wikidataUri` for any named `coExhibitors`
3. Presents findings as a short, plain confirm/reject list — **not a dialogue, not a weave.** Something like: "Found a Wikidata entry for Circylar Gallery — confirm?" with each candidate shown individually.
4. Writes confirmed values directly to their target fields; writes rejected/unconfirmed candidates nowhere (discard, don't store as silent drafts the artist never saw).
5. Once the artist has been through the list, the agent calls `transition_to_reasoning_phase`.

### 2.3 Rules specific to Phase A

- ✗ Never invent a URI without an actual tool-call result backing it. No guessing from trained knowledge.
- ✗ Never write an unconfirmed candidate to the live field — store in `fieldConfidenceMap` only until confirmed.
- ✗ Never ask reflective or interpretive questions in this phase — that's Phase B's job entirely.
- ✗ Never skip the confirm step, even if confidence is high.

---

## Part 3 — Phase B: Dialogue & Synthesis

### 3.1 Model

`claude-sonnet-4-6`. Never Haiku for this phase — it's interpretive work with the artist present, same rule the Artworks pipeline already applies to its chat reasoning stage.

### 3.2 Context assembly

```
SYSTEM PROMPT FOR PHASE B
├── Identity & role (event-cataloguing variant of the existing Art/Official identity block)
├── Practice Knowledge (same sections pulled from Payload as the Artworks agent uses)
├── This event's confirmed Phase A facts (venue, dates, authority URIs)
├── Other enrichmentStatus: complete Events, prioritised:
│     1. same venue
│     2. same year
│     3. shares an artwork via the artworks[] relation (same series, by extension)
│     4. general recency fallback
│   Capped at 5 records, each summarised compactly (title, year, venue,
│   descriptionShort/practiceArcNote excerpt) to control context size.
│   Early on this list will be empty or near-empty — that's expected, not an error.
│   Do not pad with irrelevant records just to fill the cap.
├── Exemplar event session, if one exists (isExemplar: true on an event-type Session) — none
│   may exist yet; skip gracefully if the query returns nothing.
└── Dialogue rules (Section 3.4 below) + tool definitions
```

### 3.3 Opening

Same three-move pattern as the Artworks opening (`art-official-dialogue-spec.md` Section 2.1): state what's known, acknowledge gaps honestly, invite correction. Keep it to two sentences — there's less to be briefed on than a single artwork.

> I've got the basics — Circylar Gallery, Berlin, 2020, the Megacities works. I don't know yet how the show actually came together or how it felt being back in the room with all of it. Correct anything before we go.

### 3.4 Locked question sequence

Four questions, asked one at a time, never stacked:

1. **How did this show come about** — invited, applied, organised yourself?
2. **How did the works relate to each other in the space** — was there a sequence, a deliberate arrangement, or did they just go where they fit? *(feeds `artworkPresentationNote`)*
3. **Anything happen — opening night, a conversation, a reaction — worth keeping on record?** *(feeds `descriptionLong` / `artistNote` if the field exists)*
4. **Looking back, where does this show sit in the arc of the practice** — a turning point, a continuation, a one-off? *(feeds `practiceArcNote` — asked directly, unlike `consciousRejections` below)*

`consciousRejections` is never asked directly. Drawn out sideways — e.g. if Q1's answer mentions a venue or format that didn't happen, follow that thread: "what made you turn that down?" If nothing surfaces naturally, leave the field blank. Same block-handling principle as the Artworks spec: never push harder when it lands flat.

### 3.5 Generated at confirmation (silent — never asked during conversation)

- `descriptionLong` — synthesised from Phase A facts + full Phase B session
- `conceptualKeywords` — generated from full session context
- `movementTags` / `styleTags` / `subjectTags` / `genreTags` / `periodTags` — agent drafts, **must search existing Tags collection first and strongly prefer reuse over creating a near-duplicate** (cross-reuse rule from `tags-future-roadmap.md`)
- `artHistoricalReferences` + `artHistoricalContext` — only if genuinely relevant (a talk/panel about a specific movement, a show explicitly in dialogue with art history); leave blank rather than force a connection for events where it doesn't apply

### 3.6 Rules specific to Phase B

- ✗ Never ask `practiceArcNote`'s underlying content as two separate questions — it's one question (Q4).
- ✗ Never ask `consciousRejections` directly, ever.
- ✗ Never stack two questions in one turn.
- ✗ Never label phases or transitions in the conversation.
- ✗ Never propose a new tag without first checking whether an existing one already covers the concept.
- ✗ Never generate `artHistoricalReferences` speculatively just to fill the field — only when there's real basis in the session.

---

## Part 4 — Tool Definitions

### 4.1 Phase A tools

`web_search`, `web_fetch` — standard.

```ts
{
  name: 'propose_authority_field',
  description: 'Propose a candidate authority URI or field value found via search, pending artist confirmation.',
  input_schema: {
    type: 'object',
    properties: {
      fieldName: { type: 'string' },
      value: { type: 'string' },
      sourceUrl: { type: 'string' },
      confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    },
    required: ['fieldName', 'value', 'sourceUrl', 'confidence'],
  },
}
```

```ts
{
  name: 'transition_to_reasoning_phase',
  description: 'Called once all Phase A findings have been presented and the artist has confirmed or rejected each one. Switches the session to Phase B.',
  input_schema: { type: 'object', properties: {} },
}
```

### 4.2 Phase B tools

Reuse `update_field` and `store_session_field` exactly as defined in `art-official-dialogue-spec.md` Section 4 — no new shape needed, just pointed at Events fields instead of Artworks fields.

---

## Part 5 — API Route

**Endpoint:** `POST /api/art-official/event-chat`

**Request body:**
```ts
{
  messages: AnthropicMessage[],
  sessionId: string,
  artistId: string,
}
```

**Server-side flow:**
1. Authenticate against Payload session
2. Load the Session record; read `currentPhase`
3. If `phase-a-research`: assemble Phase A system prompt, set `model: 'claude-haiku-4-5-20251001'`, pass `web_search`/`web_fetch`/`propose_authority_field`/`transition_to_reasoning_phase` tools
4. If `phase-b-reasoning`: assemble Phase B system prompt (Practice Knowledge + confirmed facts + corpus context per Section 3.2), set `model: 'claude-sonnet-4-6'`, pass `update_field`/`store_session_field` tools
5. Call Anthropic API
6. Parse response, apply any field updates to the Session record
7. If `transition_to_reasoning_phase` was called, update `currentPhase` to `phase-b-reasoning` before returning
8. Return message + field updates to client

**Max tokens:** 1024 per turn in both phases — conversational responses stay short in both.

---

## Part 6 — What NOT to do

- ✗ Do not use Gemini Flash-Lite for Phase A. This is a Haiku-on-Anthropic-API session, not the Artworks batch pipeline — keep it inside one continuous conversation, not a separate async job.
- ✗ Do not run Phase A as a Payload Job / background worker. It runs inline, interactively, at session start.
- ✗ Do not let Phase B begin before the artist has explicitly confirmed Phase A's findings.
- ✗ Do not write any agent-suggested value (Phase A or B) directly to the public Events record without artist confirmation in the Art/Official admin.
- ✗ Do not advance `enrichmentStatus` to `complete` from within the session — that remains a separate, deliberate step in the admin per `events-intake-spec.md`.
- ✗ Do not create a new Tags record without first searching existing tags for a near-duplicate.
- ✗ Do not pad the corpus-context block with irrelevant events just to reach the cap of 5 — fewer, more relevant records beats a full but noisy context.
- ✗ Do not generate `artHistoricalReferences`/`artHistoricalContext` for events where there's no genuine basis in the session.
- ✗ Do not ask `consciousRejections` as a direct question under any framing.

---

## Part 7 — Files to create or modify

| File | Action | Notes |
|---|---|---|
| `src/collections/Events.ts` | Modify | Add all fields from Part 1.1–1.8 |
| `src/collections/Sessions.ts` | Modify | Add `sessionType: 'event'` option, `eventRecord`, `currentPhase` (Part 1.9) |
| `src/app/api/art-official/event-chat/route.ts` | Create | Two-phase route per Part 5 |
| `src/utilities/assembleEventPhaseAPrompt.ts` | Create | Phase A system prompt assembly |
| `src/utilities/assembleEventPhaseBPrompt.ts` | Create | Phase B system prompt assembly, including corpus-context query (Part 3.2) |
| `src/utilities/queryRelatedCompleteEvents.ts` | Create | Implements the venue → year → series → recency priority query, capped at 5 |

---

## Part 8 — Verification checklist

- [ ] All Part 1 schema fields exist on Events and Sessions
- [ ] `fieldConfidenceMap` is read-only in admin UI
- [ ] Phase A runs on `claude-haiku-4-5-20251001`; Phase B runs on `claude-sonnet-4-6`
- [ ] Phase A never writes unconfirmed candidates to live fields
- [ ] `transition_to_reasoning_phase` correctly flips `currentPhase` and is only callable from Phase A
- [ ] Phase B context assembly correctly prioritises venue → year → series → recency, capped at 5, gracefully empty when no complete events exist yet
- [ ] Locked question sequence (Section 3.4) is followed in order, one question per turn
- [ ] `consciousRejections` is never asked directly in any test session
- [ ] Tag proposal step searches existing Tags collection before creating a new one
- [ ] No field is written to the public Events record without explicit artist confirmation
- [ ] `enrichmentStatus` is never advanced to `complete` by the session itself

---

*June 2026 · Addendum to art-official-dialogue-spec.md and art-official-enrichment-pipeline.md*
*Read alongside: events-intake-spec.md, master-schema-spec.md, tags-future-roadmap.md*
