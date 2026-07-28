# Corpus Tier Depth & Traversal — Cursor Implementation Spec

*July 28, 2026. Written after a live audit of the production corpus API.*
*Read alongside `corpus-tier-system-brief.md`, `corpus-api-restructure-spec.md`, `corpus-tier1-index-fix-spec.md`, `sessions-tier5-machine-access-spec.md`, `artism-vocabulary.md`.*

**Scope:** API shape, tier addressing, JSON-LD conformance, traversal links.
**Explicitly out of scope:** catalogue-number prefix corrections, promoting escaped-JSON relations to real nodes, R2 image domain migration. Those are data migrations and belong in a separate pass — do NOT touch them here.

---

## Why

The tier system exists in the specs and partially in the code, but is not usable from outside. A live audit found:

1. `/api/corpus/index` returns plain JSON with camelCase keys — no `@type`, no `@id`, no `artism:` prefixes — while declaring `"@vocab": "https://schema.org/"`. A conforming JSON-LD processor expands `title`, `slug`, `gist`, `reasoningStatus` etc. against schema.org, finds no such terms, and **drops every property**. The primary machine entry point is empty to any real JSON-LD reader.
2. Tier 2 (narrowing depth) has no address at all. Filtering the index returns *fewer Tier 1 records*, not deeper ones. Scope and depth are conflated on one axis.
3. Tier 5 is addressed as `?tier=5` on `/api/corpus/[slug]` and is **silently ignored** — returns a byte-identical Tier 4 body with no error and no signal.
4. `/api/corpus/[slug]` has no `artism:indexUrl` (spec'd, never shipped) and no link to sessions. It is a dead end.
5. Series appear as `Collection` in the feed header and `CreativeWorkSeries` in records, neither with an `@id` — so a processor cannot tell they are the same entity.
6. The index's `sessionsUrl` points at an HTML page (`/sessions?artwork=…`), not a machine endpoint.
7. Tier number does not predict content depth. A stub record at Tier 4 returns less than a reasoned record at Tier 1. Nothing declares which tiers hold anything for a given work.

Confirmed working and **not** to be changed: query params reach the handler correctly (`?series=megacities` returns 6 of 216); `cf-cache-status: DYNAMIC` so there is no CDN query-string normalisation; 404-on-unknown-slug works; boundary-aware gist truncation shipped; `descriptionShort`/`intentLine` are correctly absent from the index.

---

## Part 0 — Two global constants

Create a single module (suggested: `lib/corpus/constants.ts`) exporting both. Every other change in this spec imports from it. Do NOT inline either value anywhere else.

```typescript
// The artism vocabulary namespace.
// artism.org/schema/ currently returns 404. bernardbolter.com/schema/ resolves (308 → served doc).
// DECISION GATE — September 1, 2026:
//   If artism.org/schema/ is live and serving the vocabulary → leave as artism.org.
//   If not → change this one line to 'https://bernardbolter.com/schema/'.
// Whichever loses MUST permanently redirect to the winner. A dead namespace URI is
// worse than one that moved.
export const ARTISM_NS = 'https://artism.org/schema/'

export const CORPUS_BASE = 'https://bernardbolter.com'
```

Also: every corpus endpoint must return `Content-Type: application/ld+json`. It currently returns `application/json`. This is the header that tells a crawler the body is linked data at all.

---

## Part 1 — JSON-LD conformance for the index

**This is the highest-priority change in the spec. Do it first.**

Current index record (live):

```json
{
  "slug": "venice-in-the-middle",
  "title": "Venice in the Middle",
  "catalogueNumber": "BB-BDA-2025-001",
  "year": 2025,
  "series": "breaking-down-art",
  "seriesName": "Breaking Down Art",
  "medium": "acrylic transfers and acrylic on canvas",
  "reasoningStatus": "complete",
  "hasEditions": "none",
  "gist": "…",
  "url": "https://bernardbolter.com/venice-in-the-middle",
  "visionUrl": "…",
  "recordUrl": "…",
  "sessionsUrl": "https://bernardbolter.com/sessions?artwork=venice-in-the-middle"
}
```

Required index record after this change:

```json
{
  "@type": "VisualArtwork",
  "@id": "https://bernardbolter.com/venice-in-the-middle",
  "name": "Venice in the Middle",
  "url": "https://bernardbolter.com/venice-in-the-middle",
  "dateCreated": "2025",
  "artMedium": "acrylic transfers and acrylic on canvas",
  "identifier": {
    "@type": "PropertyValue",
    "propertyID": "artism:catalogueNumber",
    "value": "BB-BDA-2025-001"
  },
  "isPartOf": { "@id": "https://bernardbolter.com/series/breaking-down-art#series" },
  "artism:slug": "venice-in-the-middle",
  "artism:reasoningStatus": "complete",
  "artism:gist": "…",
  "artism:gistSource": "vision:claude-fable-5",
  "artism:availableTiers": { "1": true, "2": true, "4": true, "5": false }
}
```

Key mappings — use exactly these, do NOT invent alternatives:

| Current key | Becomes | Notes |
|---|---|---|
| `title` | `name` | schema.org term. `title` is not one. |
| `year` | `dateCreated` | String, not number, matching the per-record endpoint |
| `medium` | `artMedium` | |
| `catalogueNumber` | `identifier` (PropertyValue) | |
| `series` + `seriesName` | `isPartOf` `@id` reference | See Part 2 |
| `slug` | `artism:slug` | Retained — it is the archive's own key, not a schema.org concept |
| `reasoningStatus` | `artism:reasoningStatus` | |
| `gist` | `artism:gist` | |
| `hasEditions` | **removed** | Commerce metadata; no triage value. Available at Tier 4. |
| `url` | `url` + `@id` | Both. `@id` is identity, `url` is the address. |

**Rule:** after this change, every key in every corpus response is either a real schema.org term or carries the `artism:` prefix. There must be zero bare camelCase keys anywhere. This rule applies to the envelope as well as the records.

### 1.1 — Per-record URLs move to envelope templates

The three derived URLs (`visionUrl`, `recordUrl`, `sessionsUrl`) are ~60 tokens per record — at 216 records that is roughly half the index payload, and every one of them is mechanically derivable from the slug.

Publish them once in the envelope instead:

```json
"artism:urlTemplates": {
  "page": "https://bernardbolter.com/{slug}",
  "record": "https://bernardbolter.com/api/corpus/{slug}",
  "visionPage": "https://bernardbolter.com/{slug}/vision",
  "sessions": "https://bernardbolter.com/api/corpus/{slug}/sessions",
  "sessionsPage": "https://bernardbolter.com/sessions?artwork={slug}"
}
```

Substitution is `{slug}` only — no other variables, no nesting.

The full absolute URLs are still emitted per-record at **survey depth and Tier 4**, where payload pressure is lower and a reader is more likely to want them inline. Tier 1 is the only place they are templated.

*If this proves awkward in practice, reverting is a one-function change — re-emit the four fields per record and drop the template block. Do not treat it as load-bearing.*

---

## Part 2 — Series as a real, linkable node

Series is the primary organising structure of the practice and is currently the least traversable thing in the graph.

**Canonical series `@id`:** `https://bernardbolter.com/series/{slug}#series`

**Feed envelope** — every list response (index, survey, root feed) carries the full series set:

```json
"about": [
  {
    "@type": "CreativeWorkSeries",
    "@id": "https://bernardbolter.com/series/megacities#series",
    "name": "Megacities",
    "url": "https://bernardbolter.com/series/megacities"
  }
]
```

**Every artwork record** — index, survey, and Tier 4 — references by `@id` only:

```json
"isPartOf": { "@id": "https://bernardbolter.com/series/megacities#series" }
```

At Tier 4, where there is no sibling `about` block to resolve against, emit the full node inline instead of a bare reference:

```json
"isPartOf": {
  "@type": "CreativeWorkSeries",
  "@id": "https://bernardbolter.com/series/megacities#series",
  "name": "Megacities",
  "url": "https://bernardbolter.com/series/megacities"
}
```

This is the same pattern already working correctly for `creator` → `https://bernardbolter.com/bio#person`.

Change `@type` from `Collection` to `CreativeWorkSeries` in the feed header. One type per entity, everywhere.

The series page at `/series/[slug]` should also emit JSON-LD using the same `@id`, so the node the corpus references is the node the HTML page describes.

---

## Part 3 — Gist source precedence and provenance

The gist is currently the first sentence of the preferred vision analysis. Because the vision prompt asks for composition first, gists systematically describe formal layout — two of four sampled records literally begin "The composition is a…". The archive's only prose at triage depth is therefore sourced from the part of the pipeline that knows least, since vision analysis is deliberately blind.

Fix by fallback, not by replacement. Implement `resolveGist(artwork)` returning `{ text, source }`:

```
1. descriptionShort, first sentence        → source: "artist:descriptionShort"
2. intentLine (whole, if ≤ 200 chars)      → source: "artist:intentLine"
3. preferredVisionAnalysis, first sentence → source: "vision:{model}"
4. null                                     → source: null
```

Emit both:

```json
"artism:gist": "…",
"artism:gistSource": "artist:descriptionShort"
```

`gistSource` uses the `vision:{model}` form with the actual model string (`vision:claude-fable-5`, `vision:moondream-station`) so a reader can weigh the sentence without a second request. This is the same provenance discipline applied everywhere else in the archive; it has simply not reached the triage layer.

Apply the existing `truncateAtBoundary` to steps 1 and 3. Do NOT truncate step 2 — see Part 5.

`preferredVisionAnalysis()` precedence is unchanged: higher-tier models outrank Moondream regardless of recency; among equal-tier analyses, the later entry wins.

---

## Part 4 — `artism:availableTiers` on every record

Tier number does not currently predict depth. `venice-biennale-2007` at Tier 4 returns less than `skulptur-projekte-m-nster-2007` returns at Tier 1. A machine has no way to know a rung is empty without spending a request on it.

Compute from **field presence, not `reasoningStatus`** — that field is known to be unreliable (see Part 10):

```typescript
{
  "1": true,                                  // always
  "2": Boolean(descriptionShort || intentLine || dominantColors?.length || tags?.length),
  "4": true,                                  // always — a record always exists
  "5": sessionCount > 0
}
```

Tier 3 is omitted from the object entirely (see Part 11). Do NOT emit `"3": false` — an absent key means "no such rung," a `false` value means "this rung exists but is empty for this work." The distinction matters.

Emit on index records, survey records, and Tier 4 records.

---

## Part 5 — Survey depth on the index

**Address:** `GET /api/corpus/index?depth=survey`

Combinable with all existing filters (`series`, `yearFrom`, `yearTo`, `status`, `hasVisionAnalyses`), which are confirmed working and must not be altered.

**No filter gate.** An unfiltered survey call is permitted and returns page 1 with a `nextPage` link. Pagination bounds the response; a "you must filter first" rule would only be discoverable by failing.

Survey record = index record, plus:

```json
"description": "…",                    // descriptionShort, whole
"artism:intentLine": "…",              // whole, NEVER truncated — see below
"artism:dominantColors": ["#87CEDC", "#2B2B2B"],
"keywords": "…",
"artism:recordUrl": "…",
"artism:visionPageUrl": "…",
"artism:sessionsUrl": "…"
```

**`artism:intentLine` is emitted whole or omitted entirely. Never truncated, under any circumstance.** Truncating a machine's description of a surface is lossy compression of something already approximate. Truncating the artist's account of their own intent mid-thought produces exactly the mangled fragments the gist fix was written to eliminate. If a given intent field is too long for survey depth, that is an argument for editing the field in Payload, not for slicing it at read time.

Note `artism:dominantColors` becomes a real array here. At Tier 4 it is currently a comma-joined string inside a `PropertyValue`. Leave Tier 4 as-is in this pass — changing it is a breaking change for existing consumers and belongs with the other data migrations.

`?depth=` accepts only `survey`. Any other value returns **400** with a JSON error body naming the accepted values. Do NOT silently fall back to Tier 1 — silent under-delivery is the exact failure `?tier=5` already exhibits and this spec exists partly to eliminate it.

---

## Part 6 — `artism:coverage` on list responses

Emitting artist-authored intent at survey depth introduces a selection-bias risk: works that have had sessions will read as richer, and an agent narrowing a set will preferentially select them. Documentation effort becomes a proxy for significance — structurally the same substitution the project exists to avoid, with attention swapped in for market price.

The mitigation is disclosure, not withholding. Every list response (index, survey, root feed) carries:

```json
"artism:coverage": {
  "matched": 60,
  "withArtistIntent": 4,
  "withVisionAnalysis": 58,
  "withSessions": 2,
  "reasoningComplete": 4
}
```

Counts describe the **matched set**, not the whole corpus, so a filtered response reports its own composition. `artism:totalArtworks` (whole corpus) stays alongside `artism:totalMatched` (this query).

---

## Part 7 — Tier 5 gets a real address

**Address:** `GET /api/corpus/[slug]/sessions`

Replaces the non-functional `?tier=5`. Path-based because sessions are a different artifact from a record — transcripts, not fields — not merely a deeper view of one.

Response shape per `sessions-tier5-machine-access-spec.md`, unchanged:

```json
{
  "@context": { "@vocab": "https://schema.org/", "artism": "<ARTISM_NS>" },
  "@type": "DataFeed",
  "artism:tier": 5,
  "artism:artworkSlug": "venice-biennale-2007",
  "artism:artworkUrl": "https://bernardbolter.com/venice-biennale-2007",
  "artism:recordUrl": "https://bernardbolter.com/api/corpus/venice-biennale-2007",
  "artism:coverage": { "sessionCount": 0 },
  "sessions": []
}
```

Rules:

- Only `status: completed` sessions. `in-progress` sessions are never exposed, unchanged from existing policy.
- Includes sessions where the slug is `primaryArtwork` **or** appears in `mentionedArtworks`.
- Zero sessions returns **200 with `"sessions": []`**, not 404. An empty rung is a fact about the archive; a 404 implies the address is wrong.
- Unknown slug returns **404**, matching existing per-record behaviour.
- `artistRecord` and `artism:DialogueSelfAudit` remain separate objects. Never merge or flatten them into one another.

**Retire `?tier=5` on `/api/corpus/[slug]`.** It must not remain as a silent no-op. Either 400 with a message pointing at the new path, or 308-redirect to it. Do NOT leave it returning a Tier 4 body.

---

## Part 8 — Make the record endpoint traversable

`/api/corpus/[slug]` currently has `artism:recordUrl` (pointing at itself) and `artism:visionPageUrl`, and nothing else. Add:

```json
"artism:indexUrl": "https://bernardbolter.com/api/corpus/index",
"artism:sessionsUrl": "https://bernardbolter.com/api/corpus/{slug}/sessions",
"artism:sessionsPageUrl": "https://bernardbolter.com/sessions?artwork={slug}",
"artism:tier": 4,
"artism:availableTiers": { … }
```

`artism:indexUrl` was specified in `corpus-api-restructure-spec.md` and never shipped. Verify rather than assume for every field in this block.

Also update the index's `sessionsUrl` to point at the API path, not the HTML page. Keep the HTML page as `artism:sessionsPageUrl` where a human-readable target is wanted. The distinction matters: a machine index should route machines to machine endpoints.

---

## Part 9 — Universal pagination envelope and tier map

### 9.1 Pagination

Ship the pagination contract on **every list response**, including where it will not activate for years. A consumer written today then handles pagination correctly forever, and adding it later is not a breaking change.

```json
"artism:page": 1,
"artism:perPage": 50,
"artism:totalPages": 1,
"artism:totalMatched": 216,
"artism:nextPage": null,
"artism:prevPage": null
```

- `nextPage`/`prevPage` are absolute URLs preserving all active params, or `null`.
- **Page numbers, not cursor tokens.** An opaque cursor is unreconstructable; `?page=3` is legible in 2226 and enumerable for the September snapshot. The corpus is append-mostly and low-churn, so the concurrency argument for cursors does not apply.
- Defaults: index `perPage=250` (one page today, contract present); survey `perPage=50`; root feed `perPage=25`, max 50.
- `?page` out of range returns 200 with an empty `dataFeedElement` and correct counts — not 404.

### 9.2 Root feed pagination

`/api/corpus` still returns all 216 records with full descriptions and full vision analyses in one response. It truncates silently for real consumers at roughly record 45. Paginate it per the above. Unpaginated `/api/corpus` returns page 1 with a `nextPage` link — never the whole corpus. Do NOT redirect or remove the URL; external references may exist.

### 9.3 Tier map

Every corpus response — list or record — carries a self-description block:

```json
"artism:tier": 1,
"artism:tierMap": {
  "1": { "url": "https://bernardbolter.com/api/corpus/index", "scope": "all works", "description": "triage — identity, series, gist" },
  "2": { "url": "https://bernardbolter.com/api/corpus/index?depth=survey", "scope": "filtered set", "description": "narrowing — description, intent, colors, keywords" },
  "4": { "urlTemplate": "https://bernardbolter.com/api/corpus/{slug}", "scope": "one work", "description": "full record — all fields, all vision analyses" },
  "5": { "urlTemplate": "https://bernardbolter.com/api/corpus/{slug}/sessions", "scope": "one work", "description": "session transcripts — how it came to be known" }
}
```

This is what makes the tier system discoverable at all. An agent arriving cold at any single corpus URL learns the whole ladder from that one response. Tier 3 is absent because it is not built (Part 11) — the map must describe what exists, not what was once drawn.

---

## Part 10 — `reasoningStatus` data correction

Not an API change, but it invalidates Part 4 if left alone.

`artism-vocabulary.md` defines three values — `stub`, `partial`, `complete` — and states that `complete` records carry stronger evidential weight for intent and process fields. `venice-biennale-2007` is `complete` with no `description`, no `intent`, no `formalContributionAssessment`, no `compositionalNotes`, no `dominantColors`, and no `visionAnalyses`. The data contradicts the published semantics.

1. Write a one-off script listing every artwork where `reasoningStatus === 'complete'` and `intent` is empty. Output slug + catalogue number. **Report the list — do not auto-correct.** The reclassification is the artist's call.
2. Confirm `partial` is reachable from the Art/Official envelope writer. It appears unused; if it cannot be written, that is the bug behind the bad `complete` values.

---

## Part 11 — Tier 3 deferred, not built

`/api/corpus/[slug]/reading` — the preferred vision analysis alone — is **not built in this pass**. No use case justified a permanent public URL. It remains cheap to add later.

Do NOT emit `"3"` in `availableTiers` or `tierMap`. Do NOT create a stub route. Do NOT reference tier 3 in `llms.txt` or documentation. The ladder is 1, 2, 4, 5 until a real need appears.

---

## Build order

1. `constants.ts` — `ARTISM_NS`, `CORPUS_BASE`. Set `Content-Type: application/ld+json` on all corpus routes.
2. Series `@id` + `CreativeWorkSeries` everywhere (Part 2) — do this before the index rewrite; the index depends on it.
3. Index JSON-LD conformance + key mapping + `urlTemplates` (Part 1).
4. `resolveGist()` + `gistSource` (Part 3).
5. `availableTiers` computation, shared helper used by all three response builders (Part 4).
6. `?depth=survey` on the index (Part 5).
7. `artism:coverage` on list responses (Part 6).
8. `/api/corpus/[slug]/sessions` (Part 7). Retire `?tier=5`.
9. Traversal links on the record endpoint (Part 8).
10. Pagination envelope on all list responses, including root feed (Part 9.1, 9.2).
11. `tierMap` on every response (Part 9.3).
12. `reasoningStatus` audit script (Part 10) — report only.

Steps 2 and 3 are the ones that matter most. If the pass has to stop early, stop after 5.

---

## Do NOT

- Do NOT emit any bare camelCase key in any corpus response after Part 1. Every key is a schema.org term or `artism:`-prefixed. This is the single rule the whole spec rests on.
- Do NOT hardcode the namespace URI anywhere except `constants.ts`.
- Do NOT let `?depth=` fall back silently on an unrecognised value. 400, with the accepted values named.
- Do NOT leave `?tier=5` returning a Tier 4 body. Retire it explicitly.
- Do NOT truncate `artism:intentLine`, ever, at any depth.
- Do NOT truncate `visionAnalyses` text anywhere, at any tier. Existing rule, still absolute.
- Do NOT auto-correct `reasoningStatus` values. Report and stop.
- Do NOT build a Tier 3 route or reference tier 3 in any map, doc, or `llms.txt` entry.
- Do NOT change `artism:dominantColors` at Tier 4 from its current comma-joined string form in this pass — that is a data migration.
- Do NOT touch catalogue numbers, `relatedWorksAtMaking`, `seriesHingeMarker`, or R2 image URLs. Separate spec.
- Do NOT remove or redirect `/api/corpus` or `/api/corpus/index`. Both are published entry points.
- Do NOT add auth, rate limiting, or API keys. Public commons endpoint by design.
- Do NOT write two independent route handlers that build records separately. One `buildCorpusRecord(artwork, tier)` with route handlers as thin wrappers — the `sessionsUrl` divergence between the index and the record endpoint is exactly what happens otherwise.

---

## Verification checklist

Run all of these against production after deploy. Paste raw output, do not summarise.

**JSON-LD conformance**
```bash
# Zero bare camelCase keys — should return nothing
curl -s 'https://bernardbolter.com/api/corpus/index' \
  | grep -oE '"(title|slug|catalogueNumber|seriesName|medium|year|reasoningStatus|gist|hasEditions|visionUrl|recordUrl|sessionsUrl)":' | sort -u
```
- [ ] Above returns empty
- [ ] Every index record has `@type` and `@id`
- [ ] `curl -sI …/api/corpus/index | grep -i content-type` → `application/ld+json`
- [ ] Paste the first index record in full

**Series identity**
```bash
curl -s 'https://bernardbolter.com/api/corpus/index' | grep -o '#series' | wc -l
```
- [ ] Feed `about` entries are `CreativeWorkSeries` with `@id` ending `#series`
- [ ] `isPartOf` on records references the identical `@id` string
- [ ] `Collection` no longer appears anywhere in the corpus output

**Gist provenance**
- [ ] Every record with a non-null `artism:gist` also has `artism:gistSource`
- [ ] At least one record shows `artist:descriptionShort` or `artist:intentLine` as source
- [ ] No gist ends mid-word

**Survey depth**
```bash
curl -s 'https://bernardbolter.com/api/corpus/index?depth=survey&series=megacities' | head -c 1200
curl -s -o /dev/null -w '%{http_code}\n' 'https://bernardbolter.com/api/corpus/index?depth=survey&series=megacities'
curl -s -o /dev/null -w '%{http_code}\n' 'https://bernardbolter.com/api/corpus/index?depth=nonsense'
```
- [ ] Survey returns `artism:tier: 2` and includes `description` / `artism:intentLine` where present
- [ ] `?depth=nonsense` returns **400**, not 200
- [ ] Unfiltered `?depth=survey` returns page 1 with a working `nextPage` URL
- [ ] No `artism:intentLine` value ends in `…`

**Tier 5**
```bash
curl -s 'https://bernardbolter.com/api/corpus/skulptur-projekte-m-nster-2007/sessions' | head -c 600
curl -s -o /dev/null -w '%{http_code}\n' 'https://bernardbolter.com/api/corpus/venice-biennale-2007/sessions'
curl -s -o /dev/null -w '%{http_code}\n' 'https://bernardbolter.com/api/corpus/not-a-real-slug/sessions'
curl -s 'https://bernardbolter.com/api/corpus/venice-biennale-2007?tier=5' | head -c 200
```
- [ ] Zero-session artwork → **200** with `"sessions": []`
- [ ] Unknown slug → **404**
- [ ] `?tier=5` no longer returns a Tier 4 body

**Traversal**
- [ ] `/api/corpus/[slug]` contains `artism:indexUrl`, `artism:sessionsUrl`, `artism:tier`, `artism:availableTiers`
- [ ] Index `sessionsUrl` (or template) points at `/api/corpus/{slug}/sessions`, not `/sessions?artwork=`
- [ ] Every URL emitted anywhere in the corpus resolves — no 404s. Script this across all 216 slugs.

**Pagination**
```bash
curl -s 'https://bernardbolter.com/api/corpus' | grep -o '"artism:nextPage":"[^"]*"'
curl -s 'https://bernardbolter.com/api/corpus' | grep -o '"@type":"VisualArtwork"' | wc -l
```
- [ ] Root feed returns ≤ 25 records with a working `nextPage`
- [ ] Following `nextPage` to the end reaches exactly 216 records with no duplicates
- [ ] `?page=9999` returns 200 with empty `dataFeedElement`

**Self-description**
- [ ] Every corpus response carries `artism:tier` and `artism:tierMap`
- [ ] `tierMap` contains exactly keys `1`, `2`, `4`, `5` — no `3`
- [ ] Every URL in `tierMap` resolves

**Coverage**
- [ ] `artism:coverage` present on index, survey, and root feed
- [ ] `matched` equals the number of records actually returned in the matched set
- [ ] `withArtistIntent` verified by hand against a Payload count for one series

**Report back**
- [ ] Full first index record, raw
- [ ] Full first survey record, raw
- [ ] Full `/api/corpus/skulptur-projekte-m-nster-2007/sessions` response, raw
- [ ] Response headers from `/api/corpus/index`, raw
- [ ] Output of the `reasoningStatus` audit script
- [ ] **Deviations from this spec.** If none, write "none" explicitly — do not omit this section.

---

## Final acceptance test

Open a fresh Claude chat. Give it only `https://bernardbolter.com/api/corpus/index` and nothing else. Without further URLs, it should be able to: identify the archive and its author; narrow to one series; deepen to survey on that series; open one full record; and reach that work's sessions — using only links and templates found in the responses.

If it cannot complete that chain unaided, the traversal layer is not finished regardless of what the checklist says.

---

*Corpus tier depth & traversal spec · July 28, 2026*
