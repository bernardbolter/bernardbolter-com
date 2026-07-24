# Art/Official Field Source of Truth
*For Cursor: validate this against the live Payload schema and report discrepancies. Do not silently "fix" mismatches by picking one side — flag them back for a decision.*

## Changelog

**2026-07-24** — Full audit of all 20 completed sessions (see `sessions-audit-handoff.md` / `sessions-audit-cursor-spec.md`). Confirmed the Venice Biennale 2007 premature-closure pattern is one instance of a general rule: linchpin sessions need slower pacing throughout, not just as a one-off fix. Found a more common and previously undocumented failure: automatic fields (`dominantColors`, `paintedFieldColors`, `compositionalNotes`, all five tag fields) are re-derived from scratch every session with no check against already-committed values, producing silent contradictions across repeat sessions on the same artwork — confirmed on **Brandenburger Tor. 1899** (4 sessions, tags and overlay colors regenerated differently each time, concept copy rewritten twice with contradictory narratives) and, at lower severity, **BASEL switzerland** (2 sessions). Also found: repeated commit-time invalid-enum errors across unrelated fields (`availabilityStatus`, `artHistoricalReferences`, `dimensionUnit`) with no in-dialogue visibility into valid options before staging; one blind-description/upload mismatch not caught automatically (**South Elliott and Lafayette** — artist described a different painting than the one uploaded); transcript padding from unlogged tool-call turns logged as empty messages (also present in the June 24 **Venice in the Middle** session); and `artism:DialogueSelfAudit` unfilled in 19 of 20 sessions read, including several with concrete, nameable failures well-suited to `weakPhases`/`dialogueRefinementFlag`. Resulting schema and pipeline changes in `sessions-audit-cursor-spec.md`.

**2026-07-23** — First live audit against Payload (`Artworks.ts`, `Sessions.ts`) and studio importers. Corrected: dimension field names, `sizeTier` (always-asked not inferred), `currentLocation` shape (nested group), `salesRecord` type. Marked admin-only by design: `salesRecord`, `insuranceValue`/`insuranceValueDate`, `provenanceConfidenceLayer` beyond studio default, `artHistoricalReferences`. Changed schema: `directInspiration` → `textarea`. Standardized envelope `collection` key on plural `statement-throughlines`. Flagged open: third `artwork-fields` importer undocumented, `{items:[...]}` batch shape unconfirmed, Zod schemas not strict (silent key-stripping — highest priority open fix), cross-collection `reasoningStatus: complete` guard is partial only.

**2026-07-23 (cont.)** — Follow-up applied: Zod `.strict()` shipped on vision/artwork-fields/envelope schemas (8 tests passing); `directInspiration` → `textarea` in schema; allowlist confirmed unchanged for private/provenance fields; `reasoningStatus` UI copy softened to match partial guard; `artwork-fields` path and `{items:[...]}` shape confirmed and documented (see Part 2c). One flag raised and resolved: `currentLocation.category` enum mismatch between schema (`artists-studio | private-collection | institution | on-loan`) and dialogue prompt (`public-collection | ... | unknown`) — **schema wins**. Dialogue prompt in `promptBlocks.ts` corrected to the four schema values; uncertain location is not a fifth category — note for later admin `provenanceConfidenceLayer` (`confidenceLevel: speculation`). Part 2f gap candidates verified. **`mediumOther` dialogue path resolved:** cataloguing prompts teach `medium: "other"` + `mediumOther`; commit registers via `registerCustomMedium` (Quick Upload parity).

## Purpose

This document is the bridge between two things that currently drift independently:
1. **The dialogue** (what Art/Official asks, and which session step it happens in)
2. **The schema + import envelope** (what Payload actually expects, field by field)

When a session-to-Payload paste fails, the fastest diagnosis is checking it against this table rather than guessing. When the dialogue changes, this file should be updated in the same pass — not after the fact.

---

## Part 1 — Session step → field map

| Step | Field(s) | Type | Confirmed or Inferred | Notes |
|---|---|---|---|---|
| 2. Blind description | `firstImpression` | longText | confirmed (artist's own words) | Private session field, never public |
| 4. Light acknowledgment | *(no field write)* | — | — | Conversational only |
| 5. Small facts | `title`, `yearCreated`, `yearCompleted`, `medium`, `mediumOther` (conditional), `support`, `widthWhole`, `heightWhole`, `dimensionUnit`, `series` | text/number/select/relation | confirmed | Read-back only if already stubbed. `widthMm`/`heightMm` are computed/readOnly — never write directly, a hook derives mm from the whole-unit fields. When no built-in medium fits: stage `medium: "other"` + `mediumOther: "<label>"` — commit registers the custom medium (same path as Quick Upload) and replaces `medium` with the reusable slug |
| 5. `sizeTier` | `sizeTier` | select | **confirmed, always asked** | RESOLVED 2026-07-23: corrected from "inferred/auto" — dialogue always asks, server never silently fills at commit |
| Analysis (background, step 3) | `dominantColors`, `paintedFieldColors`, `compositionalNotes`, `orientation`, `movementTags`, `styleTags`, `subjectTags`, `genreTags`, `periodTags` | various | inferred | Fires silently on upload, not asked in dialogue |
| 6. Deep interpretive | `intent` | longText | confirmed | Never inferred from image alone |
| 6. Deep interpretive | `makingNote` | longText | confirmed | Distinct from intent — experience of making |
| 6. Deep interpretive | `directInspiration` | longText | confirmed | Distinct from intent — immediate seed |
| 6. Deep interpretive | `intentVsOutcome` | longText | confirmed | Only asked after `intent` is established |
| 6. Deep interpretive | `artHistoricalContext` | textarea (prose) | confirmed | Completed across steps 6 and (if needed) 7 |
| 6. Deep interpretive | `artHistoricalReferences` | relationship → ArtHistoricalReferences (hasMany) | **ADMIN-ONLY, RESOLVED 2026-07-23**: relationship field, not a prose write — forbidden for agent staging by design. Conversation surfaces the connection; the structured relationship link is entered separately in admin. Do not allow staging. |
| 6. Deep interpretive | `consciousRejections` | longText | confirmed | Never asked directly — synthesized from negative-space answers |
| 6. Deep interpretive | `seriesContext`, `workContext` | longText | confirmed | Where this sits in the series/practice arc |
| 7. Where has this lived | `currentLocation.category` (select), `currentLocation.locationDetail` (text, nested) | group | confirmed | `category` enum RESOLVED 2026-07-23: `artists-studio \| private-collection \| institution \| on-loan` — schema is authoritative. Dialogue prompt corrected to match (previously drifted to `public-collection`/`unknown`). Uncertain location is not a category value — route to `provenanceConfidenceLayer` with `confidenceLevel: speculation` instead. Write as `currentLocation: { category, locationDetail }`. **Skip entirely** if `isOriginalTier` edition |
| 7. Where has this lived | `provenanceConfidenceLayer[]` | json (array-shaped) `{claim, evidenceBasis, confidenceLevel}` | confirmed (claim) / inferred (confidenceLevel) | **ADMIN-ONLY, RESOLVED 2026-07-23**: forbidden in `fieldAllowlist.ts` for session-paste by design — session conversation can surface these claims, but they must be entered in Payload admin, not written via the envelope. Never remove from allowlist block. |
| 7. Where has this lived | `salesRecord` | json (transaction array, not longText) | confirmed | **ADMIN-ONLY, RESOLVED 2026-07-23**: same allowlist block as above — private financial data requires the deliberate admin act, not a chat-envelope write |
| 7. Where has this lived | `insuranceValue`, `insuranceValueDate` | number/date | confirmed | **ADMIN-ONLY, RESOLVED 2026-07-23**: same allowlist block |
| 7. (edition works only) | per-copy ownership walk | — | confirmed | Each numbered copy + AP walked individually |
| 8. Formal re-ask | `secondDescription` | longText | confirmed | Distinct from step 4 — the real comparison happens here |
| 9. Abstract-proposal | `proposedAbstracts[]` → `bio-timeline` or `statement-throughline` | array | confirmed | Only genuine cross-work patterns, not restatements |
| 10. Session close | `condition`, `conditionNotes`, `framing` | text | confirmed | |
| 11. Confirmation (agent-generated, reviewed not asked) | `descriptionShort`, `descriptionLong`, `conceptualKeywords`, `formalContributionAssessment` | text/longText/array | inferred, artist-reviewed | Agent drafts, shown for edit — never committed unreviewed |
| 11. Confirmation | `reasoningStatus` | select | inferred, guarded | Only set to `complete` after all other writes in the batch succeed — never as a side effect |

---

## Part 1b — Vocabulary note (resolved 2026-07-23)

This doc uses "longText" loosely to mean "long-form prose field." In live Payload this maps to `textarea` for most fields (`intent`, `makingNote`, `intentVsOutcome`, `consciousRejections`, `seriesContext`, `workContext`, `artHistoricalContext`, `compositionalNotes`, `conditionNotes`, `formalContributionAssessment`, session `firstImpression`/`secondDescription`), with two exceptions:
- `directInspiration` — **changed to `textarea`** (was `text`, single-line) per 2026-07-23 decision: session answers to this question run to full sentences/paragraphs, a single-line field was wrong for the actual content produced
- `descriptionLong` — is `richText`, not plain text/longText

`dominantColors` and `paintedFieldColors` are arrays of `{ hex }` objects, not bare strings. All `*Tags` fields (movement/style/subject/genre/period) are `relationship → tags (hasMany)`, not free arrays.

## Part 2 — Import envelope shape (confirmed working)

Two distinct envelopes exist. Do not conflate them.

### 2a. Vision analysis envelope (separate from Art/Official sessions)
```json
{
  "slug": "artwork-slug",
  "analyses": [
    { "text": "...", "model": "claude-sonnet-5", "date": "2026-07-23" }
  ]
}
```
- `slug` top-level, one artwork per upload
- Array key is `analyses`, NOT `visionAnalyses` (that's the Payload field name, not the import key)
- Entries accept exactly three fields: `text`, `model`, `date` — no others

### 2b. Multi-collection session envelope (Art/Official sessions)
```json
{
  "sourceSessionRef": "session-id-or-slug",
  "writes": [
    {
      "collection": "artworks",
      "slug": "the-thinker",
      "operation": "set",
      "fields": { "intent": "...", "makingNote": "...", "reasoningStatus": "complete" }
    },
    {
      "collection": "bio-timeline",
      "operation": "append",
      "entry": { "eventDate": "1993", "text": "...", "sourceSessionRef": "...", "linkedArtworkSlugs": ["the-thinker"] }
    }
  ]
}
```
- `operation: "set"` — idempotent, safe to re-paste
- `operation: "append"` — requires idempotency guard (skip if same `sourceSessionRef` + identical `text` already exists)
- Each `writes[]` entry succeeds/fails independently — **never atomic**
- `reasoningStatus: complete` is its own guarded final write, never bundled with fields that could fail

**Naming fork, resolved 2026-07-23:** the envelope's `collection` key is `statement-throughlines` (**plural**) — matches Payload convention. The Session record's own field referring to a single item stays singular (`statement-throughline`). Do not use the singular form as a `collection` key — this was silently failing before.

### 2c. Importer paths (RESOLVED 2026-07-23, was open in prior audit)

- **`artwork-fields`** and the **`{ items: [...] }` batch wrapper** — confirmed real by Cursor 2026-07-23, both now covered by the same `.strict()` Zod validation as the other importers. Exact shapes live in the codebase's importer schema files as the authoritative reference — this bridge doc defers to those directly rather than duplicating the shape here, to avoid the two drifting apart again.
- **Validation strictness** — RESOLVED: `.strict()` shipped on vision, `artwork-fields`, and envelope schemas including nested entries. Unknown/misspelled keys now reject with a named error instead of silently stripping. 8 unit tests passing as of 2026-07-23.
- **`reasoningStatus: complete` cross-collection guard** — still partial by design (descoped, not a bug): guards within a single bundled write, does not wait on other `writes[]` entries in the same envelope. UI copy softened 2026-07-23 to match actual behavior rather than overstating it. Revisit post-launch if cross-collection atomicity becomes worth building.

---

## Part 2e — Fields never asked in dialogue, by design (career-stage gating)

The dialogue reads `careerStage` (`studio` | `market` | `institutional`, set on the Artist singleton, defaults to `studio`) and silently skips fields outside the active tier. **This is intentional, not a gap** — but it means these fields will sit empty/`$undefined` in every JSON dump you look at until the tier changes or they're filled manually. Listed here so a stub-looking field doesn't get mistaken for a bug.

| Tier | Fields dormant until this tier is active |
|---|---|
| Market (skipped at Studio) | `salesRecord` auction entries, `auctionHouse`, `auctionEstimateHistory`, `resaleDelta`, `consignmentDetails`, `galleryReference` |
| Institutional (skipped at Studio + Market) | `loanHistory` full institutional context, `authenticationRecord`, `institutionalDependencyRecord`, `validationFlowRecord`, `provenanceConfidenceLayer` beyond the default studio entry |

**Two ways dormant fields get populated, neither through the live session:**
1. Manual entry directly in Payload admin (all fields always visible there — tiering is a dialogue-layer filter only, never a schema restriction)
2. A future, separate background enrichment agent querying public sources (Artnet, auction records, exhibition catalogues) — not yet built, not part of the session architecture

**Confirmed 2026-07-23:** `careerStage` exists on Artists (`select`, `defaultValue: 'studio'`). `buildSystemPrompt` reads it at session start (`?? 'studio'`) and feeds `buildFieldRoadmap`. If dormant fields are showing up as agent-asked questions in a live session at Tier 1, that's a real bug — the tier filter isn't being applied.

## Part 2f — Fields that exist in schema but have no session step at all (verified 2026-07-23)

Unlike Part 2e, these aren't tier-gated — they're either meant to be silent/automatic, agent-generated at confirmation, or genuinely may be falling through the cracks.

| Field | Expected handling per spec | Verified status |
|---|---|---|
| `altTitle` | Manual/admin entry only | **Intentional** — schema + public/JSON-LD display + picker search; not in `fieldCatalog` or dialogue prompts |
| `weight` | Session-close, large/exceptional only | **Intentional conditional** — in `fieldCatalog` + promptBlocks session-close line; easy to skip every session, not unwired |
| `detailImages`, `installationShots` | Session-close media prompt | **Wired** — `artworkMediaSlots` + `stagedMedia` + media prompt map kinds → those arrays; Media uploads panel, not a prose dialogue step |
| `videoFile`, `videoUrl`, `videos[]` | Outside main catalogue steps | **Intentional via media path** — slots/prompt cover file + YouTube/Vimeo URL; not a Part 1 dialogue step |
| `mediumOther` | Fallback when medium doesn't fit | **RESOLVED 2026-07-23** — dialogue teaches `medium: "other"` + `mediumOther`; commit calls `registerCustomMedium` (same as Quick Upload). In `fieldCatalog` as early companion to `medium` |
| `framing` | Middle practical + session-close if not yet covered | **OK by design** — early in cataloguing order; session-close repeats only "if not yet covered" (catch-up, not duplicate-ask) |
| `catalogueNumber` | Auto-generated | **Confirmed** — `assignArtworkCatalogueIdentity` / `buildCatalogueIdentity` on create (and preserves on update) |
| `provenanceOriginKnown` | Boolean, default `true` | **Admin-only flip** — `artworkBeforeChange` defaults null → `true`; public provenance honesty reads `false`; **no dialogue/session step sets it to `false`** — only useful if admin unchecks it |

---

## Part 3 — What Cursor should check against this file

1. **Field name parity** — for every field in Part 1's table, confirm the exact name matches the live Payload schema field name. Flag any mismatch (e.g. dialogue targets `paintedFieldColors` but schema has `paintedFieldColor`).
2. **Type parity** — confirm the type in Part 1 matches Payload's actual field type (text vs. longText vs. array vs. relation).
3. **Import envelope validation** — confirm the live importer accepts exactly the shapes in Part 2, and rejects anything outside them with a clear error naming which field/key is wrong.
4. **Confidence/status guard** — confirm `reasoningStatus: complete` cannot be set by any code path except after all other fields in the same write succeed.
5. **Report back, don't silently resolve** — if the dialogue spec and the schema disagree on a field name or type, list the discrepancy here rather than picking one side. This file gets updated only after Bernard decides which is correct.

## Do NOT

- Do not add fields to the import envelope that aren't in Part 1 or Part 2 without updating this file in the same change
- Do not rename a Payload schema field to match this doc without checking whether the dialogue spec's field name is the one that's actually wrong
- Do not treat this file as authoritative over `art-official-dialogue-spec.md` or `artist-archive-schema-final.md` — it's a bridge/index between them, not a replacement for either

---
*Source of truth · July 2026 · update whenever the dialogue spec or schema changes*
