# Art/Official — Source of Truth
*The one place to check when a spec doc and live behavior might disagree. Supersedes `art-official-field-source-of-truth.md` and `art-official-flow-source-of-truth.md` — both fully absorbed below; stop maintaining those two separately.*

**For Cursor:** validate against the live Payload schema and report discrepancies here. Do not silently "fix" mismatches by picking one side — flag them back for a decision.

## Purpose and governing rule

This is the bridge between three things that drift independently if nobody watches them: the **spec docs** (what's written down), the **live schema/behavior** (what Payload/Cursor actually does), and the **dialogue** (what Art/Official actually asks, in which session step).

When a session-to-Payload paste fails, or a chat session surfaces a discrepancy, check here first rather than guessing. **Bernard is the final arbiter** when a spec and live schema genuinely disagree on intent. Cursor reports discrepancies rather than resolving unilaterally. This doc is never authoritative over `art-official-dialogue-spec.md` or `artist-archive-schema-final.md` themselves — it's an index between them, not a replacement for either.

**Every entry is dated. Nothing gets deleted — resolved entries stay, marked resolved, as a permanent log.** A correction "decided" but never propagated into the actual spec file is not resolved — see the dimension-field example below, which sat "corrected" in a decision doc for a day without ever reaching the table it was correcting. Don't repeat that: when something's decided here, either fix the target spec file in the same sitting, or leave the entry clearly marked "decided, not yet propagated."

---

## Part 1 — Session step → field map (Artwork fields)

| Step | Field(s) | Type | Confirmed or Inferred | Notes |
|---|---|---|---|---|
| 2. Blind description | `firstImpression` | longText | confirmed (artist's own words) | Private session field, never public. **Not** the agent's own reading — see Part 5, R1. |
| 4. Light acknowledgment | *(no field write)* | — | — | Conversational only |
| 5. Small facts | `title`, `yearCreated`, `yearCompleted`, `medium`, `support`, `widthWhole`, `heightWhole`, `dimensionUnit`, `series` | text/number/relation | confirmed | **Corrected 2026-07-23:** was `widthMm`/`heightMm` — those stay computed/readOnly via hook, never written directly. Read-back only if already stubbed. |
| 5. (auto, on dimension entry) | `sizeTier` | select | confirmed always-asked | **Corrected 2026-07-23:** always asked directly, never silently inferred |
| Analysis (background, step 3) | `dominantColors`, `paintedFieldColors`, `compositionalNotes`, `orientation`, `movementTags`, `styleTags`, `subjectTags`, `genreTags`, `periodTags`, `visionAnalyses` | various | inferred | Normally fires silently on upload via the automated pipeline. **As of 2026-07-24, this standalone pipeline step is retired** — vision analysis now happens as part of the artwork reasoning session itself. See Part 5, R2. **See Part 9 for the unresolved integration gap this created.** |
| 6. Deep interpretive | `intent` | longText | confirmed | Never inferred from image alone |
| 6. Deep interpretive | `makingNote` | longText | confirmed | Distinct from intent — experience of making |
| 6. Deep interpretive | `directInspiration` | **textarea** | confirmed | **Corrected 2026-07-23:** was `text` — session answers run to full paragraphs, doesn't fit a single-line field |
| 6. Deep interpretive | `intentVsOutcome` | longText | confirmed | Only asked after `intent` is established |
| 6. Deep interpretive | `artHistoricalContext`, `artHistoricalReferences` | longText / array | confirmed | Completed across steps 6 and (if needed) 7. **`artHistoricalReferences` may be staged as a structured array** (RE-RESOLVED 2026-07-27) — prose still rejected; see Part 6 |
| 6. Deep interpretive | `consciousRejections` | longText | confirmed | Never asked directly — synthesized from negative-space answers |
| 6. Deep interpretive | `seriesContext`, `workContext` | longText | confirmed | Where this sits in the series/practice arc. **`workContext` should never carry exhibition history** — see Part 4, events linking |
| 7. Where has this lived | `currentLocation` | **group: `{ category, locationDetail }`** | confirmed | **Corrected 2026-07-23:** nested group. **Updated 2026-07-28:** `category` includes `unknown` for confirmed-unknown / unlocated. **Skip entirely** if `isOriginalTier` edition |
| 7. Where has this lived | `provenanceConfidenceLayer[]` | array of `{claim, evidenceBasis, confidenceLevel}` | confirmed (claim) / inferred (confidenceLevel) | One array entry per discrete claim. **ALLOWED for chat + envelope (2026-07-28)** — see Part 6 |
| 7. Where has this lived | `ownershipHistory[]` | json array | confirmed | **ALLOWED for chat + envelope (2026-07-28)** with the provenance cluster |
| 7. Where has this lived | `provenanceOriginKnown` | boolean | confirmed | **ALLOWED** (stage with provenance cluster when chain is/isn't traceable) |
| 7. Where has this lived | `salesRecord` | **json** (transaction array) | confirmed | **Corrected 2026-07-23:** type is `json`, not `longText` — doc was wrong, not schema. Always private, blocked from chat-envelope writes — see Part 6 |
| 7. Where has this lived | `insuranceValue`, `insuranceValueDate` | number/date | confirmed | Private, blocked from chat-envelope writes — see Part 6 |
| 7. Where has this lived (edition works) | `hasEditions`, plus `ownershipRegistry[]` **or** `dcs.editionTiers[]` **or** `megacities.editionTiers[]` | see Part 3 | confirmed 2026-07-24 | Which array depends on series — see Part 3, do not guess |
| 7. Where has this lived (exhibition history) | `events[]` relation | relation, hasMany | confirmed | **Never free-text `workContext`.** See Part 4 |
| 8. Formal re-ask | `secondDescription` | longText | confirmed | Distinct from step 4 — the real comparison happens here |
| 9. Abstract-proposal | `proposedAbstracts[]` → `bio-timeline` or `statement-throughlines` (plural, envelope key) | array | confirmed | Only genuine cross-work patterns, not restatements. See Part 2 for the naming fork on singular vs. plural |
| 10. Session close | `condition`, `conditionNotes`, `framing` | text | confirmed | |
| 11. Confirmation (agent-generated, reviewed not asked) | `descriptionShort`, `descriptionLong`, `conceptualKeywords`, `formalContributionAssessment` | text/longText/array | inferred, artist-reviewed | Agent drafts, shown for edit — never committed unreviewed |
| 11. Confirmation | `reasoningStatus` | select | inferred, guarded | Only set to `complete` after all other writes in the batch succeed — never as a side effect. Guard is partial by design: within one bundled write, not across separate `writes[]` entries — see Part 2 |

---

## Part 2 — Import envelope shapes

Three distinct envelopes. Do not conflate them.

### 2a. Vision analysis envelope (separate from Art/Official sessions)
```json
{
  "slug": "artwork-slug",
  "analyses": [
    { "text": "...", "model": "claude-sonnet-5", "date": "2026-07-23" }
  ]
}
```
- `slug` top-level, one artwork per upload. Array key is `analyses`, NOT `visionAnalyses` (that's the Payload field name, not the import key). Entries accept exactly three fields — no others.

### 2b. Multi-collection session envelope (Art/Official sessions)
```json
{
  "sourceSessionRef": "session-id-or-slug",
  "writes": [
    { "collection": "artworks", "slug": "the-thinker", "operation": "set", "fields": { "...": "..." } },
    { "collection": "bio-timeline", "operation": "append", "entry": { "...": "..." } },
    { "collection": "statement-throughlines", "operation": "append", "entry": { "...": "..." } }
  ]
}
```
- `operation: "set"` — idempotent, safe to re-paste. `operation: "append"` — requires idempotency guard (skip if same `sourceSessionRef` + identical `text` already exists).
- Each `writes[]` entry succeeds/fails independently — **never atomic**.
- `reasoningStatus: complete` is its own guarded final write, never bundled with fields that could fail.
- **Naming fork, resolved 2026-07-23:** envelope `collection` key is `statement-throughlines` (**plural**). The Session record's own field for a single item stays singular (`statement-throughline`). Using singular as a `collection` key silently fails.
- **Validation, resolved 2026-07-23:** `.strict()` Zod validation shipped on vision, `artwork-fields`, and envelope schemas including nested entries — unknown/misspelled keys now reject with a named error instead of silently stripping.
- **`artwork-fields` and the `{ items: [...] }` batch wrapper** — confirmed real 2026-07-23, same `.strict()` validation. Codebase's importer schema files are the authoritative shape reference for these two — not duplicated here, to avoid drift.
- **UI copy, resolved 2026-07-28:** Studio Archive multi-collection panel hint now names all four destinations including `sessions` (was a copy mismatch only — execution already accepted sessions).

### 2c. Sessions collection — RESOLVED 2026-07-24
`"collection": "sessions"` is a valid envelope discriminator. Upsert by `sessionId` with `operation: "set"`. Shape:
```json
{ "collection": "sessions", "operation": "set", "sessionId": "...", "fields": { "sessionType": "artwork", "status": "completed", "primaryArtwork": "...", "mentionedArtworks": [], "firstImpression": "...", "secondDescription": "...", "proposedAbstracts": [], "sessionNotes": "...", "messages": [{ "role": "user", "content": "…" }] } }
```
`sessionType` shorthand: `artwork` → `artwork-cataloguing`, `statement` → `artist-statement`, `event` → `event-enrichment`, `system-design` → `system-design` (live Payload values also accepted). When the same paste includes a dependent `statement-throughlines` / `bio-timeline` write with matching `sourceSessionRef`, **sessions writes run first** regardless of array order. Full task: `cursor-task-sessions-import-bridge.md` (implemented).

---

## Part 3 — Edition / print tier shape

**Confirmed 2026-07-24, corrects `print-data-architecture-reference.md`'s description of tier attachment** (that file is read-only from chat — this section is the authoritative correction until someone applies it to the source doc directly):

| Work type | Path for edition size + copies |
|---|---|
| Non-DCS / non-Megacities (e.g. ACH giclée) | `ownershipRegistry[]` — fully inline, `editionSize` field, no relation to a separate tiers record |
| Digital City Series | `dcs.editionTiers[]` |
| Megacities | `megacities.editionTiers[]` (same `copies[]` shape as DCS) |

- Always set top-level `hasEditions: 'none' | 'limited' | 'open'` alongside whichever array is used.
- DCS/Megacities tiers link to `Series.editionTiers[]` by a `seriesTierKey` string matching that record's `tierKey` — **no direct relationship field** exists between them.
- Size field on DCS/Megacities tabs is `totalEditionSize`, not `editionSize` (that name is correct only within `ownershipRegistry[]`).
- **No `printedCount` field anywhere.** Printed copies = `copies[].length`. Unprinted is implied by `totalEditionSize − copies.length`, never stored as empty rows.
- `claimStatus` enum: `unclaimed | claimed-pending | claimed-confirmed | artist-held | sold-secondary`.

---

## Part 4 — Events linking from Artwork sessions

- Exhibition history writes to the `events[]` relation on Artworks — **never** to `workContext` free text. (`workContext` free-text exhibition mentions were a known, real bug — caught twice: The Thinker session's "exhibited at Vesuvios," and would have recurred with Herbstsalon im Frühling without the manual catch.)
- `search_events` / `create_event_stub` / `link_artwork_to_event` tools: **RESOLVED 2026-07-24** — wired in Art/Official artwork sessions. Spec: `events-artwork-session-linking-addendum.md`.
- **`coExhibitors` uses `person` relations, not `{ name }` inline objects.** Confirmed 2026-07-24 by Cursor while applying the Herbstsalon im Frühling merge. `events-intake-spec.md` Section 1.3 still describes the stale inline-object shape — **not yet propagated**. **This rule's scope (narrow vs. broad application) was tested and confirmed broad on 2026-07-31 — see Parts 8 and 10.**
- One-off fix script `src/scripts/fix-duplicate-herbstsalon-event.ts` — **committed** as a reusable reference for the Herbstsalon merge.

---

## Part 5 — Session flow process notes

**R1. The two "blind acts" are distinct, and were being conflated.** Confirmed 2026-07-24, flagged directly by the artist after recurring confusion. There are two separate blind acts: the **artist's** pre-upload blind text (`firstImpression`, artist-authored, before seeing the image) and the **agent's** blind vision analysis (spec A-1.0, agent-authored, image-only). The agent repeatedly said "your blind vision" when `firstImpression` was meant. **Not yet propagated** into `session-flow-revision-brief.md` itself — logged here as the correction to make.

**R2. Standalone blind vision-analysis pipeline step is retired**, per artist decision 2026-07-24 ("that was just an idea to populate the art but didn't work"). Vision analysis now happens inside ordinary artwork reasoning sessions instead of a separate automated blind pass. `vision-analysis-prompt-spec.md` (A-1.0) should be marked superseded in its own header — **not yet done**. **This retirement created a real integration gap, surfaced and unresolved as of 2026-07-31 — see Part 9.**

**R3. Retroactive `firstImpression` capture** — if the artist volunteers descriptive material before the formal four-question pre-upload ritual begins, capture it as `firstImpression` retroactively rather than forcing a redundant re-ask. Confirmed as the right handling live, 2026-07-24. **Not yet propagated** into `session-flow-revision-brief.md` Part 2.

---

## Part 6 — Fields blocked from chat-envelope writes, by design

Not a bug — intentional friction for private financial fields. These require the artist's own act in Payload admin, never a session-to-envelope paste:
- `salesRecord`, `askingPrice`, `listingCurrency`
- `insuranceValue`, `insuranceValueDate`

**Policy change 2026-07-27:** `artHistoricalReferences` is **allowed** for chat + Studio envelope writes as a **structured array** only (`[{ name, matchStrategy, relevanceNote? }]`). Prose/string values remain structurally rejected (Brandenburger Tor bug fix). Import fuzzy-matches or creates `ArtHistoricalReferences` records. See `docs/historicalReferences/addendum-art-historical-references-staging-2026-07-27.md`.

**Policy change 2026-07-28:** `ownershipHistory`, `provenanceConfidenceLayer`, and `provenanceOriginKnown` are **allowed** for chat + Studio envelope writes (where-has-this-lived beat). Manual audit later is fine; financial fields stay locked.

Separately, **career-stage gating** means some fields sit dormant/empty until `Artist.careerStage` (`studio | market | institutional`, defaults to `studio`) advances: Market tier unlocks `salesRecord` auction entries, `auctionHouse`, `auctionEstimateHistory`, `resaleDelta`, `consignmentDetails`, `galleryReference`; Institutional tier additionally unlocks `loanHistory` full context, `authenticationRecord`, `institutionalDependencyRecord`, `validationFlowRecord`. A dormant field is not a bug — but if a dormant field is showing up as an agent-asked question at Studio tier, that is a bug (tier filter not applied).

---

## Part 7 — Addendum log, 2026-07-28

Merged from `docs/art-of-additions/art-official-source-of-truth-addendum-2026-07-28.md`. Items marked **needs decision** are left open — do not silently resolve. Same-sitting propagations noted inline.

### 7.1 New session type

- **`system-design`** added to `sessionType` enum (collection, routing, admin UI, kickoff, prompt override, envelope importer). `commitTarget('system-design') → 'no-record-write'` — never stages artwork/bio/statement fields. Used for sessions that design archive infrastructure itself rather than cataloguing a work. Confirmed low-frequency/exceptional — minimal enablement only.

### 7.2 Sessions collection — new fields (confirmed live)

| Field | Type | Notes |
|---|---|---|
| `primaryArtwork` | relation → artworks | The artwork a session is cataloguing. Empty for non-artwork sessions. |
| `mentionedArtworks` | relation → artworks, hasMany | Every other artwork referenced during a session. Deliberately kept **separate** from `primaryArtwork`, not a combined array with a role flag — enables direct queries like "every session that ever mentioned Towers." |
| `secondDescription` | textarea | The formal re-ask response (session-flow step 8), distinct from `firstImpression` (step 2). |
| `proposedAbstracts` | array `{targetCollection, text, status}` | Abstracts proposed during session close, before being written to bio-timeline/statement-throughlines. |
| `sessionNotes` | textarea | **Correct field name** — not `notes`. An earlier manual envelope paste failed on this exact confusion (2026-07-28). |

### 7.3 Multi-collection import envelope (confirmed live behavior)

- One envelope, `writes[]` array, can bundle `artworks` (`set`), `bio-timeline` (`append`), `statement-throughlines` (`append`), and `sessions` (`set`) in a single paste.
- For `sessions` writes: `sessionId` is a **top-level property of the write object**, not nested inside `fields`. (`artworks` writes use `slug` the same way.)
- Writes are independent/non-atomic — one failing write does not block others in the same batch.
- `append` operations are idempotent on `sourceSessionRef` + identical text — re-pasting after fixing one section will not duplicate already-saved appends.
- `reasoningStatus: complete` is a guarded write — confirmed via test (2026-07-28) that it does not apply when a prior field write in the same `set` operation fails.
- **Ordering is real:** `sessions` writes execute before `bio-timeline`/`statement-throughlines` (`orderEnvelopeWrites`), because those appends validate against an existing `sourceSessionRef`. If the `sessions` write fails, dependent appends correctly report "Session not found" — downstream failure, not a separate bug; does not mean sessions must be pasted separately in normal operation.
- **UI copy mismatch — resolved same sitting 2026-07-28:** Studio Archive panel hint now includes `sessions` (was naming only artworks + bio + throughlines).

### 7.4 Field allowlist for Art/Official envelope/chat writes

**As of 2026-07-28 (commit `05d90dc`):**

| Field | Status |
|---|---|
| `currentLocation` | allowed |
| `ownershipHistory` | **allowed** (changed 2026-07-28 — was forbidden) |
| `provenanceConfidenceLayer` | **allowed** (changed 2026-07-28 — was forbidden) |
| `provenanceOriginKnown` | allowed (was never on the forbidden list) |
| `askingPrice`, `listingCurrency`, `salesRecord`, `insuranceValue`, `insuranceValueDate`, `galleryReference`/`galleryText` | forbidden — financial/commerce, admin-only by deliberate policy |
| `artHistoricalReferences` | **allowed** as structured array only (RE-RESOLVED 2026-07-27) — prose/string values still rejected |
| `loanHistory`, `exhibitionHistory` | forbidden as free-text paths — exhibitions go through Events tools instead |

**Open item, needs decision:** whether `loanHistory` specifically (a work going out to an institution temporarily) should be reconsidered separately from `exhibitionHistory` — raised in passing 2026-07-28, not acted on, low priority.

**Known gap:** `reinforcingSessions` (on `statementThroughlines`: `{session, reinforcementNote}`) is **not yet recognized by the envelope importer's validator** — a paste including it fails with "Unrecognized key." Only matters once a second session corroborates an existing throughline; not yet fixed.

### 7.5 Bio & Statement capture layer

**Confirmed already implemented prior to 2026-07-28** (repo scan, not built new this session): `bioTimelineEntries`, `statementThroughlines`, `historicalBios`, `historicalStatements` on Artist singleton; display via `StillBeingWritten`; JSON-LD live (`generateBioJsonLd.ts`, `generateStatementJsonLd.ts`).

**Not yet done:** eval-style review of the "load-bearing abstract" threshold — judgment call on generated content, not unit-testable. No live review yet.

### 7.6 Corpus tier system

- Tier 1 index (`/api/corpus/index`) live with filters: `series`, `yearFrom`/`yearTo`, `status` (`reasoningStatus`), `hasVisionAnalyses`. `similarTo` not yet implemented — future work per originating brief.
- **Correction propagated 2026-07-28:** `corpus-tier-system-brief.md` Part 3 previously said "latest wins" (`visionAnalyses[last]`). Live behavior is **`preferredVisionAnalysis()`** — higher-tier models outrank Moondream regardless of recency. Brief wording corrected to match code (not the reverse).
- CLIP coverage (215/216 claimed) **not runtime-verified** — DB connection unavailable when checked 2026-07-28. Needs a live check.

### 7.6b Corpus API refresh after session-import (standing note, 2026-07-28)

**`/api/corpus` has its own regeneration trigger — it does not piggyback on individual page ISR.**

| Layer | Behavior |
|---|---|
| Corpus JSON APIs (`/api/corpus`, `/api/corpus/index`, `/api/corpus/{slug}`, sessions) | `dynamic = 'force-dynamic'` — always built from live Payload, never a multi-hour ISR snapshot |
| Dedicated trigger | `revalidateCorpusFeed()` — called from artwork afterChange, session afterChange, and Studio `revalidateArtworkPaths` |
| What the trigger does | `revalidateTag('corpus')` + path bust + Cloudflare purge of corpus feed URLs |
| HTML artwork pages (`/{slug}`, vision, record) | Separate ISR path via `revalidateArchive` / page tags — can look “live” even when an old corpus snapshot was stuck; that split was the bug |

No manual corpus rebuild after a successful artworks paste. If an external crawler still sees stale JSON, check CDN (`s-maxage=60`) first; origin should already be current.

### 7.7 Reasoning-text embedding (corpus brief Part 5.1)

- Follow-up brief: `docs/art-of-additions/reasoning-text-embedding-followup-brief.md`.
- Scaffolding landed (schema fields, generate/persist helpers, backfill script, similarity column, precedence tests) with OpenAI-compatible `text-embedding-3-small` / `vector(1536)` as the initial target.
- **Decision changed / paused 2026-07-28:** Bernard wants a self-hosted/local model path (e.g. Ollama) eventually, consistent with CLIP/DINOv2/Moondream. **Ollama swap not implemented.** Column migration (empty `vector(1536)` + metadata columns + enum value) **has been run on prod** — may need revisiting if a different local dimension is chosen later.
- **Explicitly paused:** no backfill; wait until meaningfully more of the 216 artworks have real Art/Official reasoning text.

### 7.8 Timeline multi-marker system

- First pass implemented per `timeline-multi-marker-brief.md` build order (data layer → bio markers → static two-point throughline connectors → historical markers), committed 2026-07-28 (`d5e2098`), **deployed** same day; **visual review with Bernard still pending** — further polish blocked on that review.
- Throughline connectors render **only when exactly 2 linked artworks resolve** in the current timeline (`Timeline.tsx`, strict `length !== 2`) — a 3+-artwork throughline (e.g. The Thinker candidate) renders as nothing, silently. Documented first-pass scope limit, not a bug. Extending to 3+ is a known follow-up trigger.
- Private (`visibility: 'private'`) bio/throughline entries excluded from the public timeline marker feed.

### 7.9 Session-flow revision (A2/A3/A4)

- Prompt-logic changes in `promptBlocks.ts` per `session-flow-revision-brief.md`: light-acknowledgment guard, formal re-ask → `secondDescription`, mandatory where-has-this-lived (Events tools, not `workContext`).
- Eval rubric scaffolding exists (`session-flow-transcript-eval-rubric.md`); **no live admin transcript eval has been run yet.** Biggest open item blocking full confidence in the new flow.

### 7.10 The Thinker (BB-OGP-1993-005) — first artwork under partial new-flow discipline

Session run manually in Claude chat (**not** Payload admin — so this does **not** count as a live A2/A3/A4 prompt eval). Full session shape completed: blind description, acknowledgment, small facts, deep interpretive, where-has-this-lived (including now-allowed ownership/provenance fields), formal re-ask, two abstracts accepted. All four envelope writes (`artworks`, `bio-timeline`, `statement-throughlines`, `sessions`) confirmed **saved** 2026-07-28, `reasoningStatus: complete`.

---

## Part 8 — Events cataloguing: first real test case (Mediamatic 2009 / ArtSpan 2017)

**2026-07-31.** First two Event records run through a live Q1–Q4 dialogue (per `art-official-events-dialogue-spec.md` Part 3.4), conducted in chat rather than through the not-yet-built `/api/art-official/event-chat` route. Full content in `events-mediamatic-artspan-spec.md`. This section logs what the test case surfaced.

**Numbering note (merge 2026-07-31):** Chat-side reading copy (`docs/events/art-official-source-of-truth-MERGED.md`) numbered this block as Part 7. The repo already had **Part 7 = 2026-07-28 addendum** (§7.1–7.10). Events narrative lives here as **Part 8** so that addendum is not overwritten. Cross-refs in the reading copy that said "see Part 7/8" for events/vision map to **Parts 8/9** here.

**Discrepancy found and resolved — `coExhibitors` shape mismatch.** The two Event records were initially drafted using `coExhibitors` as plain `{ name }` inline objects, reverting to the stale shape Part 4 above already flagged as corrected to `person` relations on 2026-07-24. **Resolved same session, 2026-07-31:** Bernard confirmed the `person`-relation treatment should apply broadly — not narrowly to direct collaborators only. Both Event records now use `{ person, role }` throughout, and two new fields were added to accommodate participants who aren't co-exhibitors in the strict sense:
  - `jurors` — for named jury/selection panels (ArtSpan Selections 2017 jury: six named jurors, full list in `events-mediamatic-artspan-spec.md` Part 6.2)
  - `otherParticipants` — for other real, named people present at the event who neither showed work alongside the artist nor judged it (Mediamatic's other Pecha Kucha presenters that night)
  Thirteen `Person` records needed creating (list in `events-mediamatic-artspan-spec.md` Part 6.2) — dedup against existing Person records first per the same cross-reuse principle already governing Tags. **`Ransom & Mitchell` duo modeling — resolved 2026-07-31, see Part 10.3** (two Person records + two `coExhibitors` rows; no new schema).

**Sessions collection extended for event enrichment; first real content.** Two Session records drafted (Part 6 of `events-mediamatic-artspan-spec.md`), same `artistRecord` / `artism:DialogueSelfAudit` split as Artwork sessions. Both run as a single continuous chat dialogue rather than the specced two-phase Phase A (Haiku research) / Phase B (Sonnet reasoning) split — authority-URI lookups happened earlier in the same conversation via ordinary `web_search`/`web_fetch`, then were treated as already-confirmed context going into the Q1–Q4 sequence. Functionally equivalent to a completed Phase A, but not structurally separated as one. Flagged in both records' `dialogueRefinementFlag` as worth a decision once the real route is built: whether the hard phase boundary is worth the added complexity, given this simpler single-pass shape produced clean results.

**FLAG — `sessionType` naming (do not silently resolve):** Spec/dialogue often say `sessionType: 'event'`. Live Payload enum value is **`event-enrichment`**. Envelope shorthand maps `event` → `event-enrichment` (Part 2c). Seeded sessions use `event-enrichment`. Spec files that still say bare `'event'` as the stored value are stale relative to schema.

**Tier 5 corpus access was artwork-only; extended to Events.** Draft in `events-mediamatic-artspan-spec.md` Part 7 proposed `GET /api/corpus/[slug]?tier=5`. **Superseded by the live implementation — see Part 10.1:** real path is `GET /api/corpus/[slug]/sessions`, resolving event slugs against `Events` / `eventRecord`. Same field-split rule (`artistRecord` / `artism:DialogueSelfAudit`, `completed`-only) and same cache-invalidation pattern (`corpus-caching-spec.md`) — scoped to `event-${slug}` instead of `artwork-${slug}`.

**FLAG — chat-session-import-bridge status:** Reading copy said the bridge was still not started and transcripts needed manual paste. **Corpus Part 2c already marks Sessions envelope import RESOLVED 2026-07-24.** Separately, these two event sessions were seeded via `src/scripts/seed-mediamatic-artspan-events.ts` + `src/scripts/data/mediamaticArtspanSessionTranscripts.ts` (verbatim Part 6 text), not via Studio envelope paste. Do not collapse those two facts: envelope target exists; this intake used the seed path.

**`Artist.nameLegal` (not `legalName`).** Full name of record, `Bernard John Bolter IV`, distinct from `name` (`Bernard Bolter`), which stays the sitewide working name. Only the CV page print header reads `nameLegal`; every other page continues reading `name`. Reason: the ArtSpan 2017 gala page itself lists the artist under the full legal name — the CV entry needs a way to acknowledge that without the whole site switching names (ArtSpan CV line also uses the parenthetical `(listed as Bernard John Bolter IV)`). Full addendum in `events-mediamatic-artspan-spec.md` Part 3. **FLAG:** Spec/reading copy often say `Artist.legalName` / "Not yet built." Live field is **`nameLegal`**, confirmed built and used by CV print header. Naming mismatch is flagged, not silently aliased in schema.

---

## Part 9 — Vision analysis: integration gap since the automated pipeline was retired

**2026-07-31, surfaced during the Mediamatic/ArtSpan events work but applies to Artwork cataloguing sessions specifically.**

**The gap:** `art-official-consolidated-session-flow-spec.md` Step 3 still instructs the agent to fire `trigger_image_analysis` "silently in the background" on image upload, to populate `dominantColors`, `paintedFieldColors`, `compositionalNotes`, `orientation`, and the tag fields (`movementTags`/`styleTags`/`subjectTags`/`genreTags`/`periodTags`). That instruction refers to the standalone automated pipeline — **already confirmed retired** by Part 5, R2 above ("vision analysis now happens inside ordinary artwork reasoning sessions instead of a separate automated blind pass"). R2's replacement was never given a mechanical instruction: nothing tells the agent *when*, within an ordinary session, to actually look at the image and generate this content itself. Result, confirmed live in the most recent chat-run cataloguing session: these fields sat unpopulated until the artist had to ask for them at the end, rather than the agent producing them proactively and early, the way the old pipeline used to guarantee.

**Proposed fix, not yet applied to `art-official-consolidated-session-flow-spec.md` itself:** Step 4 (Light acknowledgment) is the natural home for this — it already runs immediately after image upload, before the deep interpretive conversation begins. Add an explicit instruction: at Step 4, in addition to the light acknowledgment text shown to the artist, the agent generates `dominantColors`, `paintedFieldColors`, `compositionalNotes`, `orientation`, and tag-field candidates directly from the image, and writes each via `update_field` (`confidence: 'inferred'`, `source: 'image-analysis'`) — silently, same as the retired pipeline used to, without waiting to be asked. A `visionAnalyses[]` entry gets written the same way, at the same moment.

**Open decision, not resolved here — flagged for Bernard:** `vision-analysis-prompt-spec.md` (A-1.0) requires true blindness (image only, zero other context) to produce a comparable, independent reading. That's now structurally impossible if this generation happens inside the ordinary session flow, which already has Step 1's pre-upload answers loaded by the time the image arrives at Step 3. Two ways to resolve, neither decided yet:
  (a) **Blindness is retired along with the standalone pipeline** — accept that the embedded version is informed by whatever minimal context exists at Step 4, mark A-1.0 fully superseded (not just "should be," as R2 already flagged as outstanding), and write a new, non-blind prompt version for the changelog.
  (b) **Blindness is preserved structurally** — the agent makes the `trigger_image_analysis`-equivalent call in a way that genuinely isolates the image from prior turns (a fresh internal reasoning pass scoped to the image alone, if the tooling supports it), even though it's nominally "inside" the same session.
  This session is not the place to decide between (a) and (b) — it's a real fork, not a formatting detail.

**Not yet propagated:** into `art-official-consolidated-session-flow-spec.md` Step 3/4 text, or into `vision-analysis-prompt-spec.md`'s header. Both need updating once (a) or (b) above is decided.

---

## Part 10 — Cursor implementation confirmations + artwork-linking resolution (2026-07-31)

Follows directly from Parts 8/9 above. Logs what Cursor actually built, and what got resolved after Cursor's pass — per this document's own rule that confirmations are authoritative over stale specs immediately, even before every source file reflects them.

### 10.1 — Schema and code, confirmed built by Cursor

- `jurors` and `otherParticipants` added to Events (`{ person → people, role }`), matching the shape proposed in `events-mediamatic-artspan-spec.md` Part 4.1.
- `coExhibitors` admin visibility expanded to `talk-panel` / `performance` event types (previously exhibition-only).
- Migration script: `src/scripts/add-event-jurors-participants-schema.ts`. Types regenerated. Separate migration: `src/scripts/add-session-is-exemplar-schema.ts` for `Sessions.isExemplar`.
- Seed script: `src/scripts/seed-mediamatic-artspan-events.ts`. Rik seeded as a Person + `coExhibitors` entry (confirmed field name is `coExhibitors`, not `coSpeakers` — an earlier internal naming assumption corrected during implementation). Mediamatic `otherParticipants` seeded: Rory Hyde, Rogier Klomp, Bart-Jan Kazemier. ArtSpan jurors (6) and co-exhibitors seeded with a dedup search against existing Person records first, per Part 4's cross-reuse instruction.
- **`Ransom & Mitchell` — resolved 2026-07-31 (see Part 10.3).** Seed creates two Person records and two `coExhibitors` rows with a shared credit string in `role`.
- **Tier 5 extension, confirmed live:** route is `GET /api/corpus/[slug]/sessions`, resolving event slugs when no artwork slug matches. Slug-collision handling uses `?type=artwork|event`, returning `409` if both a matching artwork and event exist and `type` is omitted — a more precise mechanism than the Part 8 draft anticipated (which proposed `?type=event` only for the ambiguous case; the actual implementation applies the param check whenever both exist, not only when ambiguity is suspected). **Correction to draft route:** the real path is `/api/corpus/[slug]/sessions`, not `/api/corpus/[slug]?tier=5`.
- Cache invalidation confirmed wired via `sessionAfterChange`, using `event-${slug}` tags as specified.
- `Sessions.isExemplar` used for event-enrichment Phase B reference prompts (`src/lib/artOfficial/queryExemplarEventSession.ts`).

### 10.2 — Artwork-linking resolution (post-Cursor, same day)

Cursor's implementation pass correctly declined to link the ArtSpan event to `lombard-street-1922` (the earlier original) rather than conflating it with the 2017 repaint — exactly per the Do NOT instruction it was given. This surfaced a real gap, resolved directly with Bernard rather than guessed at:

- **Both artworks shown at ArtSpan Selections 2017 already exist as real, live records** — no stub needed. `lombard-street-1922-v2` ("Lombard Street . 1922 v2," 2017, `BB-ACH-2017-016`, id **241**) and `baker-beach-1935` ("Baker Beach . 1935," 2016, `BB-ACH-2016-019`, id **49**), both confirmed live, both correctly marked "Record not yet fully catalogued."
- **Year correction:** the artist's own recollection in the session dialogue said "Lombard Street 1925." The live, confirmed title is **1922**. The Sessions transcript (Part 6, `messages`, in `events-mediamatic-artspan-spec.md`) is left exactly as spoken — an accurate record of the dialogue itself — while the Event record's `descriptionLong`/`artistNote`/`artworkPresentationNote` and the `artworks[]` relation use the correct 1922 title. Same principle already governing `firstImpression` elsewhere: the artist's live words aren't retroactively edited; the confirmed downstream record is what stays accurate.
- **Baker Beach's sale:** confirmed 2026-07-31 that Baker Beach did **not** sell at the ArtSpan show itself — it sold later, separately. That sale belongs in Baker Beach's own `salesRecord` (blocked from chat-envelope writes by design, per Part 6 above — a manual Payload admin entry regardless of when it's added) whenever that piece gets its own full cataloguing session. The ArtSpan Event record correctly attributes the $800 sale and commission to Lombard Street only.

**Artwork ↔ Event link — confirmed live 2026-07-31 (do not assume silently):**
- Authority side is **`Events.artworks[]` only**. `Artworks.events` is a Payload **`join`** on `events.artworks` (`src/collections/Artworks.ts`) — reverse read, not a second writable relationship. There is no separate bidirectional write hook to "fire"; population is join semantics against `events_rels`.
- Prod SQL (`events_rels` where `path = 'artworks'`): Event `artspan-selections-2017-heron-arts` → artwork ids **241** (`lombard-street-1922-v2`) and **49** (`baker-beach-1935`).
- Payload Local API: Event `artworks[]` = `[241, 49]`; each artwork's `events.docs` length = **1** (join populated). Verify script: `src/scripts/verify-artspan-artwork-event-join.ts` (use `depth: 1` — at `depth: 0` join docs arrive without `id`/`slug`, which can look like a false negative).

**Sessions transcripts — confirmed live 2026-07-31:**
- `pecha-kucha-amsterdam-vol-9-mediamatic-2009-event-2026-07-31`: `sessionType=event-enrichment`, `status=completed`, **11** message turns, `agentModel=claude-sonnet-5`, `isExemplar=true`.
- `artspan-selections-2017-heron-arts-event-2026-07-31`: same meta, **9** message turns, `isExemplar=true`.
- Source: verbatim Part 6 of `events-mediamatic-artspan-spec.md` via seed data module — not placeholders.

### 10.3 — Open items and resolutions

**Resolved 2026-07-31 — `Ransom & Mitchell` duo credit.** Confirmed via art.ransommitchell.com and independent press: San Francisco creative duo Jason Mitchell (photographer/director) and Stacey Ransom (set designer/digital artist), exhibiting jointly under that name. **Model:** two separate `People` records (`Jason Mitchell`, `Stacey Ransom` — dedup-search first), then **two** `Events.coExhibitors` rows on ArtSpan Selections 2017 — there is no joint-credit / duo object on the array (only `{ person, role }`). Shared credit context lives in each row's `role` string, e.g. `Ransom & Mitchell — photographer / director` and `Ransom & Mitchell — set designer / digital artist`. Do **not** create a single Person named "Ransom & Mitchell". Seed: `src/scripts/seed-mediamatic-artspan-events.ts`.

**Still open, not resolved by this entry:**
- Whether the commission that followed the Lombard Street sale deserves its own Artwork and/or Event record — untracked anywhere currently.
- The vision-analysis integration gap (Part 9) — blindness-requirement fork (a) vs. (b) still undecided.

### 10.4 — Merge notes: reading copy → repo (2026-07-31) — FLAG, do not silently resolve

Merged from `docs/events/art-official-source-of-truth-MERGED.md` into this file. Conflicts where the reading copy was **stale relative to corpus** were **kept on the corpus side** and flagged rather than overwritten:

| Topic | Reading copy (MERGED) | Kept here (corpus / live) |
|---|---|---|
| Part numbering | Events = Part 7; vision = Part 8 | Events = **Part 8**; vision = **Part 9**; Part 7 remains 2026-07-28 addendum |
| `artHistoricalReferences` | Still listed as blocked | **Allowed** as structured array (RE-RESOLVED 2026-07-27); see Parts 1 and 6 |
| Sessions envelope (Part 2c) | IN PROGRESS / not started | **RESOLVED 2026-07-24** |
| Provenance cluster | Older blocked framing for `ownershipHistory` / `provenanceConfidenceLayer` | **Allowed** 2026-07-28 (Part 6 / §7.4) |
| `Artist.legalName` | Named `legalName`, "Not yet built" | Live field **`nameLegal`**, built; CV uses it |
| `sessionType: 'event'` | Spec shorthand as stored value | Live enum **`event-enrichment`** |
| Standing process item 6 | Present in MERGED | Restored below |

Reading copy may remain as a superseded chat handoff; **this file is canonical.**

---

## What Cursor should check against this file

1. **Field name/type parity** — for every field in Part 1, confirm the exact name and type match live Payload schema. Flag mismatches, don't silently rename.
2. **Import envelope validation** — confirm the live importer accepts exactly the shapes in Part 2/3/4, rejects anything else with a named error.
3. **Confidence/status guards** — confirm `reasoningStatus: complete` and the Part 6 blocklist are enforced exactly as stated.
4. **Report back, don't silently resolve** — list discrepancies here; this file updates only after Bernard decides which side is correct.

## Do NOT

- Do not add fields to any import envelope without updating this file in the same change.
- Do not rename a live schema field to match this doc without checking whether the doc is the one that's actually wrong.
- Do not treat this file as authoritative over `art-official-dialogue-spec.md` or `artist-archive-schema-final.md` — bridge/index only.
- Do not let a "decided" correction sit undecided-looking in its source spec file — propagate in the same sitting where possible, or mark clearly as "decided, not yet propagated" if not.

---

## Standing process

1. Any chat session that finds a spec/reality mismatch, or makes a flow-level decision (retiring a mechanism, resolving an edge case), logs it here **the same session** — not left in chat scrollback for someone to rediscover later.
2. Cursor's confirmations are authoritative over stale specs immediately, even before the underlying spec file is corrected — this doc can run ahead of the specs temporarily; the specs should not be trusted over this doc when they conflict.
3. Bernard is final arbiter on genuine spec-vs-schema intent disagreements.
4. Periodic audits (like 2026-07-23's) sweep this whole file — table parity, open items, and whether "not yet propagated" corrections have actually been propagated — not just schema field names.
5. When this file itself grows unwieldy, split by clear domain boundary (not by "which chat wrote it," which is what caused today's fragmentation) — and merge back here if that split turns out to just move the problem again.
6. **Chat is where reasoning and new entries originate; the file Cursor edits in the repo is canonical.** Draft dated addenda in project-knowledge chat, same format as every existing entry. Hand to Cursor, who merges the addendum into the real file *and*, in the same pass, appends anything discovered while actually touching the schema (confirmations, discrepancies, corrections) — this is already rule 2 above, just stated here as an explicit sequencing step. Cursor's merged version is the one authoritative copy. Refresh the project-knowledge mirror from that canonical version before the next chat session that reasons about this document — don't reason against a copy that's already one Cursor-pass stale.

---
*Source of truth · unified 2026-07-24 · Part 7 addendum 2026-07-28 · Parts 8–10 events + merge from MERGED reading copy + join/session confirmations 2026-07-31 · update whenever the dialogue spec, schema, or session flow changes*
