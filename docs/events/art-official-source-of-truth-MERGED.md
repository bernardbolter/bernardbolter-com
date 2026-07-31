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
| Analysis (background, step 3) | `dominantColors`, `paintedFieldColors`, `compositionalNotes`, `orientation`, `movementTags`, `styleTags`, `subjectTags`, `genreTags`, `periodTags`, `visionAnalyses` | various | inferred | Normally fires silently on upload via the automated pipeline. **As of 2026-07-24, this standalone pipeline step is retired** — vision analysis now happens as part of the artwork reasoning session itself. See Part 5, R2. **See Part 8 for the unresolved integration gap this created.** |
| 6. Deep interpretive | `intent` | longText | confirmed | Never inferred from image alone |
| 6. Deep interpretive | `makingNote` | longText | confirmed | Distinct from intent — experience of making |
| 6. Deep interpretive | `directInspiration` | **textarea** | confirmed | **Corrected 2026-07-23:** was `text` — session answers run to full paragraphs, doesn't fit a single-line field |
| 6. Deep interpretive | `intentVsOutcome` | longText | confirmed | Only asked after `intent` is established |
| 6. Deep interpretive | `artHistoricalContext`, `artHistoricalReferences` | longText / array | confirmed | Completed across steps 6 and (if needed) 7. **`artHistoricalReferences` is blocked from chat-envelope writes** — see Part 6 |
| 6. Deep interpretive | `consciousRejections` | longText | confirmed | Never asked directly — synthesized from negative-space answers |
| 6. Deep interpretive | `seriesContext`, `workContext` | longText | confirmed | Where this sits in the series/practice arc. **`workContext` should never carry exhibition history** — see Part 4, events linking |
| 7. Where has this lived | `currentLocation` | **group: `{ category, locationDetail }`** | confirmed | **Corrected 2026-07-23:** written as a nested group, not two sibling top-level fields. `category` enum **confirmed 2026-07-24**: `artists-studio` \| `private-collection` \| `institution` \| `on-loan` (NOT `"studio"` — that value is rejected). Skip entirely if `isOriginalTier` edition |
| 7. Where has this lived | `provenanceConfidenceLayer[]` | array of `{claim, evidenceBasis, confidenceLevel}` | confirmed (claim) / inferred (confidenceLevel) | One array entry per discrete claim. **Blocked from chat-envelope writes beyond the default studio entry** — see Part 6 |
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

### 2c. Sessions collection — IN PROGRESS, not yet a valid `writes[]` target
As of 2026-07-24, `"collection": "sessions"` is **not** in the discriminated union (`invalid_union` error, valid options currently `artworks | bio-timeline | statement-throughlines`). Full task spec: `cursor-task-sessions-import-bridge.md`. Required shape once built:
```json
{ "collection": "sessions", "operation": "set", "sessionId": "...", "fields": { "sessionType": "...", "primaryArtwork": "...", "mentionedArtworks": [...], "status": "...", "firstImpression": "...", "secondDescription": "...", "proposedAbstracts": [...], "sessionNotes": "...", "messages": [...] } }
```
Critical requirement: an envelope containing **both** a new `sessions` write and a dependent `statement-throughlines`/`bio-timeline` write (same `sourceSessionRef`) must resolve in **one paste** — `sessions` writes process first, regardless of array order, so the dependent write's reference resolves against a record created in the same envelope, not only pre-existing ones.
**Status:** in progress with Cursor as of this writing. **Still not started as of 2026-07-31 — see Part 7.**

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
- `search_events` / `create_event_stub` / `link_artwork_to_event` tools: full spec in `events-artwork-session-linking-addendum.md`. **RESOLVED 2026-07-24, built and live (`1d7e470`)** — see below for the full confirmed detail.
  - `search_events` fuzzy matching (±1 year, partial/misspelled venue name) — unit-covered, confirmed working (test case: "herbst salon pallaseum" correctly finds "Herbstsalon im Frühling").
  - `create_event_stub` — writes Quick Event stub only (`enrichmentStatus: stub`, `hasPage: false`). Intentionally does not write co-exhibitors, `sameAs`, `descriptionLong`, or any other enrichment-stage field — stubs stay minimal by design.
  - `link_artwork_to_event` — writes `Events.artworks` correctly.
  - `workContext` avoidance is prompt-enforced, not a hard schema block. Worth revisiting as a hard `update_field` block if free-text exhibition mentions recur.
- **`coExhibitors` uses `person` relations, not `{ name }` inline objects.** Confirmed 2026-07-24 by Cursor while applying the Herbstsalon im Frühling merge. `events-intake-spec.md` Section 1.3 and the original addendum draft both describe the stale inline-object shape — the addendum has been corrected; `events-intake-spec.md` itself has not yet been touched. **This rule's scope (narrow vs. broad application) was tested and confirmed broad on 2026-07-31 — see Part 7.**
- One-off fix script `src/scripts/fix-duplicate-herbstsalon-event.ts` — **committed** as a reusable reference for the Herbstsalon merge.

---

## Part 5 — Session flow process notes

**R1. The two "blind acts" are distinct, and were being conflated.** Confirmed 2026-07-24, flagged directly by the artist after recurring confusion. There are two separate blind acts: the **artist's** pre-upload blind text (`firstImpression`, artist-authored, before seeing the image) and the **agent's** blind vision analysis (spec A-1.0, agent-authored, image-only). The agent repeatedly said "your blind vision" when `firstImpression` was meant. **Not yet propagated** into `session-flow-revision-brief.md` itself — logged here as the correction to make.

**R2. Standalone blind vision-analysis pipeline step is retired**, per artist decision 2026-07-24 ("that was just an idea to populate the art but didn't work"). Vision analysis now happens inside ordinary artwork reasoning sessions instead of a separate automated blind pass. `vision-analysis-prompt-spec.md` (A-1.0) should be marked superseded in its own header — **not yet done**. **This retirement created a real integration gap, surfaced and unresolved as of 2026-07-31 — see Part 8.**

**R3. Retroactive `firstImpression` capture** — if the artist volunteers descriptive material before the formal four-question pre-upload ritual begins, capture it as `firstImpression` retroactively rather than forcing a redundant re-ask. Confirmed as the right handling live, 2026-07-24. **Not yet propagated** into `session-flow-revision-brief.md` Part 2.

---

## Part 6 — Fields blocked from chat-envelope writes, by design

Not a bug — intentional friction for financial/relationship fields. These require the artist's own act in Payload admin, never a session-to-envelope paste:
- `salesRecord`, `askingPrice`, `listingCurrency`
- `insuranceValue`, `insuranceValueDate`
- `artHistoricalReferences`

**Policy change 2026-07-28:** `ownershipHistory`, `provenanceConfidenceLayer`, and `provenanceOriginKnown` are **allowed** for chat + Studio envelope writes (where-has-this-lived beat). Manual audit later is fine; financial fields stay locked.

**Confirmed still enforced live, 2026-07-24** — the Almadinat Alearabia export attempt failed cleanly on `provenanceConfidenceLayer` with a named "Disallowed fields" error, exactly as designed. Do not loosen `fieldAllowlist.ts` for any of these.

Separately, **career-stage gating** means some fields sit dormant/empty until `Artist.careerStage` (`studio | market | institutional`, defaults to `studio`) advances: Market tier unlocks `salesRecord` auction entries, `auctionHouse`, `auctionEstimateHistory`, `resaleDelta`, `consignmentDetails`, `galleryReference`; Institutional tier additionally unlocks `loanHistory` full context, `authenticationRecord`, `institutionalDependencyRecord`, `validationFlowRecord`. A dormant field is not a bug — but if a dormant field is showing up as an agent-asked question at Studio tier, that is a bug (tier filter not applied).

---

## Part 7 — Events cataloguing: first real test case (Mediamatic 2009 / ArtSpan 2017)

**2026-07-31.** First two Event records run through a live Q1–Q4 dialogue (per `art-official-events-dialogue-spec.md` Part 3.4), conducted in chat rather than through the not-yet-built `/api/art-official/event-chat` route. Full content in `events-mediamatic-artspan-spec.md`. This section logs what the test case surfaced.

**Discrepancy found and resolved — `coExhibitors` shape mismatch.** The two Event records were initially drafted using `coExhibitors` as plain `{ name }` inline objects, reverting to the stale shape Part 4 above already flagged as corrected to `person` relations on 2026-07-24. **Resolved same session, 2026-07-31:** Bernard confirmed the `person`-relation treatment should apply broadly — not narrowly to direct collaborators only. Both Event records now use `{ person, role }` throughout, and two new fields were added to accommodate participants who aren't co-exhibitors in the strict sense:
  - `jurors` — for named jury/selection panels (ArtSpan Selections 2017 jury: six named jurors, full list in `events-mediamatic-artspan-spec.md` Part 6.2)
  - `otherParticipants` — for other real, named people present at the event who neither showed work alongside the artist nor judged it (Mediamatic's other Pecha Kucha presenters that night)
  Thirteen `Person` records now need creating (list in `events-mediamatic-artspan-spec.md` Part 6.2) — dedup against existing Person records first per the same cross-reuse principle already governing Tags. **`Ransom & Mitchell` duo modeling — resolved 2026-07-31, see Part 10.3** (two Person records + two `coExhibitors` rows; no new schema).

**Sessions collection extended to `sessionType: 'event'`, first real content.** Two Session records drafted (Part 6 of `events-mediamatic-artspan-spec.md`), same `artistRecord` / `artism:DialogueSelfAudit` split as Artwork sessions. Both run as a single continuous chat dialogue rather than the specced two-phase Phase A (Haiku research) / Phase B (Sonnet reasoning) split — authority-URI lookups happened earlier in the same conversation via ordinary `web_search`/`web_fetch`, then were treated as already-confirmed context going into the Q1–Q4 sequence. Functionally equivalent to a completed Phase A, but not structurally separated as one. Flagged in both records' `dialogueRefinementFlag` as worth a decision once the real route is built: whether the hard phase boundary is worth the added complexity, given this simpler single-pass shape produced clean results.

**Tier 5 corpus access is artwork-only; needs extending to Events.** `sessions-tier5-machine-access-spec.md`'s endpoint (`GET /api/corpus/[slug]?tier=5`) currently resolves only against `Artworks` via `primaryArtwork`/`mentionedArtworks`. For the two new event-type sessions to be machine-fetchable the same way an artwork session is, the endpoint needs to also resolve event slugs against `Events` and query on `eventRecord` instead. Full extension spec in `events-mediamatic-artspan-spec.md` Part 7. **Superseded by the real implementation — see Part 10.2.** Same field-split rule (`artistRecord` / `artism:DialogueSelfAudit`, `completed`-only) and same cache-invalidation pattern (`corpus-caching-spec.md`) apply unchanged — just scoped to `event-${slug}` instead of `artwork-${slug}`.

**`chat-session-import-bridge-spec.md` still not started.** Both Session records above had to be hand-written into the correct shape for manual paste, same workaround as the earlier Venice Biennale 2007 session (`sessions-audit-handoff.md`). This is the second real instance of the same gap — worth treating as confirmation this bridge is a genuine recurring need, not a one-off. **As of 2026-07-31, this remains Cursor's task to complete manually — see Part 10.2 (full verbatim transcripts are now ready, not placeholders).**

**New field, confirmed this session — `Artist.legalName`.** Full name of record, `Bernard John Bolter IV`, distinct from `name` (`Bernard Bolter`), which stays the sitewide working name. Only the CV page header reads `legalName`; every other page continues reading `name`. Reason: the ArtSpan 2017 gala page itself lists the artist under the full legal name — the CV entry needs a way to acknowledge that without the whole site switching names. Full addendum in `events-mediamatic-artspan-spec.md` Part 3. **Not yet built.**

---

## Part 8 — Vision analysis: integration gap since the automated pipeline was retired

**2026-07-31, surfaced during the Mediamatic/ArtSpan events work but applies to Artwork cataloguing sessions specifically.**

**The gap:** `art-official-consolidated-session-flow-spec.md` Step 3 still instructs the agent to fire `trigger_image_analysis` "silently in the background" on image upload, to populate `dominantColors`, `paintedFieldColors`, `compositionalNotes`, `orientation`, and the tag fields (`movementTags`/`styleTags`/`subjectTags`/`genreTags`/`periodTags`). That instruction refers to the standalone automated pipeline — **already confirmed retired** by Part 5, R2 above ("vision analysis now happens inside ordinary artwork reasoning sessions instead of a separate automated blind pass"). R2's replacement was never given a mechanical instruction: nothing tells the agent *when*, within an ordinary session, to actually look at the image and generate this content itself. Result, confirmed live in the most recent chat-run cataloguing session: these fields sat unpopulated until the artist had to ask for them at the end, rather than the agent producing them proactively and early, the way the old pipeline used to guarantee.

**Proposed fix, not yet applied to `art-official-consolidated-session-flow-spec.md` itself:** Step 4 (Light acknowledgment) is the natural home for this — it already runs immediately after image upload, before the deep interpretive conversation begins. Add an explicit instruction: at Step 4, in addition to the light acknowledgment text shown to the artist, the agent generates `dominantColors`, `paintedFieldColors`, `compositionalNotes`, `orientation`, and tag-field candidates directly from the image, and writes each via `update_field` (`confidence: 'inferred'`, `source: 'image-analysis'`) — silently, same as the retired pipeline used to, without waiting to be asked. A `visionAnalyses[]` entry gets written the same way, at the same moment.

**Open decision, not resolved here — flagged for Bernard:** `vision-analysis-prompt-spec.md` (A-1.0) requires true blindness (image only, zero other context) to produce a comparable, independent reading. That's now structurally impossible if this generation happens inside the ordinary session flow, which already has Step 1's pre-upload answers loaded by the time the image arrives at Step 3. Two ways to resolve, neither decided yet:
  (a) **Blindness is retired along with the standalone pipeline** — accept that the embedded version is informed by whatever minimal context exists at Step 4, mark A-1.0 fully superseded (not just "should be," as R2 already flagged as outstanding), and write a new, non-blind prompt version for the changelog.
  (b) **Blindness is preserved structurally** — the agent makes the `trigger_image_analysis`-equivalent call in a way that genuinely isolates the image from prior turns (a fresh internal reasoning pass scoped to the image alone, if the tooling supports it), even though it's nominally "inside" the same session.
  This session is not the place to decide between (a) and (b) — it's a real fork, not a formatting detail.

**Not yet propagated:** into `art-official-consolidated-session-flow-spec.md` Step 3/4 text, or into `vision-analysis-prompt-spec.md`'s header. Both need updating once (a) or (b) above is decided.

---

## Part 9 — Standing process addition (see also "Standing process" section at end of document)

See item 6 under **Standing process**, below — the sequencing rule for keeping this document, the chat-based reasoning that drafts additions to it, and Cursor's repo copy in sync.

---

## Part 10 — Cursor implementation confirmations + artwork-linking resolution (2026-07-31)

Follows directly from Part 7/8 above. Logs what Cursor actually built, and what got resolved after Cursor's pass — per this document's own rule that confirmations are authoritative over stale specs immediately, even before every source file reflects them.

### 10.1 — Schema and code, confirmed built by Cursor

- `jurors` and `otherParticipants` added to Events (`{ person → people, role }`), matching the shape proposed in `events-mediamatic-artspan-spec.md` Part 4.1.
- `coExhibitors` admin visibility expanded to `talk-panel` / `performance` event types (previously exhibition-only).
- Migration script: `src/scripts/add-event-jurors-participants-schema.ts`. Types regenerated.
- Seed script: `src/scripts/seed-mediamatic-artspan-events.ts`. Rik seeded as a Person + `coExhibitors` entry (confirmed field name is `coExhibitors`, not `coSpeakers` — an earlier internal naming assumption corrected during implementation). Mediamatic `otherParticipants` seeded: Rory Hyde, Rogier Klomp, Bart-Jan Kazemier. ArtSpan jurors (6) and co-exhibitors seeded with a dedup search against existing Person records first, per Part 4.1's cross-reuse instruction.
- **`Ransom & Mitchell` — resolved 2026-07-31 (see Part 10.3).** Seed creates two Person records and two `coExhibitors` rows with a shared credit string in `role`.
- **Tier 5 extension, confirmed live:** route is `GET /api/corpus/[slug]/sessions`, resolving event slugs when no artwork slug matches. Slug-collision handling uses `?type=artwork|event`, returning `409` if both a matching artwork and event exist and `type` is omitted — a more precise mechanism than this document's Part 7 draft anticipated (which proposed `?type=event` only for the ambiguous case; the actual implementation applies the param check whenever both exist, not only when ambiguity is suspected). **Correction to Part 7's proposed route:** the real path is `/api/corpus/[slug]/sessions`, not `/api/corpus/[slug]?tier=5` as drafted — Part 7 should be read as superseded on this specific point.
- Cache invalidation confirmed wired via `sessionAfterChange`, using `event-${slug}` tags as specified.

### 10.2 — Artwork-linking resolution (post-Cursor, same day)

Cursor's implementation pass correctly declined to link the ArtSpan event to `lombard-street-1922` (the earlier original) rather than conflating it with the 2017 repaint — exactly per the Do NOT instruction it was given. This surfaced a real gap, resolved directly with Bernard rather than guessed at:

- **Both artworks shown at ArtSpan Selections 2017 already exist as real, live records** — no stub needed. `lombard-street-1922-v2` ("Lombard Street . 1922 v2," 2017, `BB-ACH-2017-016`) and `baker-beach-1935` ("Baker Beach . 1935," 2016, `BB-ACH-2016-019`), both confirmed live via direct fetch, both correctly marked "Record not yet fully catalogued."
- **Year correction:** the artist's own recollection in the session dialogue said "Lombard Street 1925." The live, confirmed title is **1922**. The Sessions transcript (Part 6, `messages`, in `events-mediamatic-artspan-spec.md`) is left exactly as spoken — an accurate record of the dialogue itself — while the Event record's `descriptionLong`/`artistNote`/`artworkPresentationNote` and the `artworks[]` relation use the correct 1922 title. Same principle already governing `firstImpression` elsewhere: the artist's live words aren't retroactively edited; the confirmed downstream record is what stays accurate.
- **Baker Beach's sale:** confirmed 2026-07-31 that Baker Beach did **not** sell at the ArtSpan show itself — it sold later, separately. That sale belongs in Baker Beach's own `salesRecord` (blocked from chat-envelope writes by design, per Part 6 above — a manual Payload admin entry regardless of when it's added) whenever that piece gets its own full cataloguing session. The ArtSpan Event record correctly attributes the $800 sale and commission to Lombard Street only.
- **Remaining Cursor task, not yet done as of this entry:** link both artworks' `events` relation to the ArtSpan Event record (should auto-populate bidirectionally per the relationship map in `master-schema-spec.md` once the Event's `artworks[]` array is saved — confirm this actually fires rather than assume), complete the manual Sessions transcript paste (full verbatim text now available in `events-mediamatic-artspan-spec.md` Part 6, no longer placeholders), then migrate/seed/deploy.

### 10.3 — Open items and resolutions

**Resolved 2026-07-31 — `Ransom & Mitchell` duo credit.** Confirmed via art.ransommitchell.com and independent press: San Francisco creative duo Jason Mitchell (photographer/director) and Stacey Ransom (set designer/digital artist), exhibiting jointly under that name. **Model:** two separate `People` records (`Jason Mitchell`, `Stacey Ransom` — dedup-search first), then **two** `Events.coExhibitors` rows on ArtSpan Selections 2017 — there is no joint-credit / duo object on the array (only `{ person, role }`). Shared credit context lives in each row's `role` string, e.g. `Ransom & Mitchell — photographer / director` and `Ransom & Mitchell — set designer / digital artist`. Do **not** create a single Person named "Ransom & Mitchell". Seed updated accordingly in `src/scripts/seed-mediamatic-artspan-events.ts`.

**Still open, not resolved by this entry:**
- Whether the commission that followed the Lombard Street sale deserves its own Artwork and/or Event record — untracked anywhere currently.
- The vision-analysis integration gap (Part 8) — blindness-requirement fork (a) vs. (b) still undecided.

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
*Source of truth · unified 2026-07-24 · last chat-side addenda merged 2026-07-31 (Parts 7–10) · update whenever the dialogue spec, schema, or session flow changes*
