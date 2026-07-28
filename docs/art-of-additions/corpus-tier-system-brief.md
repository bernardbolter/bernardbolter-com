# Five-Tier Corpus System & Similarity Signals Brief

*Derived from The Thinker session, July 15, 2026. Read alongside `corpus-api-restructure-spec.md`, `corpus-caching-spec.md`, `connected-reading-spec-c-1-0.md`, `vision-analysis-prompt-spec.md`.*

## Part 1 — Why

The existing corpus endpoint has two effective states: the full `/api/corpus` feed (which truncates around ~50 records at reasonable token cost) and full per-record fetch. Nothing exists between "too much" and "too little," which means an AI reasoning session can't narrow from 216 records down to the right few without already knowing what it's looking for — it either has the whole truncated feed or has to be told exactly what to look at.

Separately, discovering a real cross-work pattern (as happened in this session — a 1993 painting's figure-on-architecture composition anticipating three decades of urban/architectural subject matter) currently depends entirely on the artist noticing and stating it. A tiered corpus system won't guarantee that kind of discovery on its own (see Part 4), but it enables faster, cheaper triage and narrowing, and — combined with additional similarity signals — meaningfully improves the odds of catching adjacent material worth asking about.

## Part 2 — The five tiers

| Tier | Scope | Content per record | Approx. size | Purpose |
|---|---|---|---|---|
| 1 | All 216 | Title, series, year, catalogue number, reasoning status, one-sentence gist (see Part 3) | ~20–50 tokens | Full-corpus triage/orientation |
| 2 | Filtered subset (series/date/tag/similarity) | Short description, tags, dominant colors, one-line intent, a couple of paragraphs | ~150–300 tokens | Narrowing once Tier 1 raises a hypothesis |
| 3 | Single artwork | Full text of `visionAnalyses[last]` | ~500–800 tokens | Deep look at one record's current best analysis |
| 4 | Single artwork | Full structured record — all `additionalProperty` fields, entire `visionAnalyses[]` array (every model, every date) | Variable | Complete per-record detail, cross-model comparison |
| 5 | Single artwork | Full session transcript(s) via `primaryArtwork`/`mentionedArtworks` relations | Variable, largest | "How was this known" — the reasoning behind the reasoning, not just its conclusions |

## Part 3 — Tier 1 gist generation

- Generate from `visionAnalyses[last]` (the most recent model's analysis) — NOT hand-authored per record, and NOT drawn from full reasoning fields (most records won't have those).
- This means Tier 1 content quality improves automatically as better vision models are run, with no policy change needed — "latest" is already computed at query time, same mechanism as the artwork-page description.
- Regenerate the gist whenever `visionAnalyses` gets a new entry (tie to the same `afterChange` hook already driving cache invalidation).

## Part 4 — Known limitation: Tier 1 will not reliably surface conceptual patterns on its own

Explicitly documented finding from the source conversation, to prevent this system being oversold in future specs: a single compressed sentence per artwork, generated independently per record, will describe the same underlying pattern in different words across different records (e.g. "figure surveying a townscape" vs. "elevated vantage over architecture"). Semantic compression is lossy in a way that specifically damages cross-record pattern detection — nothing about Tier 1 guarantees noticing that two differently-worded gists share a real pattern.

The discovery that prompted this whole brief (The Thinker's architecture theme connecting to thirty years of later work) arrived through the artist's lived memory in real-time conversation — not through retrieval, and not something any tier level would have surfaced unassisted. Tier 1 should be scoped honestly as **triage and orientation**, not as the mechanism for genuine discovery.

## Part 5 — Three similarity signals (distinct from the tier system, complementary to it)

| Signal | Source | Catches |
|---|---|---|
| **Visual (CLIP)** | Existing CLIP embeddings (215 of 216 present; one missing artwork to backfill) | Compositional/visual similarity — "looks alike" |
| **Literal (tags)** | Controlled vocabulary (Getty AAT-aligned) subject/style/movement tags, currently populated on only ~12 records | Declared similarity — "labeled the same" |
| **Conceptual (reasoning-text embedding)** | NEW — a second pgvector embedding per artwork, generated from `visionAnalyses[last].text` (or `formalContributionAssessment` where fuller reasoning exists), using the same "latest wins" mechanism as the display layer | Meaning-level similarity — "means something similar," independent of shared wording or visual likeness |

### 5.1 Reasoning-text embedding — implementation notes

- Store as a second pgvector column on the Artwork record, alongside the existing CLIP column.
- Feed it from `visionAnalyses[last].text` for all 216 records as soon as the Moondream batch pipeline runs — this gives full-corpus coverage immediately, at Moondream's depth.
- When a record goes through a real Art/Official reasoning session and gains `formalContributionAssessment` text, regenerate this embedding from the richer source — same "latest/best available source wins" pattern used elsewhere, requiring no manual precedence logic beyond "prefer reasoning text over vision-analysis text when both exist."
- Be explicit in any UI/documentation that Moondream-sourced embeddings represent visual/descriptive similarity (closer to what CLIP already offers), not the deeper, lived-memory kind of connection a real reasoning session can surface. Don't overstate what this signal catches.

## Part 6 — Filter mechanism (Tier 2)

`/api/corpus/index` should accept combinable query params:

- `?series=digital-city-series`
- `?yearFrom=1993&yearTo=1999`
- `?status=complete` / `?hasVisionAnalyses=true`
- Future: `?similarTo=[slug]` — a live nearest-neighbor query against CLIP and/or reasoning-text embeddings, returning the filtered set by similarity rather than static metadata

## Part 7 — Caching implication

The filtered index endpoint must inherit the same tag-based cache invalidation as `/api/corpus` (`corpus` tag, `artwork-${slug}` tags) — see `corpus-caching-spec.md`. A filtered query is a different response body from the same underlying data; Next.js's fetch cache keys on full URL including query params by default, but the *invalidation* tag needs to cover filtered variants too, or editing an artwork could leave stale filtered results after the base corpus purges correctly.

## Part 8 — Do NOT

- Do not present Tier 1 as a discovery mechanism in any user-facing documentation — it is triage/orientation only (Part 4).
- Do not build tags, CLIP, and reasoning-text embeddings as competing/redundant systems — each catches a genuinely different kind of similarity; keep them as three distinct, separately-queryable signals.
- Do not let the Moondream-fed reasoning-text embedding silently overwrite a better embedding already generated from real reasoning text — "best available source" precedence applies here the same as elsewhere.
- Do not build the filtered index endpoint without extending the existing cache-tag scheme to cover it.

## Part 9 — Verification checklist

- [ ] Tier 1 gist regenerates automatically when a new `visionAnalyses` entry is added
- [ ] `/api/corpus/index` accepts and correctly combines series/year/status filters
- [ ] Reasoning-text embeddings exist for all 216 records after the Moondream batch run
- [ ] A record with real Art/Official reasoning shows a reasoning-text embedding sourced from `formalContributionAssessment`, not from `visionAnalyses`
- [ ] Editing an artwork correctly invalidates cached filtered-index responses that include it, not just the base corpus feed

---
*Corpus tier system brief · July 2026*
