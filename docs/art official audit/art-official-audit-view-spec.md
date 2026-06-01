# Art/Official — Session Coverage Audit View

## Build spec + operating walkthrough

*May 2026 · bernardbolter.com · Written for Cursor build + dual-window operation*

**Companion docs:** `art-official-status.md` (current state), `art-official-dialogue-spec.md` (dialogue model, field roadmap), `artist-archive-schema-final.md` (canonical field names)

---

## Why this exists

The cataloguing agent already records everything needed to see what a session produced — `Session.fieldUpdateTimeline`, the committed `artworks` draft, and the quality annotations (`weakPhases`, `formalContributionAccuracy`, `dialogueRefinementFlag`). What's missing is a single screen that joins those three sources and tells you, for one session, **which fields got filled, how, and which the dialogue missed.**

This view is the instrument for the catalogue → audit → amend loop. Without it, auditing a session means clicking through Payload by hand, which is slow enough that it won't happen every time. With it, every gap is visible in one place and labelled with the file you'd edit to fix it.

This is Phase F2 in `art-official-status.md`, scoped up from "commit history" to a field-coverage report.

---

# PART A — Build Spec (for Cursor)

## A.0 What you are building

A read-only Payload admin view at `/admin/art-official/audit` that, for a selected completed session, computes a **four-bucket field coverage report** and renders it grouped by dialogue phase, with a remediation hint on every gap.

**Hard constraints — do NOT:**

- Write to any collection. This view is strictly read-only.
- Call the model or recompute anything. It is a pure data join over data that already exists.
- Invent or hardcode field names inline. All field names come from `fieldCatalog.ts` (A.2). If a timeline entry references a field not in the catalog, surface it as a `catalog-drift` warning rather than silently dropping it.
- Count dormant (out-of-tier) fields as gaps.
- Block rendering when a session has no committed artwork (abandoned or statement-type sessions). Degrade to timeline-only coverage.
- Introduce a new visual language. Match the existing admin components — read `src/components/admin/artOfficial/SessionSidebar.tsx` and reuse its primitives and Payload UI conventions.

## A.1 The four-bucket logic (the heart of it)

For each field `F` in the catalog, given the artist's `careerStage` (`CS`):

**Step 1 — is `F` expected at this tier?**
`studio` fields are always expected. `market` fields are expected when `CS ∈ {market, institutional}`. `institutional` fields are expected only when `CS = institutional`. If `F` is not expected → bucket = `dormant`. Stop.

**Step 2 — for expected fields, join timeline against the committed artwork:**

| Staged in timeline? | Present + non-empty in artwork? | Confidence | → Bucket |
|---|---|---|---|
| yes | yes | `confirmed` | `confirmed` |
| yes | yes | `inferred` | `inferred` |
| yes | **no** | — | `staged_dropped` |
| no | yes | — | `filed_direct` |
| no | no | — | `unaddressed` |

When multiple timeline entries exist for one field, use the latest (by timestamp) and carry its `confidence` and `source`.

**What each bucket means:**

- `confirmed` / `inferred` — healthy. The difference is just whether you stated it or the agent suggested it.
- `filed_direct` — entered without passing through the dialogue, e.g. the post-upload fact form or a client edit at confirmation. Not a problem; shown so the picture is complete.
- `staged_dropped` — **attention.** The agent staged a value but it never reached the artwork. Either you rejected it at the confirmation step, or the commit path dropped it (`buildArtworkPatch.ts` mapping or a `fieldAllowlist.ts` block). This is your commit-bug detector.
- `unaddressed` — **attention.** An in-tier field the dialogue never touched and the artwork doesn't have. This is the actionable list — what the conversation missed.
- `dormant` — correctly skipped for the current career stage. Greyed, never counted as a gap.

**Note on layer.** An `unaddressed` field is remediated differently depending on its layer. An unaddressed `artist`-layer field (e.g. `seriesContext`) is a dialogue problem → fix the prompt. An unaddressed `automatic`-layer field (e.g. `clipEmbedding`, `dominantColors`) is a pipeline-wiring problem → fix `runImageAnalysis.ts` or the embedding wiring, not the dialogue. The remediation map (A.3) keys off both category and layer so the hint points at the right file.

> Expected first result: running this against the one artwork already catalogued should show `clipEmbedding` as `unaddressed` / automatic — because `persistArtworkClipEmbedding` is not wired into the turn loop (see `art-official-status.md`, Phase 4). The view is working correctly when it surfaces that.

## A.2 Field catalog — `src/lib/artOfficial/fieldCatalog.ts`

The single source of truth for which fields exist, what phase they belong to, their tier, and their layer. Annotate from the roadmap in `art-official-dialogue-spec.md` §1.5 and the field list in `artist-archive-schema-final.md`.

```ts
export type RoadmapCategory =
  | 'automatic'
  | 'early'
  | 'middle-practical'
  | 'middle-reflective'
  | 'late'
  | 'confirmation-generated';

export interface CatalogField {
  field: string;                                   // exact Payload field name
  category: RoadmapCategory;
  layer: 'artist' | 'agent' | 'automatic';
  tier: 'studio' | 'market' | 'institutional';
}

export const ARTWORK_FIELD_CATALOG: CatalogField[] = [
  // automatic
  { field: 'orientation',        category: 'automatic', layer: 'automatic', tier: 'studio' },
  { field: 'aspectRatio',        category: 'automatic', layer: 'automatic', tier: 'studio' },
  { field: 'sizeTier',           category: 'automatic', layer: 'automatic', tier: 'studio' },
  { field: 'dominantColors',     category: 'automatic', layer: 'automatic', tier: 'studio' },
  { field: 'paintedFieldColors', category: 'automatic', layer: 'automatic', tier: 'studio' },
  { field: 'compositionalNotes', category: 'automatic', layer: 'agent',     tier: 'studio' },
  { field: 'clipEmbedding',      category: 'automatic', layer: 'automatic', tier: 'studio' },
  // early
  { field: 'title',              category: 'early', layer: 'artist', tier: 'studio' },
  { field: 'yearCreated',        category: 'early', layer: 'artist', tier: 'studio' },
  { field: 'series',             category: 'early', layer: 'artist', tier: 'studio' },
  { field: 'city',               category: 'early', layer: 'artist', tier: 'studio' },
  // middle-practical
  { field: 'widthCm',            category: 'middle-practical', layer: 'artist', tier: 'studio' },
  { field: 'heightCm',           category: 'middle-practical', layer: 'artist', tier: 'studio' },
  { field: 'medium',             category: 'middle-practical', layer: 'artist', tier: 'studio' },
  { field: 'support',            category: 'middle-practical', layer: 'artist', tier: 'studio' },
  // middle-reflective
  { field: 'intent',             category: 'middle-reflective', layer: 'artist', tier: 'studio' },
  { field: 'makingNote',         category: 'middle-reflective', layer: 'artist', tier: 'studio' },
  { field: 'directInspiration',  category: 'middle-reflective', layer: 'artist', tier: 'studio' },
  { field: 'artHistoricalContext', category: 'middle-reflective', layer: 'artist', tier: 'studio' },
  { field: 'seriesContext',      category: 'middle-reflective', layer: 'artist', tier: 'studio' },
  // late
  { field: 'consciousRejections', category: 'late', layer: 'artist', tier: 'studio' },
  { field: 'encounterNote',       category: 'late', layer: 'artist', tier: 'studio' },
  { field: 'formalContributionAssessment', category: 'late', layer: 'agent', tier: 'studio' },
  // confirmation-generated
  { field: 'descriptionShort',   category: 'confirmation-generated', layer: 'agent', tier: 'studio' },
  { field: 'descriptionLong',    category: 'confirmation-generated', layer: 'agent', tier: 'studio' },
  { field: 'conceptualKeywords', category: 'confirmation-generated', layer: 'agent', tier: 'studio' },
  // market tier (dormant at studio)
  { field: 'salesRecord',        category: 'middle-practical', layer: 'artist', tier: 'market' },
  { field: 'auctionHouse',       category: 'middle-practical', layer: 'artist', tier: 'market' },
  // institutional tier (dormant at studio + market)
  { field: 'loanHistory',          category: 'middle-practical', layer: 'artist', tier: 'institutional' },
  { field: 'authenticationRecord', category: 'middle-practical', layer: 'artist', tier: 'institutional' },
];
```

The list above is illustrative, not exhaustive — populate it from the real Artworks collection. Add a unit test that asserts **every** `field` in the catalog exists in the live Payload Artworks collection config, so the catalog can't silently drift from the schema.

## A.3 Remediation map — `src/lib/artOfficial/fieldRemediation.ts`

Turns a gap into "open this file." Keyed by `(category, layer)` with a couple of explicit overrides.

```ts
export interface Remediation { file: string; lever: string; surface: 'cursor' | 'payload-admin'; }

export function remediationFor(f: CatalogField, bucket: CoverageBucket): Remediation | null {
  if (bucket === 'staged_dropped')
    return { file: 'buildArtworkPatch.ts / fieldAllowlist.ts', lever: 'Field staged but not committed — check the commit mapping and the allowlist.', surface: 'cursor' };

  if (bucket !== 'unaddressed') return null;

  if (f.field === 'clipEmbedding')
    return { file: 'persistArtworkClipEmbedding', lever: 'CLIP embedding not wired into the turn loop — wire it on artwork commit.', surface: 'cursor' };
  if (f.layer === 'automatic' || f.category === 'automatic')
    return { file: 'runImageAnalysis.ts', lever: 'Vision/automatic field not produced — check the image-analysis pass.', surface: 'cursor' };

  switch (f.category) {
    case 'early':
    case 'middle-practical':
      return { file: 'buildSystemPrompt.ts (field roadmap)', lever: 'Orientation/fact field not reached — adjust the roadmap or the post-upload fact-confirm step.', surface: 'cursor' };
    case 'middle-reflective':
    case 'late':
      return { file: 'buildSystemPrompt.ts (block-handling)', lever: 'Reflective field landed flat or was never reached — adjust the block-handling and "do not close until covered" rules.', surface: 'cursor' };
    case 'confirmation-generated':
      // prose quality is a voice problem, not a code problem
      return f.layer === 'agent'
        ? { file: 'PracticeKnowledge: preferred-vocabulary / artist-statement', lever: 'Generated prose in the wrong voice — edit the voice model content.', surface: 'payload-admin' }
        : { file: 'agentTools.ts (generate_confirmation_draft)', lever: 'Draft field not generated — check the confirmation-draft tool.', surface: 'cursor' };
    default:
      return null;
  }
}
```

The `surface` field matters for the dual-window workflow: most fixes are `cursor` (prompt or code), but voice fixes are `payload-admin` (the dynamic `practice-knowledge` content). The view should show which window to go to.

## A.4 Coverage computation — `src/lib/artOfficial/sessionCoverage.ts`

Pure function, no I/O. Unit-testable in isolation (matches the existing unit-test culture).

```ts
export type CoverageBucket =
  | 'confirmed' | 'inferred' | 'filed_direct'
  | 'staged_dropped' | 'unaddressed' | 'dormant';

export interface FieldCoverage {
  field: string;
  category: RoadmapCategory;
  layer: 'artist' | 'agent' | 'automatic';
  tier: 'studio' | 'market' | 'institutional';
  bucket: CoverageBucket;
  confidence?: 'confirmed' | 'inferred';
  source?: 'conversation' | 'image-analysis' | 'knowledge-base' | 'external-lookup' | 'client-edit';
  stagedAt?: string;
  filedPreview?: string;       // truncated committed value, for display
  remediation?: Remediation | null;
}

export interface CoverageReport {
  sessionId: string;
  sessionType: string;
  artworkId: string | null;
  careerStage: 'studio' | 'market' | 'institutional';
  generatedAt: string;
  summary: Record<'expected'|'confirmed'|'inferred'|'filedDirect'|'stagedDropped'|'unaddressed'|'dormant', number>;
  fields: FieldCoverage[];                 // every catalog field, grouped by category in the UI
  attention: { unaddressed: FieldCoverage[]; stagedDropped: FieldCoverage[] };
  driftWarnings: string[];                 // timeline fields not present in the catalog
  quality: {
    weakPhases: string[];
    formalContributionAccuracy?: string;
    dialogueRefinementFlag: boolean;
    refinementNotes?: string;
  };
}

export function computeSessionCoverage(args: {
  session: Session;            // includes fieldUpdateTimeline, weakPhases, etc.
  artwork: Artwork | null;     // committed draft, or null
  careerStage: 'studio' | 'market' | 'institutional';
  catalog: CatalogField[];
}): CoverageReport;
```

Implementation notes: a field is "filed" when `artwork[field]` is present and non-empty — treat `null`, `''`, `[]`, and `{}` as empty. Build a `Map` of latest timeline entry per field once, then iterate the catalog. Collect any timeline field absent from the catalog into `driftWarnings`. Attach `remediationFor()` to every `unaddressed` and `staged_dropped` field.

## A.5 API route — `GET /api/art-official/sessions/[sessionId]/coverage`

`requireStaff`. Load the session, the linked artwork (if `artworkRecord` is set), and the artist's `careerStage`. Call `computeSessionCoverage`. Return the `CoverageReport` as JSON. No mutations.

## A.6 Admin view + components

- Register `/admin/art-official/audit` in `src/payload.config.ts` under `admin.components.views`, alongside the existing Art/Official views.
- `src/components/admin/artOfficial/AuditView.tsx` — a session picker (list completed sessions, most-recent default; allow `?sessionId=` deep link) and the report below it.
- `src/components/admin/artOfficial/CoverageTable.tsx`:
  - **Summary header** — e.g. `Studio tier · 27 expected · 18 confirmed · 4 inferred · 1 direct · 1 dropped · 3 unaddressed · 5 dormant`.
  - **Attention block first** — the `unaddressed` and `staged_dropped` lists, each row showing the field, its phase, and the remediation hint (file + which window).
  - **Full table** grouped by `RoadmapCategory`, bucket shown as a coloured tag, with `source` and `stagedAt` columns. Dormant rows greyed and visually separated.
  - **Quality panel** — `weakPhases`, `formalContributionAccuracy`, `refinementNotes`, side by side with the coverage so your subjective notes and the hard data sit together.
  - **Drift warnings** if any.

## A.7 Build steps (ordered)

1. `fieldCatalog.ts` + drift unit test against the live Artworks collection.
2. `fieldRemediation.ts`.
3. `sessionCoverage.ts` (pure function).
4. Unit tests for `sessionCoverage` with fixtures: one session whose timeline + artwork produce a known mix of all six buckets; assert the summary counts and per-field buckets.
5. `GET …/coverage` route.
6. `AuditView.tsx` + register the route.
7. `CoverageTable.tsx`.
8. Run the verification checklist (A.8).

## A.8 Verification checklist

- [ ] Catalog drift test passes (every catalog field exists in the Artworks collection).
- [ ] `sessionCoverage` unit tests pass for all six buckets.
- [ ] Dormant fields are excluded from `expected` and from every gap list.
- [ ] A session with no committed artwork renders without error (timeline-only).
- [ ] `clipEmbedding` shows as `unaddressed` / automatic with the embedding-wiring remediation hint on the already-catalogued artwork.
- [ ] The view performs no writes (read-only confirmed).
- [ ] Visual style matches `SessionSidebar.tsx`.

---

# PART B — Operating the loop (for you, two windows open)

## B.0 Window setup

- **Left window — browser at `/admin/art-official`.** This is where you run sessions and read the audit.
- **Right window — Cursor on the `bernardbolter-com` repo.** This is where you amend instructions.

The whole loop is: run a session on the left, read the audit on the left, then cross to the right to edit one file, then back to the left for the next artwork. The remediation hints tell you exactly which file to open on the right — and whether a fix is even a Cursor fix or a Payload-admin content fix.

## B.1 First, build the view (one time)

In Cursor (right window), paste this:

> Read `art-official-audit-view-spec.md`, Part A. Build the session coverage audit view exactly as specified: `fieldCatalog.ts`, `fieldRemediation.ts`, `sessionCoverage.ts` with unit tests, the `GET /api/art-official/sessions/[sessionId]/coverage` route, and the `/admin/art-official/audit` admin view with `CoverageTable`. Follow the "do NOT" constraints in A.0. Match the styling of `src/components/admin/artOfficial/SessionSidebar.tsx`. Populate `fieldCatalog.ts` from the real Artworks collection, not only the illustrative list in the spec. Run the verification checklist in A.8 when done and report which boxes pass.

When it finishes, go to the left window and open `/admin/art-official/audit`.

## B.2 First audit — diagnose the artwork you already did

Before cataloguing anything new, point the view at the **one artwork you already catalogued**. This is your existing test fixture, and it answers the original question — *why weren't all the fields filled?* — with data instead of guesswork.

Read the attention block. Each `unaddressed` field will fall into one of three causes, and the remediation hint names which:

- **Automatic field unaddressed** (e.g. `clipEmbedding`, `dominantColors`) → a wiring gap, not a dialogue gap. Right window, fix `runImageAnalysis.ts` or the embedding wiring.
- **Reflective field unaddressed** (e.g. `seriesContext`, `consciousRejections`) → the conversation didn't reach it. Right window, `buildSystemPrompt.ts` block-handling.
- **Generated field unaddressed** (e.g. `descriptionLong`) → the confirmation-draft step didn't fire, or the prose was rejected. Check `generate_confirmation_draft`; if it's a voice problem, that's a Payload-admin content edit, not Cursor.

This single screen sorts the original "missing fields" problem into its real causes.

## B.3 The recurring loop (once per series artwork)

1. **Left — run a session.** Start an `artwork-cataloguing` session on the next series' artwork. Pre-upload questions and blind description first; upload; confirm the facts (title, year, dimensions, medium) right after upload; let the conversation do the rest. Commit as draft.
2. **Left — open the audit** for that session. Read the summary line and the attention block.
3. **Left — annotate** while it's fresh: set `weakPhases`, `dialogueRefinementFlag`, and write `refinementNotes` with the *cause*, not just the feeling — "intent landed flat because it was asked head-on."
4. **Right — make one edit.** Take the top item from the attention block, open the file its remediation hint names, change it. Edit prompt text where you can; touch code only for the `staged_dropped` (commit-path) class.
5. **Right — verify.** Re-read the prompt block; if you touched `sessionCoverage` or any lib, run the unit tests.
6. **Left — next artwork.** Do *not* re-run the same work from scratch — you'll get rehearsed, defended answers. The next series artwork is the next test. Watch whether the buckets improved.

By the end of the per-series pass you have one tuned dialogue **and** one record per series — the audit rode on top of the plan you already had.

## B.4 Amendment prompt templates (right window)

**A reflective field keeps getting missed:**
> In `buildSystemPrompt.ts`, the field roadmap is letting sessions close before `seriesContext` is addressed. Add a rule: the session must not move to wrap-up until `seriesContext` is either confirmed or explicitly judged not-applicable for this work. Keep it internal — the artist never sees the field name or a phase label.

**A question lands flat:**
> In the block-handling section of `buildSystemPrompt.ts`, `makingNote` is being asked too directly and producing thin answers. Add a fallback: if the first making question lands flat, pivot to a specific visual observation from the image analysis and ask about that single choice, so the making account surfaces sideways.

**A value was staged but didn't commit:**
> The audit shows `framing` as `staged_dropped` — it was in the session timeline but not in the committed artwork. Check `buildArtworkPatch.ts` mapping and `fieldAllowlist.ts` to see why `framing` isn't being written, and fix it.

**Prose in the wrong voice (this one is the LEFT window — Payload admin):**
> Not a Cursor edit. In Payload admin, open the `practice-knowledge` record `preferred-vocabulary` and adjust the words-to-use / words-to-avoid, then the `artist-statement` record if the register is off. The agent reads these live; no redeploy needed.

## B.5 Where this leads

Once the loop has run across the series and the buckets are coming back clean, you'll know *which tasks reliably produce good data on Claude*. That is the prerequisite for the Phase G small-model router (`taskHint`, Groq / Hetzner) — you can't safely hand a task to a smaller model until you've seen it produce good data on the strong one. So this loop is upstream of the handoff question you started with: tune what gets generated first, route it second.

---

*Art/Official Audit View · build spec + operating walkthrough · May 2026*
