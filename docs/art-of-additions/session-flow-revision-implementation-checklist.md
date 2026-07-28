# Session Flow Revision Implementation Checklist (Conversation Layer)

Derived from `docs/art-of-additions/session-flow-revision-brief.md`.

This checklist is intentionally split into:
- **A) conversation/prompt/UI sequencing work to implement now**
- **B) already-covered schema/data work (do not duplicate)**

---

## A) Conversation Logic Changes (Build / Verify)

These are the actual deltas for this brief: prompt behavior, step ordering, and close-gate behavior in admin chat.

### A1) Step-order enforcement in prompt logic

- [ ] Ensure the 11-step flow is represented in prompt guidance for `artwork-cataloguing`:
  1. pre-upload questions
  2. artist blind description
  3. image upload
  4. light acknowledgment (short)
  5. small facts
  6. deep interpretive conversation
  7. where-has-this-lived (mandatory block)
  8. formal re-ask
  9. abstract proposals
  10. session close
  11. confirmation
- [ ] Update prompt blocks in:
  - `src/lib/artOfficial/preUploadGuide.ts`
  - `src/lib/artOfficial/promptBlocks.ts`
  - `src/lib/artOfficial/buildSystemPrompt.ts`

### A2) Guard the light-acknowledgment beat (step 4)

- [x] Add explicit system instruction that post-upload acknowledgment is 2-4 sentences max and must not do full analysis/reconciliation.
- [x] Confirm this beat does not absorb the formal re-ask semantics.
- [x] Validate in prompt text:
  - `buildVisionPhaseBlock()` in `src/lib/artOfficial/promptBlocks.ts`
  - any upload-transition language in `src/lib/artOfficial/preUploadGuide.ts`

### A3) Distinct formal re-ask beat (step 8)

- [x] Ensure prompt explicitly says re-ask must reference `firstImpression` and happen as its own late beat.
- [x] Ensure session close text requires this beat before draft generation/commit.
- [x] Confirm `store_session_field(secondDescription)` remains the capture mechanism and is prompted distinctly from step 4.

### A4) Mandatory “Where has this lived” block (step 7)

- [x] Verify current block in `buildWhereHasThisLivedBlock()` covers:
  - current location
  - ownership/provenance traceability
  - sales details (private handling)
  - exhibition handling via Events tools (not free text)
  - insurance value/date
- [x] If sales/insurance prompts are currently under-specified, add explicit requirements in `buildWhereHasThisLivedBlock()` and `buildSessionCloseBlock()`.
- [x] Keep “explicit deferral allowed” language: artist can defer, but block must not be silently skipped.

### A5) “Small facts” behavior for stubbed vs unstubbed records (step 5)

- [ ] For refinement/stubbed records (`artworkRecord` exists): enforce quick confirmation only.
- [ ] For new records: gather title/year/medium/dimensions/series as ramp, not full intake dump.
- [ ] Confirm dynamic branch logic in `buildSystemPromptParts()` preserves this distinction.

### A6) Existing-field coverage mandate (no silent omissions)

- [ ] Add/strengthen prompt requirement to visit or explicitly close these fields when applicable:
  - `encounterNote`
  - `descriptionShort`, `descriptionLong`
  - `compositionalNotes`, `dominantColors`
  - `processNotes`, `sourceMaterials`
- [ ] Ensure close-gate text in `buildSessionCloseBlock()` clearly rejects silent absence.

### A7) Confirmation-panel UX alignment

- [ ] Verify confirmation UX already shows both descriptions side-by-side:
  - `src/components/admin/artOfficial/ConfirmationPanel.tsx`
- [ ] Verify proposed abstracts are visible in confirmation review.
- [ ] Optional: add explicit copy hint in panel text that re-ask should be present before commit.

### A8) Exhibition-history handling guard

- [x] Keep prompt rule: do not park exhibition history in `workContext`.
- [x] Verify Events tools path remains mandatory in `buildWhereHasThisLivedBlock()`.
- [ ] Optional hardening: add guidance in `applyAgentTool.ts` failure messages when user tries to route exhibitions into free-text fields.

---

## B) Already Covered (Do Not Rebuild)

These are NOT new tasks for this brief unless regressions are found.

- [x] `secondDescription` session field exists (`src/collections/Sessions.ts`).
- [x] `proposedAbstracts` session field exists (`src/collections/Sessions.ts`).
- [x] Session import bridge and envelope writes for `sessions` already implemented (`archiveImportSchemas.ts` + `applyEnvelopeImport.ts` + route/UI).
- [x] Incremental per-turn session persistence already exists in admin chat route (`src/app/(payload)/api/art-official/chat/route.ts`), distinct from envelope re-paste workflow.

---

## C) Tests to Add for This Brief

Important distinction from importer work: these flow constraints are behavioral and require **both** unit tests (prompt text contains constraints) and **eval-style transcript checks** (model actually behaves under live turns). "Passing unit tests" alone is not done for A2/A3/A4.

### C1) Prompt/flow unit tests

- [ ] Add tests for prompt blocks to assert:
  - light acknowledgment constraints are present
  - formal re-ask references `firstImpression`
  - where-has-this-lived mandatory language appears
  - explicit no-silent-omission language appears

### C2) Behavioral regression tests

- [ ] Add/extend tests around session close-gate text expectations in:
  - `tests/unit/buildSystemPrompt.spec.ts`
  - `tests/unit/phaseAutoAdvance.spec.ts` (if phase gating is involved)
- [ ] Add test ensuring mentioned exhibition facts route to Events guidance instead of `workContext` guidance text.

### C3) Manual transcript verification

- [ ] Run one real artwork-cataloguing session and verify transcript shows all required beats in order (or explicit deferral).
- [ ] Verify step 4 is short and step 8 is distinct and references step-2 blind description.
- [ ] Verify “where has this lived” questions happen before wrap-up.
- [ ] Verify confirmation panel displays both descriptions and proposed abstracts.

### C4) Eval-style behavior checks (required for A2/A3/A4 signoff)

- [ ] Collect at least 3 fresh admin-session transcripts (new artwork, refinement/stubbed artwork, one with exhibition mention).
- [ ] Score each transcript for:
  - acknowledgment length/compression (2-4 sentences, no deep reconciliation)
  - distinct formal re-ask tied to `firstImpression`
  - mandatory where-has-this-lived coverage or explicit deferral
- [ ] Record failures as prompt deltas (not schema tasks) and iterate prompt wording until pass.

---

## D) Plain Answer To Open Question

- [x] **Autosave path:** admin Art/Official chat already persists session state per turn into `sessions` (messages + timeline + session fields).
- [x] **Envelope path:** importer envelope is for manual/external ingest and replay; it is not the live admin-chat autosave mechanism.
