# Page Weight Reduction — Cursor Implementation Spec

*July 30, 2026. Follows the corpus API work (`corpus-tier-depth-and-traversal-spec.md`, `corpus-traversal-patch-spec.md`, `corpus-performance-spec.md`), which is complete and verified.*

**Scope:** HTML and RSC payload weight on frontend routes.
**Explicitly out of scope:** anything under `/api/corpus/*`. Those endpoints are conformant, fast, cached, and verified. Do NOT touch them in this pass.

---

## Why

Measured live on `608bddf`:

| Route | Bytes |
|---|---|
| `/` | 1,535,620 |
| `/series/megacities` | 1,536,459 |
| `/basel-switzerland` | 952,334 |
| `/venice-in-the-middle` | 906,733 |
| `/yugograd` | 850,212 |
| `/stern-grove-1` | 837,823 |
| `/bio` | 422,631 |

Investigation found **four independent causes**, not one:

| Cause | Cost | Affects |
|---|---|---|
| Timeline tick DOM | ~1,100 KB | `/`, `/series/*` |
| Layout catalogue in RSC flight | ~319 KB | every route |
| Depth-3 nested artwork docs | ~319 KB | every `/[slug]` |
| `primaryImage` as full Media doc | ~130 KB of the 319 | every route |

An artwork page is roughly two-thirds data it does not use.

Each phase below deploys **separately**, with measurement between. Two previous rounds in this project optimised against numbers that turned out to measure something other than assumed; the phase gates exist to catch that early.

---

## Phase 1 — Timeline ticks as CSS gradient

**Largest single win. No data changes. Deploy alone.**

`generateSmallLines` emits 8,500–9,000 one-pixel `<div>`s across a ~172,000px strip, carrying ~522 KB of inline `style=` attributes. They are decorative — non-interactive, no event handlers, no measurement role.

Replace with a `repeating-linear-gradient` background on the timeline strip:

```css
.artworks-timeline__ticks {
  background-image: repeating-linear-gradient(
    to right,
    var(--tick-color) 0 1px,
    transparent 1px var(--tick-spacing)
  );
}
```

Read the current values out of `generateSmallLines` — spacing, colour, opacity, height, vertical offset — and reproduce them exactly. Do not guess; the constants are in the existing code.

**Before deleting anything, report:**

1. Do all ticks share identical styling, or do some vary (taller marks at decade boundaries, colour shifts, opacity gradients)? If there is variation, describe it — a single gradient cannot express per-tick variance and the approach needs adjusting.
2. Is any tick element referenced by JS — scroll position calculation, drag targets, `querySelector`, refs?
3. Are the larger year/decade markers produced by `generateSmallLines` or by a separate function? Those are labelled and must stay as DOM.

If ticks vary or are read by JS, **stop and report before proceeding.**

**Do NOT** remove the labelled year markers, change timeline scroll geometry or total strip width, or alter drag/wheel/arrow behaviour.

**Target:** `/` under 450 KB. Artist reviews visually before Phase 2 — this is a graphic element and the check is whether it looks the same.

---

## Phase 2 — Remove unused nested artwork documents from `/[slug]`

`ARTWORK_PAGE_DEPTH = 3` populates `creator → bioTimelineEntries / statementThroughlines → linkedArtworkSlugs` as complete Artwork documents including DCS media. Six extra full documents per page, ~319 KB combined.

Confirmed: **nothing under `components/artwork/*` reads `linkedArtworkSlugs` or `bioTimelineEntries`.** They are fetched, serialised, shipped, and discarded. Linked works are rendered on `/bio/entries/[slug]` and `/statement/throughlines/[slug]`, which fetch separately.

**Approach — read this before writing code.** This is the exact fetch that caused the `capturePhotos` 500 in `3283f01`. That regression came from applying a **denylist** `select` (`{ field: false }`), which broke Payload's join hydration for `dcs.captureJourney.capturePhotos`.

Therefore:

- **NEVER use denylist select on `getPublishedArtworkForPage`.** Not for one field, not "just this once."
- Prefer reducing `ARTWORK_PAGE_DEPTH` from 3 to 2, or restructuring the creator fetch, over any select on the page query.
- If a select is unavoidable, it must be an **allowlist** (`{ field: true }`), and the DCS join fields must be explicitly included and verified against a DCS artwork.

**Verify against a DCS artwork specifically** — `basel-switzerland` — since that is where the join lives. A watercolour rendering fine proves nothing.

**Report:** which mechanism you used, why, and confirmation that `basel-switzerland`, `venice-in-the-middle`, `stern-grove-1`, and `yugograd` all return 200 with visually unchanged content.

**Target:** artwork pages under 550 KB after Phase 1.

---

## Phase 3 — Trim catalogue fields

`CATALOGUE_ARTWORK_SELECT` currently ships ~1.5 KB per artwork × 214 = ~319 KB on every route.

### 3.1 `primaryImage` is the single largest cost

~608 bytes/entry, ~130 KB total — 41% of the catalogue. It currently serialises the full Media document: `id`, `alt`, `createdAt`, `updatedAt`, `url`, `thumbnailURL`, `filename`, `mimeType`, `filesize`, `width`, `height`, `focalX`, `focalY`, plus a nested `sizes.thumbnail` object with its own five fields.

Consumers need: **`url`, `width`, `height`**, and `alt` if it is actually rendered.

Reduce to those fields only. Confirm whether `alt` and `thumbnailURL` are read anywhere before dropping them — check the grid, timeline, and slideshow components.

Same treatment for `posterImage` (currently null across the measured set, but shaped identically).

### 3.2 Drop unused fields

Confirmed fetched and never read on the client:

- `status` — only used in the fetch `where` clause, not needed in the payload
- `yearCompleted`
- `dateDisplay` — `getArtworkDisplayLabel` exists but is never called

### 3.3 Dead code

`useFormattedArtworks` is never imported. Remove it.

**Do NOT** remove any field used by the physically-scaled grid: `widthPx`, `heightPx`, `widthMm`, `heightMm`, `aspectRatio`, `measurementType`, `sizeTier`, `orientation`. Grid packing needs all of them, and the size-representation logic is a core design principle of this site.

**Target:** catalogue under 200 KB, so ~120 KB off every route.

---

## Phase 4 — Series page SSR *(separate deploy, after Phases 1–3 are verified)*

`SeriesPageInit` applies the series filter in a client `useEffect`. First SSR paints the default timeline with the **full** filtered set, so `/series/megacities` server-renders all 216 artworks and only becomes a Megacities page after hydration.

This is primarily a **correctness** problem, not a performance one. Every crawler and every non-JS agent reads each series page as containing the entire archive. Series is the primary organising structure of the practice, and the corpus API now exposes series as properly linkable `CreativeWorkSeries` nodes with stable `@id`s — the HTML currently contradicts the JSON.

**Fix:** `/series/[slug]` fetches its own series-scoped artwork set server-side and renders it directly, rather than fetching everything and filtering after hydration.

**Do NOT** break: view toggle, filters within a series, the back-to-all navigation path, or the physically-scaled grid's relative scaling within the series set.

**Report:** confirm `curl -s 'https://bernardbolter.com/series/megacities' | grep -c 'timeline__artwork'` returns approximately the series count, not ~214.

---

## Phase 5 — Provider split *(deferred — design only, do not implement)*

The catalogue currently loads in the root layout, so `/bio`, `/statement`, `/cv`, `/contact`, `/sessions`, and every `/[slug]` carry ~319 KB (or ~200 KB after Phase 3) they never use.

The persistence requirement and the data cost are separable:

**Root layout — state only (~100 bytes):**
- active series filter, availability filter, search string, sort order, view mode
- persists across navigation, which is the behaviour to preserve

**Root layout — slim lookup (~9 KB):**
- `useMenuPlusColor` needs slug → seriesSlug for 216 works
- a plain map, not the catalogue

**Route-level — full catalogue:**
- `/` and `/series/[slug]` only, the routes that actually render collections

Report the feasibility of this split, but implement nothing in this pass. Phases 1–3 deliver most of the benefit at far lower risk, and this is a route-group restructure.

---

## Do NOT

- Do NOT touch `/api/corpus/*`. Verified and complete.
- Do NOT use denylist `select` (`{ field: false }`) anywhere, on any Payload query. Allowlist only. This caused a site-wide 500 in `3283f01`.
- Do NOT remove grid sizing fields — `widthPx`, `heightPx`, `widthMm`, `heightMm`, `aspectRatio`, `measurementType`, `sizeTier`, `orientation`.
- Do NOT change timeline scroll geometry, total strip width, or drag/wheel/arrow behaviour.
- Do NOT remove labelled year/decade markers from the timeline.
- Do NOT implement Phase 5.
- Do NOT combine phases into one deploy. Each phase deploys and is measured separately.
- Do NOT change corpus API field selection, tier addressing, or vocabulary.

---

## Verification

Run after **each** phase, not only at the end:

```bash
for u in '' 'series/megacities' 'venice-in-the-middle' 'basel-switzerland' \
         'stern-grove-1' 'yugograd' 'bio' 'statement' 'cv' ; do
  printf '%-26s ' "/$u"
  curl -s -o /dev/null -w 'http=%{http_code} bytes=%{size_download} ttfb=%{time_starttransfer}s\n' \
    "https://bernardbolter.com/$u"
done
```

Regression checks — these must not change:

```bash
curl -s 'https://bernardbolter.com/venice-in-the-middle' | grep -o 'href="[^"]*api/corpus[^"]*"'
curl -s -o /dev/null -w 'corpus=%{http_code} %{size_download} %{time_starttransfer}s\n' \
  'https://bernardbolter.com/api/corpus/index'
curl -s 'https://bernardbolter.com/api/corpus/index' | grep -o '"artism:tier":[0-9]*'
```

- [ ] **Phase 1:** `/` and `/series/*` under 450 KB; timeline visually unchanged (artist review); scroll, drag, wheel, arrows all work; year markers present
- [ ] **Phase 2:** artwork pages under 550 KB; `basel-switzerland` (DCS) renders correctly; no 500s on any of the four test slugs
- [ ] **Phase 3:** all routes down a further ~120 KB; grid sizing visually unchanged; search, filter, sort, slideshow all work
- [ ] **Phase 4:** `/series/megacities` server-renders only Megacities works
- [ ] Corpus API links still present on artwork pages
- [ ] `/api/corpus/index` unchanged at ~31 KB, tier 1

**Report after each phase:** measured before/after for every route in the table, plus any deviation from this spec. If none, write "none" explicitly.

---

## Expected outcome after Phases 1–3

| Route | Now | Target |
|---|---|---|
| `/` | 1,536 KB | ~300 KB |
| `/series/megacities` | 1,536 KB | ~300 KB |
| `/basel-switzerland` | 952 KB | ~430 KB |
| `/stern-grove-1` | 838 KB | ~400 KB |
| `/bio` | 423 KB | ~300 KB |

Estimates, not commitments — report actuals.

---

*Page weight reduction spec · July 30, 2026*
