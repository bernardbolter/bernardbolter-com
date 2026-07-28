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
| Analysis (background, step 3) | `dominantColors`, `paintedFieldColors`, `compositionalNotes`, `orientation`, `movementTags`, `styleTags`, `subjectTags`, `genreTags`, `periodTags`, `visionAnalyses` | various | inferred | Normally fires silently on upload via the automated pipeline. **As of 2026-07-24, this standalone pipeline step is retired** — vision analysis now happens as part of the artwork reasoning session itself. See Part 5, R2. |
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
- **`coExhibitors` uses `person` relations, not `{ name }` inline objects.** Confirmed 2026-07-24 by Cursor while applying the Herbstsalon im Frühling merge. `events-intake-spec.md` Section 1.3 still describes the stale inline-object shape — **not yet propagated**.
- One-off fix script `src/scripts/fix-duplicate-herbstsalon-event.ts` — **committed** as a reusable reference for the Herbstsalon merge.

---

## Part 5 — Session flow process notes

**R1. The two "blind acts" are distinct, and were being conflated.** Confirmed 2026-07-24, flagged directly by the artist after recurring confusion. There are two separate blind acts: the **artist's** pre-upload blind text (`firstImpression`, artist-authored, before seeing the image) and the **agent's** blind vision analysis (spec A-1.0, agent-authored, image-only). The agent repeatedly said "your blind vision" when `firstImpression` was meant. **Not yet propagated** into `session-flow-revision-brief.md` itself — logged here as the correction to make.

**R2. Standalone blind vision-analysis pipeline step is retired**, per artist decision 2026-07-24 ("that was just an idea to populate the art but didn't work"). Vision analysis now happens inside ordinary artwork reasoning sessions instead of a separate automated blind pass. `vision-analysis-prompt-spec.md` (A-1.0) should be marked superseded in its own header — **not yet done**.

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

---
*Source of truth · unified 2026-07-24 · Part 7 addendum 2026-07-28 · update whenever the dialogue spec, schema, or session flow changes*
