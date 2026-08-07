# Homepage Gateway Fix — SSR-Everything + Post-Hydration Virtualization
*August 2026. Follows the corpus API work and page weight reduction pass (`page-weight-reduction-spec.md`). Read alongside `sitemap-and-open-items-brief.md` (the cross-agent reachability constraints this directly serves).*

---

## Part 0 — Why, and what this deliberately overrides

Live testing confirms: of 217 artworks on the homepage, only the ~6 most recent render real title text in raw server-rendered HTML. Every other item has a correct `href` to the right slug, but the visible anchor text is the literal string "loading…", permanently, for anything that reads the page once and doesn't run JS — search crawlers, `curl`, and any fetch tool that reads static output rather than a live browser session.

This is very likely a live-browser-only symptom: **all 217 real hrefs are present**, which rules out a data-fetching failure and points instead to a **virtualized list rendering only what's in the current viewport**, with everything else stubbed to a placeholder to preserve scroll height. That's a legitimate technique for a live browser tracking scroll position. It's the wrong technique applied to the *initial server render* — a crawler never scrolls, so anything below the fold at first paint stays a placeholder forever.

**The standing rule going forward, for this fix and anything built after it:** any content that constitutes the *identity* of a piece — title, URL, core descriptive text — must be present in the raw server-rendered HTML, testable by viewing the page with JavaScript disabled. Purely interactive behavior layered on top of already-present content (hover states, a unit toggle, scroll-triggered animation) is fine to keep client-side. This spec is the concrete application of that rule to the homepage; it should also govern any future work on `/series/[slug]`, the vision page's analysis list, or anywhere else a list of items renders.

**Do NOT** treat this as a data problem. Do NOT touch `/api/corpus/*` — unrelated, verified working. Do NOT re-fetch artwork titles from a different source than whatever `CATALOGUE_ARTWORK_SELECT` already provides — per `page-weight-reduction-spec.md` Phase 3, `title` is already part of the trimmed catalogue payload; this is very likely a rendering-order bug, not a missing-field bug.

---

## Part 1 — Diagnose before fixing

**Step 1 — Confirm the hypothesis.** Check whether the full title data for all 217 artworks is present in the page's embedded `__NEXT_DATA__` (or equivalent RSC payload) even though the *visible* anchor text is truncated to a placeholder for most items. Two possible findings, and they lead to different fixes:

- **Titles are in the payload, just not rendered as visible text** → confirms this is a rendering/virtualization bug. Proceed to Part 2.
- **Titles are genuinely missing from the initial payload for most items** → different, larger problem (a data-fetching issue, not rendering). Stop and report back before proceeding; do not attempt Part 2 against this cause.

**Step 2 — Identify the virtualization mechanism currently in use** (custom implementation, or a library). Confirm whether it's already React-aware (built to cooperate with hydration/reconciliation) or a raw DOM-manipulation approach — this affects which fix in Part 2 is safe.

---

## Part 2 — Fix: SSR everything, virtualize after hydration only

**Target behavior:** the server response contains all 217 real titles and real links, fully rendered, with no placeholder text anywhere in the raw HTML. After the page hydrates in an actual browser, apply virtualization that manages the *live* DOM from that point forward — pruning off-screen items and re-mounting them on scroll — without ever affecting what a non-JS reader receives.

**Approach:**

1. Server-render the complete list — all 217 items, real title, real href, real thumbnail — with no conditional stub logic based on viewport or index position at render time.
2. Apply virtualization (e.g. `@tanstack/react-virtual`, chosen specifically for React-awareness — confirm compatibility with the current Next.js/React version in use) **only after hydration has fully settled**, not during initial mount. This is the part most likely to go wrong if rushed: if virtualization starts pruning nodes before React's hydration reconciliation has completed, it can produce hydration mismatches. Confirm the chosen approach explicitly supports "hydrate first, virtualize after" rather than assuming any virtualization library handles this correctly by default.
3. Preserve existing scroll/drag/wheel/arrow-key behavior on the timeline view specifically — per `page-weight-reduction-spec.md`'s standing constraint, do not change timeline scroll geometry or total strip width. Virtualization changes what's mounted in the DOM, not the scrollable area's dimensions.

**Do NOT** apply this fix by changing the placeholder text to something less obviously broken ("—" or a skeleton loader) — that satisfies nothing; the underlying content must actually be present in raw HTML, not just look less broken while remaining absent.

---

## Part 3 — Timeline pagination (separate but related; same component family)

The timeline's scope-sensing function (decade/tick markers) already scales for free — it's a CSS gradient per `page-weight-reduction-spec.md` Phase 1, not DOM, so it doesn't grow with artwork count. This section is about the *browsing* function only — individual artwork entries — which does cost real DOM nodes and will approach Lighthouse's ~1,500-node warning threshold as the archive grows past current size.

**Do NOT** implement a "load more" / click-to-reveal button. That reintroduces exactly the problem this spec exists to fix — content invisible to anything that doesn't click.

**Approach:** real, indexable date-range pages — e.g. `/timeline/2020-2026`, `/timeline/2010-2019` — each fully server-rendered per Part 2's rule, with genuine `rel="next"` / `rel="prev"` links between ranges, mirroring the pagination structure `/api/corpus/index` already uses. The overview/homepage keeps showing full-span tick markers (unaffected by this, already lightweight); clicking into a range drills into a properly bounded, fully server-rendered page.

**Decide range boundaries before building:** fixed year-blocks (predictable, stable URLs, but uneven density across the archive's history) vs. fixed item-count per page (even weight, but boundaries shift as new work is added, which weakens long-term URL stability — a concern for a project built around two-century archival stability). Recommend fixed year-blocks for that reason; confirm with artist before implementing if there's disagreement.

**Do NOT** implement Part 3 in the same deploy as Part 2. Ship and verify the SSR/virtualization fix first; pagination is a separate, lower-urgency change and mixing them makes it harder to isolate which change caused which effect if something regresses.

---

## Do NOT (full list)

- Do NOT change the placeholder text without fixing the underlying render-timing cause.
- Do NOT apply virtualization before hydration settles.
- Do NOT touch `/api/corpus/*`.
- Do NOT change timeline scroll geometry, total strip width, or drag/wheel/arrow behavior.
- Do NOT remove labelled year/decade tick markers.
- Do NOT implement a click-to-load-more pattern for Part 3.
- Do NOT ship Part 2 and Part 3 in the same deploy.
- Do NOT use a denylist `select` anywhere touched by this work.

---

## Verification checklist

- [ ] Part 1 diagnosis reported and confirmed before any fix implemented
- [ ] `curl -s https://bernardbolter.com/ | grep -c 'loading'` returns 0 (or only genuine loading states unrelated to titles)
- [ ] All 217 artwork titles present as real anchor text in raw HTML (view-source or `curl`, JavaScript disabled)
- [ ] No hydration warnings/errors in browser console after virtualization is applied
- [ ] Live DOM node count after scroll settles is small (windowed), confirmed via Lighthouse or DevTools after Part 2 ships
- [ ] Timeline scroll/drag/wheel/arrow behavior unchanged, artist-reviewed
- [ ] (Part 3, if/when built) Each date-range page fully server-renders its items with no placeholders
- [ ] (Part 3) `rel="next"`/`rel="prev"` present and correct between adjacent ranges
- [ ] (Part 3) Range boundary decision (year-block vs. fixed-count) confirmed with artist before implementation

---

*Homepage gateway fix · August 2026*
*Read alongside: page-weight-reduction-spec.md, sitemap-and-open-items-brief.md, corpus-traversal-patch-spec.md*
