# Corpus Tier-1 Index — Truncation & Payload Scope Fix

*Companion to `corpus-tier-system-brief.md` and `corpus-api-restructure-spec.md`. Written after a live audit of `https://bernardbolter.com/api/corpus/index`, July 16, 2026. Read alongside those two specs — this does not replace them, it corrects the current implementation against them.*

## Part 1 — What the audit found

The index endpoint is live and mostly correct: `@type: DataFeed`, `artism:tier: 1`, `artism:corpusVersion`, `artism:totalArtworks: 216` are all present, `reasoningStatus` correctly varies per record, and `gist` populates independently of full reasoning status (a stub record like `brandenburg-gate-1947-1961-2020` has a gist but null `descriptionShort` — exactly the "latest vision analysis, not hand-authored" behavior the tier spec called for).

Two problems:

1. **Truncation cuts mid-word**, producing fragments like `"...and the pict…"` and `"...dominate rather than support the…"`.
2. **The endpoint is Tier 1 in name only.** Per `corpus-tier-system-brief.md` Part 2, Tier 1 should carry title/series/year/catalogueNumber/reasoningStatus/gist at ~20–50 tokens per record. The live response also includes full `descriptionShort` and `intentLine` paragraph content on every complete record — that's Tier 2 content, riding along on a feed tagged `"artism:tier":1`. At 216 records this roughly doubles-to-triples payload size for no triage benefit, and it blurs the boundary the tier system exists to create.

There's also a small self-consistency bug: the feed's own `"url"` field reads `https://bernardbolter.com/api/corpus?format=index`, but the endpoint is served at `/api/corpus/index`. Pick one canonical path and make the field match it.

## Part 2 — Fix 1: truncation at word/sentence boundary

Wherever `gist`, `descriptionShort`, and `intentLine` are truncated for the index response, the current logic appears to be a hard character-count slice. Replace with a boundary-aware truncate:

```typescript
function truncateAtBoundary(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text

  // Prefer the last complete sentence within the limit
  const slice = text.slice(0, maxChars)
  const lastSentenceEnd = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('.\n')
  )
  if (lastSentenceEnd > maxChars * 0.5) {
    return slice.slice(0, lastSentenceEnd + 1)
  }

  // Fall back to last complete word
  const lastSpace = slice.lastIndexOf(' ')
  return slice.slice(0, lastSpace > 0 ? lastSpace : maxChars).trimEnd() + '…'
}
```

The 0.5 threshold avoids returning a tiny fragment when the nearest sentence end is too far back — in that case word-boundary truncation with a trailing `…` is preferable to an unnaturally short sentence.

Apply this function everywhere index-response text fields are shortened. Do NOT slice with `.slice(0, N)` directly anywhere in the index-building code path.

## Part 3 — Fix 2: trim Tier 1 payload to spec

Per the tier brief, `descriptionShort` and `intentLine` do not belong in the Tier-1 index response. Remove them from `/api/corpus/index` output entirely — they stay available at the per-slug record endpoint (Tier 3/4) via `recordUrl`.

Tier-1 record shape after this fix:

```typescript
{
  slug: string
  title: string
  catalogueNumber: string
  year: number
  series: string
  seriesName: string
  medium: string
  reasoningStatus: 'stub' | 'complete'
  hasEditions: string
  gist: string | null        // truncated per Part 2, ~150-200 chars
  url: string
  visionUrl: string
  recordUrl: string
  sessionsUrl: string
}
```

`gist` is the only prose field. It should still be truncated per Part 2 even though it's already meant to be short — some current gists (e.g. Skulptur Projekte Münster) run long enough to hit the same mid-word cutoff, so the fix applies here too, not just to the fields being removed.

## Part 4 — Fix 3: canonical URL consistency

Decide one canonical path — recommend keeping `/api/corpus/index` since that's what `corpus-api-restructure-spec.md` specifies and what's already live. Update the feed's own `"url"` field to match:

```typescript
"url": "https://bernardbolter.com/api/corpus/index"
```

Do NOT introduce a second query-param variant (`?format=index`) alongside the path-based one — one canonical address per the existing spec's discovery-wiring section.

## Do NOT

- Do not apply boundary-aware truncation only to newly-removed fields and skip re-checking `gist` — audit showed gist itself already has mid-word cutoffs.
- Do not leave `descriptionShort`/`intentLine` in the index response "for now" — every day they stay is a day the index is mislabeled as Tier 1 while carrying Tier 2 weight.
- Do not change the per-slug record endpoint (`recordUrl` target) — full `descriptionShort`, `intentLine`, and `visionAnalyses` stay there in full, untruncated, per the existing "never truncate visionAnalyses" rule in `corpus-api-restructure-spec.md`.
- Do not introduce a new truncation length constant without naming it clearly (e.g. `TIER1_GIST_MAX_CHARS`) so a future editor can find and adjust it.

## Verification checklist

- [ ] `curl https://bernardbolter.com/api/corpus/index` — no field ends mid-word or mid-sentence with a dangling `…` immediately after a partial word
- [ ] Response no longer includes `descriptionShort` or `intentLine` keys on any record
- [ ] Response payload size drops noticeably (rough gut check: should be well under half the current size given full paragraphs are removed)
- [ ] Feed's own `"url"` field reads `https://bernardbolter.com/api/corpus/index`, matching the actual request path
- [ ] Per-slug record endpoint (e.g. `/api/corpus/the-thinker`) still returns full, untruncated `descriptionShort`, `intentLine`, and `visionAnalyses`
- [ ] `artism:totalArtworks: 216` and `artism:tier: 1` still present and correct after the trim

---
*Corpus tier-1 index fix spec · July 2026*
