# Bio & Statement Capture Implementation Checklist (Repo-Mapped)

Derived from `docs/art-of-additions/bio-statement-capture-brief.md`.

This checklist separates:
- **A) schema/data plumbing**
- **B) page display + JSON-LD**
- **C) behavioral quality checks (eval-style)**

---

## A) Schema & Data Layer

### A1) Artist singleton arrays

- [x] `bioTimelineEntries` exists on Artist singleton (`src/collections/Artists.ts`).
- [x] `statementThroughlines` exists on Artist singleton (`src/collections/Artists.ts`).
- [x] `historicalBios` exists on Artist singleton (`src/collections/Artists.ts`).
- [x] `historicalStatements` exists on Artist singleton (`src/collections/Artists.ts`).

### A2) Required field details from brief

- [x] `statementThroughlines` includes `reinforcingSessions` so later sessions can corroborate existing patterns over time.
  - Current implementation is richer than the brief: structured rows with `{ session, reinforcementNote }`, not just a plain relationship list.
- [x] `bioTimelineEntries` includes optional `linkedArtworkSlugs` (relationship hasMany) so life-facts can link back to prompting works when relevant.
- [x] `statementThroughlines` includes `linkedArtworkSlugs` (relationship hasMany).
- [x] Both arrays include `sourceSessionRef`.
- [x] `visibility` defaults to `public` on both arrays.

### A3) Import/append path

- [x] Envelope importer supports appending both destinations:
  - `bio-timeline` -> `artists.bioTimelineEntries`
  - `statement-throughlines` -> `artists.statementThroughlines`
  (`src/lib/studio/applyEnvelopeImport.ts`)
- [x] Idempotency guard exists for append writes (`sourceSessionRef + text` duplicate skip).

---

## B) Human Display + JSON-LD

### B1) Bio page display

- [x] Bio page renders accumulating entries beneath curated content:
  - page: `src/app/(frontend)/bio/page.tsx`
  - component: `src/components/bio/Bio.tsx`
  - renderer: `src/components/shared/StillBeingWritten`
- [x] Historical bios render as document links (not inline excerpts).

### B2) Statement page display

- [x] Statement page renders throughlines beneath curated statement content:
  - page: `src/app/(frontend)/statement/page.tsx`
  - component: `src/components/statement/Statement.tsx`
  - renderer: `src/components/shared/StillBeingWritten`
- [x] Historical statements render as document links (not inline excerpts).
- [x] Throughlines expose reinforcement strength via `reinforcingCount` in entry mapping (`src/lib/artist/accumulatingEntries.ts`).

### B3) Session links

- [x] Entries resolve quiet source-session links where source session is completed/public:
  - mapping: `src/lib/artist/accumulatingEntries.ts`
  - session ref hydration: `src/lib/artist/attachPublicSessionRefs.ts`

### B4) JSON-LD

- [x] Bio JSON-LD emits `additionalProperty` from `bioTimelineEntries` as `artism:biographicalNote`:
  - `src/utilities/generateBioJsonLd.ts`
- [x] Statement JSON-LD emits `additionalProperty` from `statementThroughlines` as `artism:statementThroughline`:
  - `src/utilities/generateStatementJsonLd.ts`
- [x] Statement `mentions` includes artworks from throughline-linked works (plus curated related works), deduplicated:
  - `src/utilities/generateStatementJsonLd.ts`
  - `src/lib/artist/accumulatingEntries.ts` (`throughlineMentionArtworks`)

---

## C) Remaining Gaps / Decisions

### C1) Reinforcement metadata in machine layer

- [ ] Decide whether JSON-LD should expose reinforcement strength directly (e.g. `artism:reinforcingSessionCount`) for throughlines.
  - Human layer already shows reinforcement count; machine layer currently does not.

### C2) Bio linked-artwork visibility in UI

- [ ] Optional enhancement: expose linked artwork context for bio entries in human display (currently stored but not visibly surfaced in the list component).

### C3) Styling verification against brief phrasing

- [ ] Verify final visual treatment is explicitly subordinate and aligned with existing ownership-timeline/caption styles (thin rule + muted caption voice), not just functionally present.

---

## D) Behavioral Rule (Load-Bearing Threshold) — Eval Required

Important: this is **not** a schema/unit-test-only item.

The rule "only propose an abstract when it is a real cross-work pattern or standalone life-fact (not a restatement of artwork-level fields)" is a model judgment behavior. Unit tests can verify shapes, not quality of proposal substance.

### D1) Prompt rule presence

- [x] Prompt guidance references this distinction in session behavior (artwork vs cross-work abstraction context is present in prompt blocks).
- [ ] Confirm dedicated wording explicitly enforces the load-bearing threshold at the abstract-proposal beat.

### D2) Eval-style transcript checks (required for signoff)

- [ ] Collect at least 3 completed cataloguing transcripts with proposed abstracts.
- [ ] Score each proposed abstract:
  - `pass`: independent life-fact or cross-work pattern
  - `fail`: merely rephrased artwork-local `intent` / `formalContributionAssessment`
- [ ] Record false positives/false negatives and tighten prompt wording accordingly.
- [ ] Do not mark this brief "done" on schema/tests alone.

---

## E) Quick Verification Set

- [ ] Add/confirm unit tests for JSON-LD presence of `additionalProperty` entries on both pages.
- [ ] Add/confirm test that statement `mentions` includes throughline-linked artworks.
- [ ] Add/confirm test that `visibility` default for new entries is `public`.
- [ ] Run manual page check: curated top content remains primary; accumulating list is visibly subordinate.
