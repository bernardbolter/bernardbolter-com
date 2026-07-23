# Corpus Relation Fields & Linchpin Session Tracking — Cursor Spec
*Derived from the Venice Biennale 2007 Art/Official session, July 23, 2026.*
*Read alongside `bio-statement-capture-brief.md`, `art-official-consolidated-session-flow-spec.md`, `master-schema-spec.md`, `art-official-field-source-of-truth.md`.*

---

## Part 0 — Dependency check (do this first)

Before building anything below, confirm whether `bio-statement-capture-brief.md` has already been implemented (i.e. does the Artist singleton already have `bioTimelineEntries` and `statementThroughlines`?).

- If **not yet built**: build that brief's Part 2 schema first, then continue with this spec.
- If **already built**: skip straight to Part 1.

Do not re-spec or modify the `bioTimelineEntries`/`statementThroughlines` field shapes — they are locked as written in that brief.

---

## Part 1 — Why

The Venice Biennale 2007 session surfaced two gaps in the schema:

1. Artist-declared ties between works made in close temporal/physical proximity (a "companion painting," concurrent work in a different series made on the same trip) currently have nowhere structured to go — they were captured only as prose in a session transcript.
2. Some sessions do double duty: cataloguing one artwork while surfacing a structural pattern across the whole corpus. Nothing currently distinguishes these "linchpin" sessions from ordinary single-artwork sessions, which contributed to the agent pacing toward premature closure twice in this session.

This spec adds the minimum fields to capture both, plus a mechanism for reopening a session later when new corpus context makes an earlier one incomplete.

---

## Part 2 — Schema additions: Artworks collection

```ts
{
  name: 'relatedWorksAtMaking',
  type: 'array',
  admin: {
    description: 'Artist-declared ties to other works based on proximity at the moment of making — not visual similarity (CLIP) and not shared tags. E.g. a companion piece made the same year, or a different-series work made on the same trip.',
  },
  fields: [
    { name: 'relatedArtwork', type: 'relationship', relationTo: 'artworks', required: true },
    {
      name: 'relationType',
      type: 'select',
      options: ['paired', 'concurrent', 'predecessor', 'successor'],
      required: true,
      admin: {
        description: '"paired" = companion work, same series, similar instinct. "concurrent" = made in parallel, different series, same trip/period. "predecessor"/"successor" = direct chronological link within a body of work.',
      },
    },
    { name: 'note', type: 'text', admin: { description: 'Optional short artist note on the nature of the tie.' } },
    { name: 'sourceSessionRef', type: 'relationship', relationTo: 'sessions' },
  ],
},
{
  name: 'seriesHingeMarker',
  type: 'group',
  admin: {
    description: 'Flags a work that marks a series ending or beginning — a structural hinge point in the practice, not just a normal series member.',
  },
  fields: [
    { name: 'isHinge', type: 'checkbox', defaultValue: false },
    { name: 'hingeType', type: 'select', options: ['series-end', 'series-start', 'both'] },
    { name: 'note', type: 'textarea' },
  ],
},
```

---

## Part 3 — Schema additions: Sessions collection

```ts
// Add to existing sessionType select options
sessionType: {
  options: ['artwork-cataloguing', 'artist-statement', 'biography', 'onboarding', 'corpus-revisit'], // corpus-revisit is NEW
},

// New fields
{
  name: 'revisitOf',
  type: 'relationship',
  relationTo: 'sessions',
  admin: { description: 'Set only when sessionType is corpus-revisit. Points to the original session being reopened in light of new corpus context.' },
},
{
  name: 'linchpinFlag',
  type: 'group',
  admin: {
    description: 'Set when a session is doing double duty — cataloguing one artwork while surfacing a structural pattern across the corpus. Signals the dialogue agent to pace more slowly and not default to wrap-up once standard fields are checked off.',
  },
  fields: [
    { name: 'isLinchpin', type: 'checkbox', defaultValue: false },
    { name: 'note', type: 'textarea', admin: { description: 'What corpus-level pattern this session surfaced, briefly.' } },
  ],
},
```

---

## Part 4 — Data to seed from the Venice Biennale 2007 session

Once the schema above exists, write the following records (via the session-write envelope, format 2b in `art-official-field-source-of-truth.md`):

**Artwork: `venice-biennale-2007`**
- `relatedWorksAtMaking`: `[{ relatedArtwork: 'skulptur-projekte-m-nster-2007', relationType: 'paired', note: 'Same instinct — architecture compressing a place/viewing-experience into the painting. Immediate predecessor.' }]`
- `seriesHingeMarker`: `{ isHinge: true, hingeType: 'series-end', note: 'Last Breaking Down Art work before abandoning the series for DCS.' }`

**Artist singleton — `bioTimelineEntries`** (append):
```json
{ "eventDate": "1996", "text": "After the SFMOMA guerrilla installation, a three-part series attempting to bring photographs back into painting 'didn't all work out' — followed by writing ~30 ideas about art, which became the seed of the Breaking Down Art series.", "sourceSessionRef": "[this session id]", "linkedArtworkSlugs": ["venice-biennale-2007"] }
```
```json
{ "eventDate": "2007", "text": "On a Rietveld Akademie school trip to the Venice Biennale, photographed material for Breaking Down Art from inside the Arsenale while simultaneously shooting the Venice DCS scene from just outside the same building — unrecognized as a doubled operation until this session.", "sourceSessionRef": "[this session id]", "linkedArtworkSlugs": ["venice-biennale-2007", "skulptur-projekte-m-nster-2007"] }
```

**Artist singleton — `statementThroughlines`** (append):
```json
{ "dateRecognized": "2026-07-23", "text": "A recurring inside/outside position: in 2007–08, working from inside the art school system, half in awe of a world he wasn't sure he belonged to. Now working fully outside it, on his own path — and that outside position may be exactly what's needed to return to Breaking Down Art's unfinished questions with clear eyes.", "linkedArtworkSlugs": ["venice-biennale-2007", "skulptur-projekte-m-nster-2007"], "sourceSessionRef": "[this session id]", "reinforcingSessions": [] }
```

**This Session record:**
- `linchpinFlag`: `{ isLinchpin: true, note: 'Cataloguing Venice Biennale 2007 surfaced the Breaking Down Art → DCS transition and the 1996 SFMOMA origin of the series.' }`

---

## Part 5 — Do NOT

- Do not build `relatedWorksAtMaking` as a bidirectional auto-sync field yet — one-directional entry per artwork is sufficient for now; a sync hook can be added later if artists start noticing gaps.
- Do not infer `relationType` automatically from series/date proximity — this field is artist-declared only, entered through Art/Official dialogue.
- Do not set `linchpinFlag.isLinchpin` automatically from field count or session length — this is a judgment call the dialogue agent or artist makes, not a computed metric.
- Do not let `corpus-revisit` sessions overwrite the original session's transcript — they are new, separate Session records linked via `revisitOf`.
- Do not touch `bioTimelineEntries`/`statementThroughlines` field shapes — locked per Part 0.

---

## Part 6 — Build order

**Step 1** — Confirm bio/statement schema status (Part 0). Build if missing.
✓ Artist singleton has `bioTimelineEntries` and `statementThroughlines` arrays.

**Step 2** — Add `relatedWorksAtMaking` and `seriesHingeMarker` to Artworks collection.
✓ Both fields present in Payload admin, editable.

**Step 3** — Add `revisitOf`, `linchpinFlag`, and the `corpus-revisit` sessionType option to Sessions collection.
✓ Fields present; `sessionType` dropdown includes the new option.

**Step 4** — Seed the Part 4 data via the session-write envelope.
✓ `venice-biennale-2007` record shows the new relation and hinge marker.
✓ Both bio entries and the one throughline appear on the Bio/Statement pages in the "still being written" section.
✓ This session's record shows `linchpinFlag.isLinchpin: true`.

**Step 5** — Spot-check JSON-LD output for `venice-biennale-2007` and the Statement page to confirm the new fields surface correctly as `additionalProperty` entries.

---

## Verification checklist

- [x] `relatedWorksAtMaking` and `seriesHingeMarker` present on Artworks, not duplicating existing `movementTags`/similarity fields
- [x] `revisitOf`, `linchpinFlag`, `corpus-revisit` present on Sessions
- [ ] Venice Biennale 2007 ↔ Münster 2007 tie recorded with correct `relationType: paired` — **seed script ready; run when Postgres is up**
- [ ] Two bio entries and one throughline live and linked to correct artwork slugs — **same seed script**
- [x] Throughline's `reinforcingSessions` starts empty, ready to grow if a future session corroborates it (seed writes `[]`)
- [ ] This session flagged as linchpin with a note explaining why — **same seed script**
- [x] No changes made to locked `bioTimelineEntries`/`statementThroughlines` shapes
- [x] JSON-LD: `artism:relatedWorksAtMaking` + `artism:seriesHingeMarker` as `additionalProperty` (unit-tested); Statement page already emits throughlines

### Run locally (Postgres must be listening)

```bash
npx tsx src/scripts/push-corpus-relation-fields-schema.ts
npx tsx src/scripts/seed-venice-biennale-2007-corpus-relations.ts
```

---
*Corpus relation fields & linchpin session spec · July 23, 2026*
