# Sessions + Importer Implementation Checklist (Repo-Mapped)

Derived from `docs/art-of-additions/sessions-collection-and-importer-brief.md`, mapped to current implementation points.

## 0) Current State Snapshot

- [x] `sessions` schema already includes required fields (`primaryArtwork`, `mentionedArtworks`, `secondDescription`, `proposedAbstracts`) in `src/collections/Sessions.ts`.
- [x] `sessionType` already includes `connected-reading`, `artist-statement`, `annual-snapshot` in `src/collections/Sessions.ts`.
- [x] Multi-collection envelope importer already exists:
  - schema: `src/lib/studio/archiveImportSchemas.ts`
  - executor: `src/lib/studio/applyEnvelopeImport.ts`
  - API route: `src/app/(payload)/api/studio/archive/envelope/route.ts`
  - UI panel: `src/components/studio/ArchiveImportPanel.tsx`
- [x] Independent per-write results already implemented in `applyEnvelopeImport`.
- [x] Non-atomic behavior already implemented (`for` loop with per-write `try/catch`) in `applyEnvelopeImport`.
- [x] Append idempotency guard already implemented for bio/throughline (`sourceSessionRef + text`) in `applyEnvelopeImport`.
- [x] Guarded `reasoningStatus` artwork write already implemented in `applyEnvelopeImport` (`applyArtworkSet`).

## 1) Incremental Save Audit + Hardening

### 1.1 Verify turn-level persistence boundaries

- [x] Confirm all agent-side tool writes update `sessions` incrementally in `src/lib/artOfficial/applyAgentTool.ts`.
  - Coverage check:
    - `update_field` -> `fieldUpdateTimeline`
    - `store_session_field` -> direct session fields
    - `generate_confirmation_draft` -> draft fields on session
    - phase/event tooling -> session phase/proposals/timeline updates
- [x] Confirm transcript persistence occurs every chat turn in `src/app/(payload)/api/art-official/chat/route.ts` (`payload.update` writing `messages`, `tokenLog`, phase).
- [x] Confirm incremental writes never touch public `artworks` before confirmation:
  - Expected: only `sessions` updates in chat/tool flows.
  - Public writes remain in `src/app/(payload)/api/art-official/sessions/[sessionId]/commit/route.ts`.
- [x] Plain answer for future readers: **per-turn autosave exists for admin Art/Official chat sessions** (writes to `sessions` each turn). **Envelope re-paste is a separate manual/external ingest path**, not the live autosave mechanism.

### 1.2 Close the "outside admin chat" bridge gap

- [x] Define ingest contract for external sessions (Claude outside admin) into envelope/session write path.
  - Preferred target: reuse `/api/studio/archive/envelope` with `collection: "sessions"` writes.
- [x] If staff-auth frontend endpoint is needed, add dedicated route under `src/app/(frontend)/api/...` or payload API namespace, but route writes through `applyEnvelopeImport`.
- [x] Ensure external bridge can write:
  - `sessionId`, `sessionType`, `status`, `messages`
  - optional `primaryArtwork`, `mentionedArtworks`, `firstImpression`, `secondDescription`, `proposedAbstracts`
- [x] Keep access safe: when passing `user`, enforce `overrideAccess: false` for Local API calls.

## 2) Envelope Contract Tightening

### 2.1 Schema alignment and UX clarity

- [x] In `src/lib/studio/archiveImportSchemas.ts`, confirm `sessions` write schema remains strict and mirrors intended ingest fields.
- [x] Confirm shorthand mapping behavior in `mapEnvelopeSessionType` is intentionally limited to current accepted values.
- [ ] In `src/components/studio/ArchiveImportPanel.tsx`, ensure help text and example payloads match current guaranteed behavior (especially `reasoningStatus` guard and partial success semantics).

### 2.2 Per-write diagnostics quality

- [ ] Standardize failure reasons from `applyEnvelopeImport` for user-facing readability (unknown slugs, unknown session refs, validation-like errors).
- [ ] Ensure response shape is stable and documented:
  - `{ collection, slug?, sessionId?, status, reason? }`.

## 3) Queryability & Public Session Surfaces

- [x] Verify `mentionedArtworks` remains independently queryable via Payload where clauses (no role-flag array migration).
- [x] Confirm public sessions index filtering by artwork checks both primary and mentioned references in `src/app/(frontend)/api/corpus/sessions/route.ts`.
- [ ] Optional hardening: add explicit regression test ensuring queries against `mentionedArtworks` return expected sessions.

## 4) Commit Boundary Safety

- [x] Reconfirm that `reasoningStatus: complete` is only applied in explicit commit/finalization paths:
  - `src/lib/studio/applyEnvelopeImport.ts` (guarded final write inside artworks set)
  - `src/app/(payload)/api/art-official/sessions/[sessionId]/commit/route.ts` (post-artwork save)
- [ ] Validate no other code path flips `reasoningStatus` as side effect of partial envelope failure.

## 5) Tests to Add / Update

### 5.1 Extend existing schema tests

- [x] Update `tests/unit/archiveImportSchemas.spec.ts` with:
  - positive case for `mentionedArtworks` and `secondDescription` in `sessions` envelope write
  - strict rejection for unknown keys inside `proposedAbstracts` entries
  - session ordering assertion (already present; keep)

### 5.2 Add importer behavior tests

- [x] Add focused tests for `applyEnvelopeImport` behavior (new test file, e.g. `tests/unit/applyEnvelopeImport.spec.ts`):
  - non-atomic mixed success/failure
  - append idempotency (`sourceSessionRef + text`)
  - guarded `reasoningStatus` sequencing
  - `reasoningStatus` withheld when prior artwork field write fails
  - session upsert by `sessionId`

### 5.3 Add resumability regression test

- [x] Add/extend chat-session tests to assert that after one turn:
  - `messages` persisted
  - `status` still `in-progress`
  - session can be reloaded/resumed without commit

## 6) Manual Verification Checklist (From Brief)

- [ ] Paste envelope with 3 writes where 1 is intentionally invalid -> 2 saved, 1 failed, all reported.
- [ ] Re-paste same envelope after fix -> previously failed write now saves; prior append writes do not duplicate.
- [ ] Query sessions where `mentionedArtworks` contains target artwork -> expected sessions returned.
- [ ] Start session, send messages, close before confirmation -> reopen and confirm transcript/state persisted.
- [ ] Confirm `reasoningStatus: complete` is never auto-flipped by unrelated partial failures.

## 7) Commands to Run Before Merge

- [ ] `pnpm test tests/unit/archiveImportSchemas.spec.ts`
- [ ] `pnpm test` (or scoped suite covering importer + sessions)
- [ ] `pnpm tsc --noEmit`

## 8) Suggested Execution Order

- [ ] 1. Incremental-save audit (`chat/route.ts`, `applyAgentTool.ts`) and patch any gaps.
- [ ] 2. External bridge implementation (route + wiring into `applyEnvelopeImport`).
- [ ] 3. Schema/UX consistency pass (`archiveImportSchemas.ts`, `ArchiveImportPanel.tsx`).
- [ ] 4. Test additions (`archiveImportSchemas.spec.ts` + importer behavior tests).
- [ ] 5. Manual verification using real envelopes in Studio import panel.

## 9) Newly Added Regression Coverage

- [x] Added importer regression: if `artworks.set` fails on non-`reasoningStatus` fields, `reasoningStatus` write does not run (`tests/unit/applyEnvelopeImport.spec.ts`).
- [x] Added `mentionedArtworks` filter regression for mentioned-only sessions (`tests/unit/tier5Sessions.spec.ts`).
