# Corpus Performance — Cursor Implementation Spec

*July 28, 2026. Third in sequence after `corpus-tier-depth-and-traversal-spec.md` and `corpus-traversal-patch-spec.md`.*

**Scope:** response latency, edge caching, payload size, artwork page weight.
**Out of scope:** schema shape, tier addressing, vocabulary. Those are settled and verified — do NOT change any field name, tier address, or response structure in this pass.

---

## Why

Cross-model traversal testing found that Claude could read the corpus and ChatGPT, Gemini, and Copilot could not. After eliminating content-type, bot blocking, and search-index mediation as causes, the actual measurements:

| URL | HTTP | Bytes | TTFB | Agent fetch |
|---|---|---|---|---|
| `/api/corpus/basel-switzerland` | 200 | 21 KB | **0.88s** | ✅ succeeds |
| `/api/corpus/index` | 200 | 121 KB | **6.71s** | ❌ fails |
| `/api/corpus` | 200 | 83 KB | **7.36s** | ❌ fails |
| `/venice-in-the-middle` | 200 | **929 KB** | 2.55s | ❌ fails |

The only URL an external agent could retrieve is the only one answering in under a second. Most agent fetch layers time out at 5s or less. Everything is functionally correct and most of it is unreachable.

**The key diagnostic: latency is not proportional to record count.** The 25-record bulk feed (7.36s) is slower than the 216-record index (6.71s), while a single record returns in 0.88s. There is a fixed ~6s cost in the list path that exists regardless of how many records are returned.

This means pagination alone will not fix it. `/api/corpus` is *already* paginated to 25 records and still times out.

---

## Fix 1 — Eliminate the fixed cost in the list path *(root cause — do this first)*

### 1.1 Profile before changing anything

Instrument the list handlers and log per-request:

- number of SQL queries issued
- total DB time vs. serialisation time
- time to first row vs. time to complete set

Report the numbers before making changes. A guess that happens to help is worse than a measurement, because it leaves the real cost in place for the next person.

### 1.2 Prime suspect: per-record session counts

`artism:availableTiers` requires `sessionCount > 0` per artwork. If that is a separate query per record, the index issues 216 round trips to Neon, and does so across the whole corpus *before* pagination slices the result.

This matches the observed profile exactly: flat latency regardless of page size, fast on a single record. It is also new — introduced by the tier spec — which makes it the most likely regression.

**Fix:** one aggregate query for the whole set, joined in memory.

```sql
SELECT primary_artwork_id, COUNT(*) AS session_count
FROM sessions
WHERE status = 'completed'
GROUP BY primary_artwork_id;
```

Same for `mentionedArtworks` if that relation is also consulted per-record. Build a `Map<artworkId, count>` once per request and look up from it.

The same applies to any other per-record computed field: vision analysis presence, embedding presence, series lookup. **No field on a list record may issue its own query.**

### 1.3 Paginate before populating, not after

If the handler fetches all published artworks and then slices, every request pays the full-corpus cost no matter what page was asked for. Apply `limit`/`offset` at the database layer.

### 1.4 Limit field selection

Tier 1 needs roughly ten fields. If Payload is populating full documents with all relationships and then discarding, use `select` to fetch only what the tier emits. Set relationship `depth` to the minimum each tier requires — Tier 1 needs series slug and name only, not the full series document.

**Target: list endpoints under 1.5s TTFB uncached.** Caching (Fix 2) then makes them fast; it must not be used to hide a slow query, because the first request after every purge pays full cost, and that request is often a crawler.

---

## Fix 2 — Edge caching for `/api/corpus/*`

`cf-cache-status: DYNAMIC` on every corpus endpoint. Cloudflare is caching nothing. The `s-maxage=60` in the response header is inert — Cloudflare does not cache API responses without an explicit Cache Rule.

Every request therefore reaches Netcup and runs a live Neon query.

### 2.1 Cloudflare Cache Rule

Dashboard → **Caching → Cache Rules** → create:

- **Match:** `(http.request.uri.path contains "/api/corpus")`
- **Action:** Eligible for cache
- **Edge TTL:** 300s (override origin)
- **Browser TTL:** 0 — always revalidate, so a purge is immediately visible to humans
- **Cache key:** include query string. Required, or `?depth=survey`, `?series=`, and `?page=` all collapse to one cached object. This is the failure mode investigated and ruled out earlier in this work; do not reintroduce it.

**Tradeoff, artist's call:** at 300s, edits take up to five minutes to appear. The archive changes a few times a week and reads dominate, so this is the right default — but during an active cataloguing session it will feel wrong. 60s still fixes the agent timeout if instant feedback matters more. Do not go below 30s; below that the cache stops absorbing crawler bursts, which is the main thing it is for.

### 2.2 Purge on publish

A Payload `afterChange` hook on Artworks and Sessions that purges the affected URLs via the Cloudflare API — the specific record, the index, and the bulk feed page containing it. Purge by URL if tag-based purging is not available on the current plan.

There is an existing `corpus-caching-spec.md` in the project. **Read it first** and determine whether this was specified and never implemented, or implemented and later disabled. Report which.

### 2.3 Verify it is actually caching

`cf-cache-status` must read `HIT` on a second request. If it stays `DYNAMIC`, the rule did not match — check path syntax and rule ordering.

---

## Fix 3 — Activate index pagination

Currently `perPage: 250`, so all 216 records return in one 121 KB response with `totalPages: 1`.

**Change the index default to `perPage: 50`.** Page 1 lands near 28 KB, comfortably inside every fetcher's limit. The pagination contract is already built, tested, and verified live — this is a one-constant change.

Keep the bulk feed at 25 and survey at 50, both unchanged.

**Do NOT remove or rename `/api/corpus/index`,** and do not alter the pagination field names. Both are published entry points and any consumer written against them must keep working.

Note honestly: this fixes payload size, not latency. It is necessary but not sufficient. Fix 1 is what makes the endpoint fast.

---

## Fix 4 — Artwork page weight

`/venice-in-the-middle` serves **929 KB of HTML**. That is near the 1 MB ceiling several agent fetchers enforce, and it is poor on mobile data irrespective of any bot.

### 4.1 Find out what it is before changing anything

```bash
curl -s 'https://bernardbolter.com/venice-in-the-middle' | wc -c
curl -s 'https://bernardbolter.com/venice-in-the-middle' | grep -o 'self.__next_f.push' | wc -l
curl -s 'https://bernardbolter.com/venice-in-the-middle' -o /tmp/vitm.html && \
  python3 -c "
import re
h = open('/tmp/vitm.html').read()
scripts = ''.join(re.findall(r'<script[^>]*>(.*?)</script>', h, re.S))
print('total', len(h))
print('inline script', len(scripts))
print('markup', len(h) - len(scripts))
"
```

Likely candidates, in order of probability:

1. **RSC flight payload** — Next.js App Router serialises server component data into inline `<script>` tags. If the page loads full vision analyses, all sessions, and full embedding vectors, all of it is inlined twice: once as rendered HTML, once as flight data.
2. **Embedding vectors in the client bundle** — 768 floats per embedding is ~15 KB as JSON. If several are passed to a client component, that is 50–100 KB of numbers no reader ever sees.
3. **Full session transcripts inlined** rather than linked.

### 4.2 Fix by moving data server-side

The rule: any data used only for server rendering must not cross into a client component, or it gets serialised into the flight payload.

- Embedding vectors: never pass raw arrays to client components. Pass computed similarity scores only. The full vectors already have their own endpoint.
- Session transcripts: link to `/api/corpus/{slug}/sessions`, do not inline. The link now exists (verified) — the content should not also be embedded.
- Vision analyses: render the preferred one; link the rest.

**Target: under 150 KB.** Report the before and after numbers.

**Do NOT** solve this by removing visible content or by lazy-loading the API links added in the previous patch. Those links must stay in the initial server-rendered HTML.

---

## Fix 5 — Byte trims *(optional, do last)*

The tier pass increased per-record size from 532 to 562 bytes — `urlTemplates` saved less than JSON-LD conformance cost. Three cheap reductions, roughly 20 KB across the index:

1. `artism:availableTiers` as `[1,2,4,5]` instead of an object of booleans — ~40 bytes/record. **Only if** the absent-vs-false distinction is preserved: an array lists what is available, absence from the array means unavailable, and tier 3 simply never appears. This preserves the semantics established in the tier spec.
2. `identifier` as a plain string rather than a `PropertyValue` block — schema.org permits `Text` on `identifier`. ~50 bytes/record. Loses the `propertyID: artism:catalogueNumber` annotation, so only do this if the vocabulary documents that `identifier` on a `VisualArtwork` is the catalogue number.
3. `@id` and `url` are byte-identical on every record. `@id` is required; `url` is arguably redundant. **Recommend keeping both** — `url` is what naive consumers read, and this is not worth breaking for 60 bytes.

Do 1 and 2 only if Fixes 1–4 are complete and verified.

---

## Build order

1. Profile the list path and report numbers (1.1)
2. Eliminate per-record queries (1.2), paginate at DB layer (1.3), limit selection (1.4)
3. Re-measure. **Uncached list endpoints must be under 1.5s before proceeding.**
4. Cloudflare Cache Rule + purge hook (Fix 2)
5. Index `perPage` → 50 (Fix 3)
6. Artwork page audit and reduction (Fix 4)
7. Byte trims (Fix 5) — optional

Do not skip step 3. Caching a slow endpoint means every purge hands a 7-second response to whichever crawler arrives first.

---

## Do NOT

- Do NOT change any field name, tier address, response shape, or vocabulary term. Those are verified live and settled.
- Do NOT use caching to mask a slow query. Fix the query first.
- Do NOT configure the Cache Rule to ignore query strings.
- Do NOT set Browser TTL above 0 — it prevents purges reaching humans.
- Do NOT remove or rename `/api/corpus/index`, or change pagination field names.
- Do NOT lazy-load or client-render the `/api/corpus/*` links on artwork pages. Server-rendered HTML only.
- Do NOT reduce artwork page weight by removing visible content.
- Do NOT reintroduce `hasEditions`, `title`, `seriesName`, or any bare camelCase key.
- Do NOT touch catalogue numbers, escaped-JSON relations, or R2 image URLs. Still a separate spec.

---

## Verification

```bash
echo "— latency and size —"
for u in \
  'api/corpus/index' \
  'api/corpus/index?page=2' \
  'api/corpus/index?depth=survey&series=megacities' \
  'api/corpus/basel-switzerland' \
  'api/corpus/basel-switzerland/sessions' \
  'api/corpus' \
  'venice-in-the-middle' ; do
  printf '%-46s ' "$u"
  curl -s -o /dev/null -w 'http=%{http_code} bytes=%{size_download} ttfb=%{time_starttransfer}s\n' \
    "https://bernardbolter.com/$u"
done

echo "— cache status (run twice) —"
curl -sI 'https://bernardbolter.com/api/corpus/index' | grep -i 'cf-cache-status'
curl -sI 'https://bernardbolter.com/api/corpus/index' | grep -i 'cf-cache-status'

echo "— query string is part of the cache key —"
curl -s 'https://bernardbolter.com/api/corpus/index?series=megacities' | grep -o '"artism:totalMatched":[0-9]*'
curl -s 'https://bernardbolter.com/api/corpus/index' | grep -o '"artism:totalMatched":[0-9]*'

echo "— pagination —"
curl -s 'https://bernardbolter.com/api/corpus/index' | grep -oE '"artism:(page|perPage|totalPages|totalMatched|nextPage)":("[^"]*"|[0-9]+|null)'
```

- [ ] All list endpoints under **1.5s TTFB uncached**, under **0.3s cached**
- [ ] `/api/corpus/index` page 1 under **40 KB**
- [ ] `/venice-in-the-middle` under **150 KB**
- [ ] `cf-cache-status` reads `HIT` on second request
- [ ] Filtered and unfiltered index return different `totalMatched` — query string is in the cache key
- [ ] Index reports `totalPages: 5`, working `nextPage`
- [ ] Following `nextPage` to the end yields exactly 216 records, no duplicates
- [ ] Editing an artwork in Payload updates the API within the configured TTL
- [ ] Zero bare camelCase keys (regression check)
- [ ] `?depth=nonsense` still 400, sessions endpoints still 200/404 (regression check)

**Report back:** the before/after profiling numbers from 1.1, the artwork page composition breakdown from 4.1, and whether `corpus-caching-spec.md` was previously implemented. If no deviations, write "none" explicitly.

---

## Then re-run the cross-model test

Once verified, repeat the traversal test on ChatGPT, Gemini, and Copilot from `https://bernardbolter.com/api/corpus/index`.

This is the acceptance test. Everything in this spec exists because three of four models could not read the archive. If they still cannot after these fixes, the diagnosis was wrong and the numbers above will say so.

Worth making this a recurring check — four models, one prompt, twice yearly, alongside the September snapshot. Fetcher behaviour drifts, and a single vendor succeeding while three fail is a fact about the archive's reach that no local measurement reveals.

---

*Corpus performance spec · July 28, 2026*
