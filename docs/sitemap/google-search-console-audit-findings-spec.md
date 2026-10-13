# Google Search Console Audit — Findings & Fixes

*August 2026. Full audit of Search Console's "Why pages aren't indexed" report, all seven reason categories, cross-verified against live `curl` and fetch checks. Read alongside `sessions-filtered-view-canonical-fix-spec.md` (the one fix already speced separately — referenced, not duplicated, below).*

---

## Part 0 — Priority order

This spec covers seven findings. They are **not equal priority**. Fix in this order:

1. **Private/commerce field leak in artwork page hydration payload** — real, latent data-exposure risk. Fix first, regardless of what else is in progress.
2. **`/sessions?artwork={slug}` canonical fix** — already speced in `sessions-filtered-view-canonical-fix-spec.md`. Do that one next if not already done.
3. Everything else in this document — real but low-urgency polish, safe to batch into normal work.

No finding in this document requires taking the site down or blocking deploys. Only #1 has a "the longer this sits, the worse the eventual exposure" property; everything else is stable as-is.

---

## Part 1 — CRITICAL: Private/commerce fields present in public page source

### What was found

`curl -s https://bernardbolter.com/almadinat-alearabia | grep -o 'catalogued[^<]*'` returned, among other things, a large embedded JSON payload containing the artwork's **complete internal database record** — not just the fields rendered on the page. This includes:

```json
"askingPrice":"$undefined","salesRecord":"$undefined","consignmentDetails":"$undefined","totalRevenue":"$undefined"
```

These are exactly the fields `art-official-source-of-truth.md` designates as **blocked from chat-envelope writes by design** — private financial fields requiring the artist's own direct action in Payload admin, explicitly never meant to be machine-writable or, by clear implication, machine-*readable* by the public.

### Why this matters

The values are currently `"$undefined"` for this artwork, so nothing sensitive is exposed *today*. But:

- The **field names and full record shape are already public** on every artwork's main page — anyone running `curl` or view-source can see the complete internal schema, including which private fields exist and what shape they take.
- **The moment any artwork gets a real value** in `askingPrice`, `salesRecord`, `consignmentDetails`, or `totalRevenue` — which will happen, since these are real fields used for real business purposes — that value will leak into public page source the same way, silently, with no visible indication on the rendered page that anything is wrong.
- This directly contradicts the `/record` page's own stated promise: `nature-vs-nurture/record` explicitly renders the line *"Private commerce and provenance fields are omitted."* That filtering demonstrably works on `/record`. It is **not** happening on the main `/{slug}` artwork page — the single most-visited, most-crawled, most-shared route on the entire site.

### Root cause (most likely)

Next.js server components serialize their full props/data object into the page for client-side hydration — not just what's used in JSX. If the artwork page's data-fetching layer pulls the complete ORM/query result (all fields, including private ones) and passes that whole object down as props — even if the rendered JSX only ever reads `title`, `year`, `medium`, etc. from it — Next.js will still embed the entire object, private fields included, in the serialized payload shipped to every visitor's browser.

The `/record` route almost certainly already does field-selection correctly (hence its clean, filtered output) — the fix is to apply that same selection at the data-fetching layer for the main artwork page, not just the display layer.

### The fix

1. Identify where the main `/{slug}` artwork page fetches its data. Compare against whatever field-selection logic `/record` already uses correctly.
2. Apply an explicit **allowlist** (not a denylist) of public-safe fields at the query/fetch level for the artwork page — the same allowlist-not-denylist principle already established elsewhere in this codebase (see the homepage SSR spec's "Do NOT use a denylist `select`" rule — same logic applies here, with higher stakes).
3. Confirm the private fields (`askingPrice`, `salesRecord`, `consignmentDetails`, `totalRevenue`, and any others in the same "blocked from chat-envelope writes" category per `art-official-source-of-truth.md` Part 6 — including `insuranceValue`, `insuranceValueDate`) are excluded at the source, not filtered post-hoc in JSX.
4. Audit every other route that renders artwork data — `/{slug}/vision`, `/{slug}/record` (confirm it's actually clean, don't just assume), the corpus API endpoints, session pages that embed artwork context — for the same class of leak. This bug pattern (full object passed to a component that only displays part of it) is likely not unique to one route.

### Do NOT

- Do NOT patch this by hiding the fields in JSX only — the hydration payload issue exists independent of what's visually rendered.
- Do NOT assume `/record` is clean without directly verifying it the same way this was found (`curl` + search for the same field names).
- Do NOT treat this as low-priority because current values are `undefined` — the fix needs to land before any artwork gets a real sale price entered, not after.

### Verification checklist

- [ ] `curl -s https://bernardbolter.com/{any-slug} | grep -o 'askingPrice[^,]*'` returns nothing, or returns only a properly-`null`/omitted value with no chance of ever carrying real data
- [ ] Same check for `salesRecord`, `consignmentDetails`, `totalRevenue`, `insuranceValue`, `insuranceValueDate`
- [ ] Spot-check at least 3 other routes (`/vision`, `/record`, one `/api/corpus/*` endpoint) for the same leak pattern
- [ ] Confirm `/record`'s existing "Private commerce and provenance fields are omitted" claim is actually true at the data layer, not just the display layer
- [ ] Test with a real (test/dummy) value temporarily set in `askingPrice` on a non-public or staging record to confirm the fix actually prevents leakage, not just that it looks clean with all-undefined test data

---

## Part 2 — Already speced separately: sessions filtered-view canonical

`/sessions?artwork={slug}` currently canonicalizes to bare `/sessions`, hiding genuinely unique reciprocal cross-reference content (e.g. one session mentioning another artwork). Full spec, rationale, and fix already written — see `sessions-filtered-view-canonical-fix-spec.md`. Also includes a related "0 fields confirmed" display bug found on the same page. Not repeated here.

---

## Part 3 — Minor: generic OG description on `/bio`

`curl -s https://bernardbolter.com/bio | grep -o 'property="og:\(description\|url\)"[^>]*'` returns:

```
property="og:description" content="Biography of Bernard Bolter."
```

Every other page checked in this audit (artwork pages, session pages, vision pages, events pages) has a specific, content-derived meta description. `/bio`'s is generic boilerplate. Low priority, easy fix — pull the opening line or a representative excerpt from the bio content itself, same pattern already used elsewhere on the site.

---

## Part 4 — Thin content on stub-status pages (structural, not a bug)

Confirmed via direct fetch during the audit:

- `/{slug}/vision` pages with no vision analysis yet render only boilerplate (embeddings block + a fixed "What machines see" explainer paragraph, identical across every such page) — no unique text.
- `/{slug}/record` pages for stub-status artworks render minimal unique content (year, catalogue number, series, medium, "stub," "None yet").
- Stub-status main artwork pages (confirmed on several Digital City Series entries) show only title/year/medium/dimensions/edition-claim boilerplate — no description, intent, or making notes.

This is why Google Search Console's "Crawled – currently not indexed" bucket contains roughly 60–80 of its 101 pages: near-duplicate content across dozens of pages reads as low-value to Google's indexer.

**This is not a code bug** — it's an accurate reflection of real cataloguing progress (per the corpus's own `artism:coverage` stats, the large majority of the 217 artworks are still `stub` status). It will shrink naturally as more Art/Official sessions run. No urgent fix required.

**One real, optional lever, if reducing crawl-budget waste is worth the effort:** apply `noindex, follow` (not `noindex, nofollow`) to `/vision` and `/record` pages specifically when the underlying artwork has no vision analysis / is stub status — so Google stops re-evaluating and re-flagging genuinely-not-ready pages as failures, while still following the links on them to discover connected content. Do NOT apply this to the main `/{slug}` artwork page even when stub — that page still has real value (image, title, series, dimensions) worth indexing even before full cataloguing.

---

## Part 5 — Orphan page: `/events/*` not linked from crawlable navigation

Confirmed: `/events/pecha-kucha-amsterdam-vol-9-mediamatic-2009` is genuinely rich, unique, well-written content (with a real artist pull-quote) — not a thin-content case at all. But it isn't referenced anywhere in `llms.txt`, the homepage, or any artwork page fetched during this audit. One `/events/` page (`megacities-2020`) does appear in Search Console's indexed set, so *some* events pages are reachable somehow — but the linking path isn't obvious or systematic.

**Fix:** link `/events/*` pages from somewhere durable and crawlable — the CV page is the natural fit, since these read as exhibition/performance history entries. Also worth adding an `/events` collection reference to `llms.txt`'s "Other collections" list, alongside Bio and Statement, so agents following the documented traversal path can find them too.

---

## Part 6 — Confirmed non-issues (no action needed)

For completeness, these were checked directly during the audit and found to be working as intended — listed so they aren't mistakenly re-investigated later:

- **`www.` / `http://` redirects to canonical `https://bernardbolter.com/`** — correct, expected SEO hygiene.
- **`/contact?claim={slug}&copy=N/3`** — correctly canonicalized to bare `/contact`; params are edition-copy identifiers with no server-rendered content variation, so deduplication is correct, not a lost-content case (unlike the `/sessions?artwork=` case in Part 2).
- **`/{slug}/embedding` → `/{slug}/vision` redirect** — confirmed real and correct; legacy route name, working 301.
- **Five URLs flagged as "Server error (5xx)"** (`/antiquity/vision`, `/color-theory/vision`, `/api/corpus/color-vortex`, `/api/corpus/powell-street-1895-v1`, `/schonhauser-tor-2018`) — all confirmed working now. Four clustered on Aug 1, 2026 (likely a single transient deploy/restart event); one isolated on Jun 27. No code fix indicated; worth a quick server-log check around Aug 1 only if the pattern recurs.
- **9 "Not found (404)" WordPress-era `/artwork/{slug}/` URLs** — 7 are old permalinks for artworks that exist under the new URL structure (self-resolving as Google forgets the old paths); 2 (`business-is-business`, `world-war-one`) reference real artworks not yet stubbed in Payload — confirmed as known cataloguing backlog, not a technical issue. Note: `world-war-one` likely corresponds to "the war paintings" already referenced in two existing session transcripts (The Thinker's and Venice in the Middle's) — worth checking those for any usable source material when it's time to stub it.
- **Sitemap completeness** — confirmed via direct `curl` that `/statement`, all 5 throughline pages, all 15 series pages, and multiple bio entries are present in `sitemap.xml`. The "Discovered – currently not indexed" bucket (46 pages, all "Last crawled: N/A") is normal crawl-budget/queue timing on an actively growing site, not a sitemap gap.
- **451 pages already indexed**, confirmed via Search Console's indexed-pages report, spanning every major content type (artwork pages, `/record`, `/vision`, session pages by both slug and UUID, series pages, bio entries, throughlines, CV, contact, homepage). 9 of 15 series pages already indexed; the remaining 5 (Digital City Series, Installations, Mediums of Perception, OG Oil Paintings, Performances) are mid-queue — worth a manual "Request Indexing" nudge in Search Console rather than fixing anything.

---

## Do NOT (consolidated, full audit)

- Do NOT treat Part 1 (private field leak) as equal priority to the rest of this document — it is the one item with a worsening-over-time property and should ship first.
- Do NOT apply the Part 4 `noindex` treatment to main `/{slug}` artwork pages, even stub-status ones — only to `/vision` and `/record` sub-pages when genuinely empty.
- Do NOT re-investigate anything listed in Part 6 — already confirmed working, re-checking wastes time better spent on Parts 1–5.
- Do NOT stub `business-is-business` or `world-war-one` as a reaction to this audit — that's a content/cataloguing decision on the artist's own timeline, not a technical fix.

---

## Verification checklist (whole document)

- [ ] Part 1: private field leak fixed and verified per its own checklist above — **do this first**
- [ ] Part 2: confirm `sessions-filtered-view-canonical-fix-spec.md` is done or in progress
- [ ] Part 3: `/bio` og:description updated to something content-specific
- [ ] Part 4: decision made (and implemented if yes) on whether `noindex, follow` is worth applying to empty `/vision`/`/record` pages
- [ ] Part 5: `/events/*` linked from CV and/or `llms.txt`
- [ ] Manually request indexing (Search Console → URL Inspection) for the 5 not-yet-indexed series pages

---

*Google Search Console audit findings · August 2026*
*Read alongside: sessions-filtered-view-canonical-fix-spec.md, session-transcript-progressive-disclosure-spec.md, art-official-source-of-truth.md*
