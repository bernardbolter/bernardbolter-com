# Reasoning-Text Embedding Follow-Up Brief (Repo-Mapped)

Derived from `docs/art-of-additions/corpus-tier-system-brief.md` Part 5.1.

Scope: add a second conceptual similarity signal on `artworks`, fed by text (`visionAnalyses` / `formalContributionAssessment`), without changing existing CLIP/DINO behavior.

---

## 1) Goal

Add a dedicated pgvector column for **reasoning-text embeddings** so similarity can operate on meaning-level text, not only visual features.

Design intent:
- baseline source: `visionAnalyses` text
- preferred source (when available): richer reasoning text (`formalContributionAssessment`)
- deterministic precedence: **best available source wins**

Out of scope:
- user-facing copy changes
- redesign of Tier 1 caveat language
- replacing CLIP/DINO signals

---

## 2) Current State (Confirmed)

- [x] `artworks` already uses pgvector columns:
  - `clipEmbedding` (`vector(768)`)
  - `dinov2Embedding` (`vector(1024)`)
  (`src/collections/Artworks.ts`)
- [x] Similarity SQL helper already exists with pluggable vector column pattern:
  - `src/lib/payload/similarity.ts`
- [x] Tier-1 gist pipeline already consumes vision-analysis text for summary:
  - `src/lib/corpus/corpusGist.ts`

Open runtime data point:
- [ ] CLIP coverage count (e.g. 215/216) remains runtime-verify-only when DB connection is available.

---

## 3) Proposed Data Model

### 3.1 New artwork fields

Add on `artworks` (hidden/read-only admin like existing embeddings):

- `reasoningTextEmbedding` (`json` with `custom.dbType: 'vector(<N>)'`)
- `reasoningTextEmbeddingGeneratedAt` (`date`)
- `reasoningTextEmbeddingSource` (`select` or `text`, values:
  - `formal-contribution-assessment`
  - `vision-analysis-preferred`
  )

Decision needed:
- [x] Choose model + dimensionality for text embedding (`<N>`).
  - **Chosen (Option A / field-notes aligned):** OpenAI-compatible `text-embedding-3-small` via `REASONING_TEXT_EMBEDDING_URL` → **vector(1536)**.
  - Rationale: CLIP local sidecar is image-only and CLIP text is too short-context for formal assessments; Anthropic has no embeddings API; OpenAI-compatible endpoint matches `docs/fieldNotes/small-model-architecture.md`.

### 3.2 Source-precedence contract

Single resolver function should determine source text per artwork:

1. Use `formalContributionAssessment` when present/non-trivial.
2. Else use selected vision-analysis text source.
3. Else skip embedding generation.

Implementation note:
- Keep this as one function so backfill, hook updates, and manual repair scripts all share identical precedence behavior.

---

## 4) Repo Touchpoints

### 4.1 Schema / types

- `src/collections/Artworks.ts`
  - add reasoning-text embedding fields
  - optionally add metadata row in `embeddings[]` conventions
- `src/payload-types.ts`
  - regenerate after schema update (`npm run generate:types`)

### 4.2 Embedding generation utilities

- Add new utility for text embedding generation (analogous to CLIP/DINO utilities):
  - suggested path: `src/utilities/generateReasoningTextEmbedding.ts`
- Add DB persistence helper:
  - suggested path: `src/utilities/persistArtworkReasoningEmbedding.ts`

### 4.3 Source resolver

- Add shared resolver module:
  - suggested path: `src/lib/artwork/reasoningEmbeddingSource.ts`
  - returns `{ sourceType, sourceText } | null`

### 4.4 Backfill script

- Add one-time/repair script:
  - suggested path: `src/scripts/backfillReasoningTextEmbeddings.ts`
  - NULL-only mode + dry-run mode + optional limit

### 4.5 Hooks / refresh triggers

- Evaluate whether to trigger in:
  - `src/hooks/artworkAfterChange.ts` (likely)
  - only when source fields change (avoid unnecessary recompute)

### 4.6 Similarity query integration

- Extend `src/lib/payload/similarity.ts` column enum to include reasoning vector column.
- Keep CLIP/DINO behavior unchanged.
- Decide whether to expose reasoning-based similar endpoints now or keep internal until validated.

---

## 5) Vision Source Policy Clarification

The corpus brief says `visionAnalyses[last]`, while current code often prefers higher-tier analysis via `preferredVisionAnalysis`.

Before implementation, decide one policy for reasoning embedding fallback:

- [ ] **Strict latest row** (`latestVisionAnalysis`) for mechanical “last wins”.
- [x] **Preferred analysis** (`preferredVisionAnalysis`) for quality-biased fallback.

Recommendation:
- choose one and document it in code comments + this brief to avoid split behavior between Tier 1 gist and reasoning embedding source.

**Decision:** use `preferredVisionAnalysis` so reasoning embeddings and Tier-1 gist share the same quality-biased vision source.

---

## 6) API / Filter Scope

Keep `similarTo` as future work unless explicitly pulled into this follow-up.

For this brief:
- [x] No required changes to `/api/corpus/index` filter surface.
- [ ] Optional internal-only test query path for QA may be added if needed.

---

## 7) Verification Checklist

### 7.1 Mechanical checks

- [ ] New reasoning embedding column exists in Postgres and Payload schema.
- [ ] Backfill script dry-run reports eligible records correctly.
- [ ] Backfill writes embeddings for records with valid source text.
- [ ] Re-running backfill is idempotent (NULL-only by default or explicit overwrite flag).
- [ ] `reasoningTextEmbeddingSource` reflects correct precedence choice per record.

### 7.2 Precedence checks

- [ ] Record with both `formalContributionAssessment` and vision text uses formal source.
- [ ] Record with no formal contribution but valid vision text uses vision source.
- [ ] Record with neither source remains null and is reported clearly.

### 7.3 Similarity sanity checks

- [ ] Nearest-neighbor query returns results on reasoning vector column without impacting CLIP/DINO behavior.
- [ ] Spot-check at least 3 known conceptual pairs for qualitative plausibility.

---

## 8) Risks / Follow-Up Brief Triggers

Open a separate brief if any of the following appears:

- embedding provider/dimension choice has cost/latency tradeoffs that affect architecture
- source precedence needs weighted blending instead of single-source selection
- public API/UI needs to expose multi-signal similarity controls (`visual` vs `conceptual`)
- cache invalidation needs cross-endpoint propagation beyond existing artwork/corpus tags

---

## 9) Suggested Execution Order

1. [x] Finalize source-policy decision (`latest` vs `preferred` vision fallback).
2. [x] Add schema fields + regenerate types.
3. [x] Implement source resolver + generator + persistence helper.
4. [x] Add backfill script and run dry-run. *(dry-run/runtime backfill still needs DB + `REASONING_TEXT_EMBEDDING_URL`)*
5. [x] Extend similarity SQL helper column enum.
6. [x] Add tests for precedence + persistence. *(precedence unit tests added; persistence is SQL helper)*
7. [ ] Run initial backfill when DB connectivity + embedding endpoint are available.

### Env required for runtime

```
REASONING_TEXT_EMBEDDING_URL=https://api.openai.com/v1/embeddings
REASONING_TEXT_EMBEDDING_API_KEY=sk-...
# optional:
REASONING_TEXT_EMBEDDING_MODEL=text-embedding-3-small
```

Schema migration: `npm run migrate:reasoning-text-embedding`  
Backfill: `npm run backfill:reasoning-text -- --dry-run`
