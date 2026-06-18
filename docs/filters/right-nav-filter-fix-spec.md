# Right Navigation — Filter Source-of-Truth Fix & Stack Behavior

*Two related but independently verifiable changes to the right-side icon stack (Filter / Search / Play) and its expanding drawer. Read fully before starting either section.*

---

## Background

The right-nav filter drawer currently renders a hardcoded list of series filters, ported directly from the old WordPress/Sass site. This has drifted out of sync with the live `Series` collection in Payload — series have been added, removed, and renamed in the CMS without the filter component being updated to match. This spec fixes that at the root, then makes a set of UX adjustments to the same component area while we're in there.

**Do not treat this as a content update.** The fix is structural: the filter list must never again be a static array that a human has to remember to edit.

---

## Part 1 — Filter list must come from the Series collection, not a hardcoded array

### Current state (confirmed)

The filter drawer's series list was ported verbatim from the old site's hardcoded Sass/JSX implementation. It currently shows a fixed list that includes at least one retired series (Photography — now unpublished) and is missing several real, Published series records (Installations, Performances, Watercolors, Drawings, Breaking Down Art may or may not be present — **inspect the live component to find the actual current array**, do not assume which entries are present).

The design system doc (`design-system.md`, Filter/Sort Nav section) previously hardcoded "11 series" as a fixed count. That line has already been corrected in the doc to describe the live-query rule instead — treat that section of `design-system.md` as the authoritative target behavior.

### Required fix

1. **Locate the component(s)** rendering the Filter drawer's series list (likely something like `FilterDrawer`, `FilterNav`, or similar — inspect the actual file/directory structure, do not guess a path).
2. **Replace the hardcoded array** with a live query against the `Series` Payload collection, filtered to:
   - `parentSeries` is empty/none (root-level series only)
   - `status` is `published`
3. **Sort order**: pick one explicit, deterministic sort (e.g. alphabetical by title, or a defined `sortOrder` field if one exists on Series — inspect the collection schema). Do not rely on database insertion order.
4. **Sub-series exclusion**: Series records with a `parentSeries` set (currently: Gates of Perception, Mediums of War, Mediums of Perception — all children of A Colorful History) must **never** appear as top-level filter pills. They are not part of this filter UI at all; they exist purely as metadata on the artwork detail page.
5. **Each filter item must continue to use `getSeriesColor(slug)`** for its color dot — do not hardcode hex values per item, and do not break this existing pattern.
6. **The "Available" toggle** (non-series filter) is unaffected by this change — leave as is.

### What NOT to do

- ❌ Do not hardcode the series list, array, or count anywhere in this component
- ❌ Do not filter client-side from a full unfiltered series fetch if a scoped query (filtering by `parentSeries` and `status` server-side) is available — query for exactly what's needed
- ❌ Do not show sub-series as their own filter pills
- ❌ Do not invent colors for any series — if a series has no `getSeriesColor` entry, that's a bug to surface, not to silently patch around
- ❌ Do not change how `getSeriesColor(slug)` itself works — it already has entries for all currently-published root series, including the newly added `performances`, `drawings`, and `watercolors`

### Verification checklist

- [ ] Unpublish a series in Payload admin (e.g. Photography, already done) → confirm it disappears from the filter drawer with no code change
- [ ] Publish a currently-draft series → confirm it appears automatically
- [ ] Confirm Gates of Perception, Mediums of War, and Mediums of Perception do **not** appear as top-level filter pills
- [ ] Confirm all currently-published root series appear, including Performances, Installations, Watercolors, Drawings, Breaking Down Art
- [ ] Confirm each filter item's color dot matches the value in `getSeriesColor()` / `design-system.md`
- [ ] Confirm the "Available" toggle still works and is unaffected

---

## Part 2 — Icon stack reorder, mutual exclusivity, indicator color, and open/close animation

### 2a. Reorder the icon stack

**Current order (top to bottom):** Search → Play → Filter
**New order (top to bottom):** Filter → Search → Play

This is a pure visual/DOM reorder of the three fixed icon buttons. No change to each icon's own click behavior in this step — that's covered below.

### 2b. Mutual exclusivity: opening Filter must close and clear Search

**Current behavior (confirmed working, do not change):** Closing the Search drawer by its own close action already clears the search term. Keep this exactly as is.

**Current bug:** If the Search drawer is open (with or without an active term) and the user then clicks the Filter icon, Search currently remains open. The Filter drawer should fully cover the icon stack when open (this already works visually, per existing screenshots), but Search's own internal state is not being reset.

**Required fix:** Clicking the Filter icon must, as part of opening the Filter drawer:
1. Trigger Search's existing close-and-clear behavior (whatever internal handler already runs when the user manually closes Search) — do not write a second, parallel "clear search" implementation; call the same function/state reset that already exists for manual close.
2. Then proceed to open the Filter drawer as normal.

**The reverse is not required and should not be built:** opening Search while Filter is open does not need to close or clear any active filters. Filters persist in state regardless of drawer visibility — only the Filter drawer's own open/closed UI state changes, never the selected filter values themselves.

### 2c. Active-filter indicator color change

**Current behavior:** When the Filter drawer is closed and one or more filters are active, the Filter icon's face tints a warm red to indicate an active filter state.

**Required change:** Replace this tint with `#FBE3C4` (a light, desaturated warm amber). This must remain visually distinct from the icon's resting state (`$ui-face` / `#eee`) while keeping the icon glyph (`$ui-icon` / `#666`) clearly legible on top of it — the existing red tint was deliberately light for the same legibility reason; match that same lightness, just in the amber hue family rather than red.

Add this as a new design token in `design-system.md` rather than hardcoding the hex directly in the component — something like `$ui-filter-active` or similar, following the existing naming convention (check Section 2 of `design-system.md` for the right category prefix before naming it).

**Do not** use `$status-warning` (`#f0ad4e`) at full strength — it was tested and is too saturated/dark to keep the icon glyph readable. Do not use `$series-sold` (`#d4af37`) — that token is reserved for sold-artwork status elsewhere and should not be reused here to avoid a confusing double meaning.

### 2d. Open/close animation for Search and Filter drawers

Both the Search input field and the Filter drawer currently appear/disappear with no transition. Add a quick "snap" animation to both on open and close.

**Defaults to implement** (per `design-system.md`'s existing pattern of "best-guess until confirmed in browser" — these are expected to be fine-tuned after seeing them live, not treated as final):

- **Duration:** 180ms
- **Easing:** ease-out with a slight overshoot (a small bounce on entry — e.g. a cubic-bezier like `cubic-bezier(0.34, 1.56, 0.64, 1)` or equivalent; this should read distinctly snappier and bouncier than the existing `0.3s ease-in-out` used elsewhere on the site, e.g. close-button hover states — do not reuse that easing here)
- **Property:** combine a slide (`translateX`, consistent with the drawer's existing "slides in from right" behavior) with an opacity fade-in/out
- **Symmetry:** closing should use the same duration; easing on close can be a plain `ease-in` (no overshoot needed on the way out — overshoot reads naturally on entry, not exit)

Apply the same animation treatment to both the Search input's appearance and the Filter drawer's appearance, so the two feel consistent with each other.

### What NOT to do (Part 2)

- ❌ Do not make Search opening affect Filter's state in any way — only Filter-opens-closes-Search, never the reverse
- ❌ Do not write a new/separate "clear search" function — reuse the existing one
- ❌ Do not hardcode `#FBE3C4` directly in component styles — add it as a named token in `design-system.md` first, then reference the token
- ❌ Do not use `$status-warning` or `$series-sold` for the active-filter indicator
- ❌ Do not make the animation longer than necessary to read as a "snap" — this should feel fast, not like a deliberate slide-reveal
- ❌ Do not add overshoot/bounce to the closing animation, only opening

### Verification checklist (Part 2)

- [ ] Icon stack renders top-to-bottom as Filter, Search, Play
- [ ] With Search open and a term entered, clicking Filter closes Search, clears the term, and opens the Filter drawer
- [ ] With Filter open (filters selected), opening Search does not close the Filter drawer's selected state or clear any filters
- [ ] Closing Search manually still clears its term (unchanged, confirm no regression)
- [ ] Filter icon shows `#FBE3C4` tint when closed with active filters; icon glyph remains legible
- [ ] Opening Search and opening Filter both animate in with the snap/overshoot effect; closing both animates out without overshoot
- [ ] Animation duration feels fast (~180ms) and consistent between Search and Filter

---

## Cross-reference

Update `design-system.md` if the new `$ui-filter-active` (or equivalent) token name differs from what's proposed here — keep the doc as the source of truth, consistent with the project's existing rule: *"When something feels wrong in browser, update the design system first, then have agents re-implement."*
